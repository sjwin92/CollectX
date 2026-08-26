// Edge function: refresh-card-prices
// Refreshes `pokemon_cards.tcgplayer_prices` from the public Pokémon TCG API
// for cards we already mirror. This is what keeps "live" market prices on the
// marketplace / trade / collection surfaces current without re-importing every
// card field. Safe to run on a schedule (pg_cron) or by hand.
//
//   POST {}                      -> sweep every set in pokemon_sets
//   POST { setId: "sv3pt5" }     -> just that set
//   POST { limit: 20 }           -> only the first N sets (newest first)
//
// Public endpoint — it only ever writes the price column onto rows that
// already exist, so there is nothing to protect.

import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.0";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

const TCG_API_BASE = "https://api.pokemontcg.io/v2";
const PAGE_SIZE = 250; // /cards max
const MAX_PAGES = 8; // 2000 cards per set is well clear of the largest sets
const SET_DELAY_MS = 350; // be polite to the free API

type Json = Record<string, unknown> | unknown[] | string | number | boolean | null;

interface TcgCard {
  id: string;
  name?: string;
  tcgplayer?: { prices?: Json };
}

function json(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });
}

const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));

async function refreshSet(
  supabase: ReturnType<typeof createClient>,
  setId: string,
): Promise<{ setId: string; priced: number; seen: number }> {
  let priced = 0;
  let seen = 0;
  let page = 1;

  while (page <= MAX_PAGES) {
    const url = `${TCG_API_BASE}/cards?page=${page}&pageSize=${PAGE_SIZE}&select=id,name,tcgplayer&q=${encodeURIComponent(
      `set.id:${setId}`,
    )}`;
    const res = await fetch(url, { headers: { Accept: "application/json" } });
    if (!res.ok) throw new Error(`TCG /cards ${res.status}: ${(await res.text()).slice(0, 200)}`);

    const batch = ((await res.json()) as { data?: TcgCard[] }).data ?? [];
    seen += batch.length;

    const rows = batch
      .filter((c) => c.id && c.tcgplayer?.prices)
      .map((c) => ({
        id: c.id,
        name: c.name ?? "Unknown",
        set_id: setId,
        tcgplayer_prices: c.tcgplayer!.prices as Json,
      }));

    if (rows.length > 0) {
      for (let i = 0; i < rows.length; i += 100) {
        const { error } = await supabase
          .from("pokemon_cards")
          .upsert(rows.slice(i, i + 100), { onConflict: "id" });
        if (error) throw new Error(`upsert prices (${setId}): ${error.message}`);
      }
      priced += rows.length;
    }

    if (batch.length < PAGE_SIZE) break;
    page++;
  }

  return { setId, priced, seen };
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });
  if (req.method !== "POST") return json({ error: "Method not allowed" }, 405);

  let body: { setId?: unknown; limit?: unknown } = {};
  try {
    body = await req.json();
  } catch {
    /* empty body is fine */
  }
  const oneSet = typeof body.setId === "string" ? body.setId.trim() : "";
  const limit = Number.isFinite(Number(body.limit)) ? Math.max(1, Number(body.limit)) : 0;

  if (oneSet && !/^[a-z0-9._-]{1,32}$/i.test(oneSet)) {
    return json({ error: "setId must be ≤32 alphanumeric chars" }, 400);
  }

  const supabaseUrl = Deno.env.get("SUPABASE_URL");
  const serviceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");
  if (!supabaseUrl || !serviceKey) return json({ error: "Server misconfigured" }, 500);
  const supabase = createClient(supabaseUrl, serviceKey, { auth: { persistSession: false } });

  // Which sets are we sweeping?
  let setIds: string[];
  if (oneSet) {
    setIds = [oneSet];
  } else {
    let q = supabase
      .from("pokemon_sets")
      .select("id, release_date")
      .order("release_date", { ascending: false, nullsFirst: false });
    if (limit) q = q.limit(limit);
    const { data, error } = await q;
    if (error) return json({ error: `list sets: ${error.message}` }, 500);
    setIds = (data ?? []).map((r: { id: string }) => r.id);
  }

  const results: Array<{ setId: string; priced: number; seen: number }> = [];
  const errors: Array<{ setId: string; error: string }> = [];

  for (const setId of setIds) {
    try {
      results.push(await refreshSet(supabase, setId));
    } catch (err) {
      errors.push({ setId, error: err instanceof Error ? err.message : String(err) });
    }
    await sleep(SET_DELAY_MS);
  }

  const totalPriced = results.reduce((s, r) => s + r.priced, 0);
  return json({
    ok: true,
    sets: setIds.length,
    setsPriced: results.length,
    cardsPriced: totalPriced,
    errors,
  });
});
