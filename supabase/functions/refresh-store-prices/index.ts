// Edge function: refresh-store-prices
// The nightly repricer for CollectX for Business. For every store_inventory row
// that has a price rule, sets price_gbp = clamp(market × pct%, floor, ∞), and
// never below cost when the rule says so. Market price comes from
// pokemon_cards.tcgplayer_prices (USD → GBP), the same feed as the singles.
//
//   POST {}                 -> sweep every active store
//   POST { storeId: "..." } -> one store (also usable from the app as "reprice now")
//   POST { limit, offset }  -> paginate the sweep (150s edge wall-clock)
//
// Public POST — it only writes prices onto rows the store already owns.

import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.0";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

function json(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });
}

// ── USD → GBP (frankfurter.app, cached per cold start) ────────────────────
let cachedRate: number | null = null;
async function usdToGbpRate(): Promise<number> {
  if (cachedRate) return cachedRate;
  try {
    const r = await fetch("https://api.frankfurter.app/latest?from=USD&to=GBP");
    if (r.ok) {
      const d = await r.json();
      if (d?.rates?.GBP) return (cachedRate = d.rates.GBP);
    }
  } catch {
    // fall through
  }
  return (cachedRate = 0.79);
}

const VARIANT_ORDER = [
  "holofoil", "normal", "reverseHolofoil", "1stEditionHolofoil", "1stEdition",
  "unlimitedHolofoil", "unlimited",
];
function marketUsd(prices: unknown): number {
  const p = prices as Record<string, { market?: number; mid?: number }> | null | undefined;
  if (!p || typeof p !== "object") return 0;
  for (const k of VARIANT_ORDER) {
    const v = p[k];
    if (v?.market && v.market > 0) return v.market;
    if (v?.mid && v.mid > 0) return v.mid;
  }
  for (const v of Object.values(p)) {
    if (v?.market && v.market > 0) return v.market;
    if (v?.mid && v.mid > 0) return v.mid;
  }
  return 0;
}

interface Rule {
  pct_of_market: number;
  floor_gbp: number;
  never_below_cost: boolean;
}
interface Row {
  id: string;
  card_id: string;
  cost_gbp: number | null;
  price_rule_id: string | null;
}

async function repriceStore(
  supabase: ReturnType<typeof createClient>,
  storeId: string,
  rate: number,
): Promise<{ storeId: string; repriced: number; skipped: number }> {
  const { data: rules } = await supabase
    .from("store_price_rules")
    .select("id, pct_of_market, floor_gbp, never_below_cost, is_default")
    .eq("store_id", storeId);
  const ruleById = new Map<string, Rule>();
  let defaultRuleId: string | null = null;
  for (const r of rules ?? []) {
    ruleById.set(r.id, r as Rule);
    if (r.is_default) defaultRuleId = r.id;
  }
  if (!defaultRuleId && (rules?.length ?? 0) > 0) defaultRuleId = rules![0].id;

  // Reprice every SKU: rows with no rule (added before a rule existed, or via
  // an import that didn't set one) fall back to the store's default rule.
  const { data: rows } = await supabase
    .from("store_inventory")
    .select("id, card_id, cost_gbp, price_rule_id")
    .eq("store_id", storeId);

  const inv = (rows ?? []) as Row[];
  if (inv.length === 0) return { storeId, repriced: 0, skipped: 0 };

  // Back-fill the rule id on unattributed rows so future runs (and the UI) see it.
  if (defaultRuleId) {
    const orphans = inv.filter((r) => !r.price_rule_id || !ruleById.has(r.price_rule_id));
    if (orphans.length) {
      await supabase
        .from("store_inventory")
        .update({ price_rule_id: defaultRuleId })
        .in("id", orphans.map((r) => r.id));
      for (const r of orphans) r.price_rule_id = defaultRuleId;
    }
  }

  const cardIds = Array.from(new Set(inv.map((r) => r.card_id)));
  const priceByCard = new Map<string, number>();
  for (let i = 0; i < cardIds.length; i += 400) {
    const { data: cards } = await supabase
      .from("pokemon_cards")
      .select("id, tcgplayer_prices")
      .in("id", cardIds.slice(i, i + 400));
    for (const c of cards ?? []) {
      const usd = marketUsd((c as { tcgplayer_prices?: unknown }).tcgplayer_prices);
      if (usd > 0) priceByCard.set(c.id, Math.round(usd * rate * 100) / 100);
    }
  }

  const updates: Array<{ id: string; price_gbp: number }> = [];
  let skipped = 0;
  for (const r of inv) {
    const rule = r.price_rule_id ? ruleById.get(r.price_rule_id) : undefined;
    const market = priceByCard.get(r.card_id);
    if (!rule || !market || market <= 0) {
      skipped++;
      continue;
    }
    let price = Math.max((market * rule.pct_of_market) / 100, Number(rule.floor_gbp));
    if (rule.never_below_cost && r.cost_gbp != null) price = Math.max(price, Number(r.cost_gbp));
    updates.push({ id: r.id, price_gbp: Math.round(price * 100) / 100 });
  }

  for (let i = 0; i < updates.length; i += 100) {
    const chunk = updates.slice(i, i + 100);
    await Promise.all(
      chunk.map((u) =>
        supabase.from("store_inventory").update({ price_gbp: u.price_gbp }).eq("id", u.id),
      ),
    );
  }

  return { storeId, repriced: updates.length, skipped };
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });
  if (req.method !== "POST") return json({ error: "Method not allowed" }, 405);

  let body: { storeId?: unknown; limit?: unknown; offset?: unknown } = {};
  try {
    body = await req.json();
  } catch {
    /* empty body fine */
  }
  const oneStore = typeof body.storeId === "string" ? body.storeId : "";
  const limit = Number.isFinite(Number(body.limit)) ? Math.max(1, Number(body.limit)) : 0;
  const offset = Number.isFinite(Number(body.offset)) ? Math.max(0, Number(body.offset)) : 0;

  const supabaseUrl = Deno.env.get("SUPABASE_URL");
  const serviceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");
  if (!supabaseUrl || !serviceKey) return json({ error: "Server misconfigured" }, 500);
  const supabase = createClient(supabaseUrl, serviceKey, { auth: { persistSession: false } });

  let storeIds: string[];
  if (oneStore) {
    storeIds = [oneStore];
  } else {
    let q = supabase.from("store_profiles").select("user_id").eq("status", "active");
    if (limit || offset) q = q.range(offset, offset + (limit || 500) - 1);
    const { data, error } = await q;
    if (error) return json({ error: `list stores: ${error.message}` }, 500);
    storeIds = (data ?? []).map((r: { user_id: string }) => r.user_id);
  }

  const rate = await usdToGbpRate();
  const results: Array<{ storeId: string; repriced: number; skipped: number }> = [];
  const errors: Array<{ storeId: string; error: string }> = [];
  for (const id of storeIds) {
    try {
      results.push(await repriceStore(supabase, id, rate));
    } catch (e) {
      errors.push({ storeId: id, error: e instanceof Error ? e.message : String(e) });
    }
  }

  return json({
    ok: true,
    rate,
    stores: storeIds.length,
    skusRepriced: results.reduce((s, r) => s + r.repriced, 0),
    skusSkipped: results.reduce((s, r) => s + r.skipped, 0),
    errors,
  });
});
