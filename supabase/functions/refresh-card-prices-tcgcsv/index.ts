// Edge function: refresh-card-prices-tcgcsv
//
// Fills the ~1,000 pokemon_cards rows that have NULL tcgplayer_prices because
// pokemontcg.io doesn't carry the set (the Mega Evolution era me2–me5, some
// McDonald's / trainer-kit promos, older e-Card gaps). tcgcsv.com — the same
// free TCGplayer catalogue mirror the sealed-products refresher already uses —
// does have singles pricing for these.
//
//   POST {}                        -> every TCGCSV group matched to a set
//   POST { setId: "me5" }          -> just that set
//   POST { limit: 8, offset: 0 }   -> paginate (150s edge wall-clock)
//
// Only writes rows where tcgplayer_prices IS NULL — never overwrites the
// native pokemontcg.io data. verify_jwt is disabled (config.toml); still safe
// to call with the anon key.

import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.0";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

const TCGCSV_BASE = "https://tcgcsv.com/tcgplayer";
const POKEMON_CATEGORY = 3;
const GROUP_DELAY_MS = 150;
const UA = "CollectX/1.0 (+https://coll-x.lovable.app)";

interface TcgGroup { groupId: number; name: string; abbreviation?: string; publishedOn?: string }
interface TcgProduct { productId: number; name: string; extendedData?: Array<{ name: string; value?: string }> }
interface TcgPrice {
  productId: number; subTypeName?: string;
  marketPrice: number | null; lowPrice: number | null; midPrice: number | null;
  highPrice: number | null; directLowPrice: number | null;
}

function json(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), { status, headers: { ...corsHeaders, "Content-Type": "application/json" } });
}
const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));

async function getJson<T>(url: string, tries = 3): Promise<T> {
  let lastErr: unknown;
  for (let i = 0; i < tries; i++) {
    try {
      const res = await fetch(url, { headers: { Accept: "application/json", "User-Agent": UA } });
      if (res.ok) return (await res.json()) as T;
      lastErr = new Error(`${res.status} ${res.statusText}`);
      await res.body?.cancel().catch(() => undefined);
    } catch (e) { lastErr = e; }
    await sleep(400 * (i + 1));
  }
  throw lastErr instanceof Error ? lastErr : new Error(String(lastErr));
}

const norm = (s: string) => s.toLowerCase().replace(/[^a-z0-9]+/g, " ").replace(/\bpokemon\b/g, "").trim();
const isSingle = (p: TcgProduct) => {
  const keys = new Set((p.extendedData ?? []).map((e) => e.name));
  return keys.has("Number") && keys.has("Rarity");
};
const ext = (p: TcgProduct, name: string) => (p.extendedData ?? []).find((e) => e.name === name)?.value ?? "";
// TCGCSV numbers look like "036/084"; pokemon_cards stores "36". Take the part
// before the slash and drop leading zeros.
const numKey = (n: string) => n.trim().toLowerCase().split("/")[0].replace(/^0+(?=\w)/, "");

// TCGplayer sub-type name -> pokemontcg.io tcgplayer.prices variant key
function variantKey(subType?: string): string {
  switch ((subType ?? "Normal").toLowerCase()) {
    case "holofoil": return "holofoil";
    case "reverse holofoil": return "reverseHolofoil";
    case "1st edition holofoil": return "1stEditionHolofoil";
    case "1st edition":
    case "1st edition normal": return "1stEdition";
    case "unlimited holofoil": return "unlimitedHolofoil";
    case "unlimited": return "unlimited";
    default: return "normal";
  }
}

function pricesJson(rows: TcgPrice[]): Record<string, unknown> | null {
  const out: Record<string, unknown> = {};
  for (const r of rows) {
    if (r.marketPrice == null && r.midPrice == null && r.lowPrice == null) continue;
    out[variantKey(r.subTypeName)] = {
      low: r.lowPrice, mid: r.midPrice, high: r.highPrice,
      market: r.marketPrice, directLow: r.directLowPrice,
    };
  }
  return Object.keys(out).length ? out : null;
}

async function refreshGroup(
  supabase: ReturnType<typeof createClient>,
  group: TcgGroup,
  setId: string,
): Promise<{ setId: string; matched: number; priced: number }> {
  const [prodResp, priceResp] = await Promise.all([
    getJson<{ results: TcgProduct[] }>(`${TCGCSV_BASE}/${POKEMON_CATEGORY}/${group.groupId}/products`),
    getJson<{ results: TcgPrice[] }>(`${TCGCSV_BASE}/${POKEMON_CATEGORY}/${group.groupId}/prices`),
  ]);

  const pricesByProduct = new Map<number, TcgPrice[]>();
  for (const pr of priceResp.results ?? []) {
    if (!pricesByProduct.has(pr.productId)) pricesByProduct.set(pr.productId, []);
    pricesByProduct.get(pr.productId)!.push(pr);
  }

  // Our unpriced cards for this set.
  const { data: cards, error: cardsErr } = await supabase
    .from("pokemon_cards")
    .select("id, number")
    .eq("set_id", setId)
    .is("tcgplayer_prices", null);
  if (cardsErr) throw new Error(`list cards ${setId}: ${cardsErr.message}`);
  if (!cards || cards.length === 0) return { setId, matched: 0, priced: 0 };

  const cardByNumber = new Map<string, string>();
  for (const c of cards as Array<{ id: string; number: string | null }>) {
    if (c.number) cardByNumber.set(numKey(c.number), c.id);
  }

  const updates: Array<{ id: string; prices: Record<string, unknown> }> = [];
  for (const p of prodResp.results ?? []) {
    if (!isSingle(p)) continue;
    const cardId = cardByNumber.get(numKey(ext(p, "Number")));
    if (!cardId) continue;
    const pj = pricesJson(pricesByProduct.get(p.productId) ?? []);
    if (pj) updates.push({ id: cardId, prices: pj });
  }

  let priced = 0;
  for (let i = 0; i < updates.length; i += 25) {
    const chunk = updates.slice(i, i + 25);
    const res = await Promise.all(
      chunk.map((u) =>
        supabase
          .from("pokemon_cards")
          .update({ tcgplayer_prices: u.prices, updated_at: new Date().toISOString() })
          .eq("id", u.id)
          .is("tcgplayer_prices", null),
      ),
    );
    priced += res.filter((r) => !r.error).length;
  }

  return { setId, matched: updates.length, priced };
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });
  if (req.method !== "POST") return json({ error: "Method not allowed" }, 405);

  let body: { setId?: unknown; limit?: unknown; offset?: unknown } = {};
  try { body = await req.json(); } catch { /* empty body ok */ }
  const oneSet = typeof body.setId === "string" ? body.setId.trim() : "";
  const limit = Number.isFinite(Number(body.limit)) ? Math.max(1, Number(body.limit)) : 0;
  const offset = Number.isFinite(Number(body.offset)) ? Math.max(0, Number(body.offset)) : 0;

  const supabaseUrl = Deno.env.get("SUPABASE_URL");
  const serviceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");
  if (!supabaseUrl || !serviceKey) return json({ error: "Server misconfigured" }, 500);
  const supabase = createClient(supabaseUrl, serviceKey, { auth: { persistSession: false } });

  // sets that still have unpriced cards
  const { data: gapRows, error: gapErr } = await supabase
    .from("pokemon_cards")
    .select("set_id")
    .is("tcgplayer_prices", null)
    .not("set_id", "is", null);
  if (gapErr) return json({ error: `gap scan: ${gapErr.message}` }, 500);
  const gapSets = new Set((gapRows ?? []).map((r: { set_id: string }) => r.set_id));

  const { data: sets, error: setsErr } = await supabase.from("pokemon_sets").select("id, name, ptcgo_code");
  if (setsErr) return json({ error: `list sets: ${setsErr.message}` }, 500);
  const byCode = new Map<string, string>();
  const byName = new Map<string, string>();
  for (const s of (sets ?? []) as Array<{ id: string; name: string; ptcgo_code: string | null }>) {
    if (s.ptcgo_code) byCode.set(s.ptcgo_code.toUpperCase(), s.id);
    if (s.name) byName.set(norm(s.name), s.id);
  }
  const matchSet = (g: TcgGroup): string | null => {
    if (g.abbreviation && byCode.has(g.abbreviation.toUpperCase())) return byCode.get(g.abbreviation.toUpperCase())!;
    for (const c of [g.name, g.name.split(":").pop() ?? g.name]) {
      const key = norm(c);
      if (byName.has(key)) return byName.get(key)!;
    }
    return null;
  };

  let allGroups: TcgGroup[];
  try {
    const resp = await getJson<{ results: TcgGroup[] }>(`${TCGCSV_BASE}/${POKEMON_CATEGORY}/groups`);
    allGroups = (resp.results ?? []).sort((a, b) => (b.publishedOn ?? "").localeCompare(a.publishedOn ?? ""));
  } catch (e) {
    return json({ error: `list groups: ${e instanceof Error ? e.message : String(e)}` }, 502);
  }

  // groups whose matched set still has a price gap
  let targets = allGroups
    .map((g) => ({ g, setId: matchSet(g) }))
    .filter((t): t is { g: TcgGroup; setId: string } => !!t.setId && gapSets.has(t.setId));
  if (oneSet) targets = targets.filter((t) => t.setId === oneSet);
  if (limit || offset) targets = targets.slice(offset, offset + (limit || targets.length));

  const results: Array<{ setId: string; matched: number; priced: number }> = [];
  const errors: Array<{ setId: string; error: string }> = [];
  for (const { g, setId } of targets) {
    try {
      results.push(await refreshGroup(supabase, g, setId));
    } catch (err) {
      errors.push({ setId, error: err instanceof Error ? err.message : String(err) });
    }
    await sleep(GROUP_DELAY_MS);
  }

  return json({
    ok: true,
    offset,
    limit: limit || null,
    gapSets: gapSets.size,
    groupsTried: targets.length,
    cardsPriced: results.reduce((s, r) => s + r.priced, 0),
    perSet: results,
    errors,
  });
});
