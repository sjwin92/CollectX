// Edge function: refresh-sealed-products
// Mirrors sealed Pokémon products (Booster Boxes, ETBs, Bundles, Blisters,
// Tins, Cases, Decks) + their TCGplayer market prices from tcgcsv.com — a
// free, no-auth static-JSON mirror of TCGplayer's catalogue. This replaces the
// never-configured ebay-integration function for sealed data.
//
//   POST {}                        -> sweep every Pokémon group
//   POST { groupId: 24688 }        -> just that TCGCSV group
//   POST { setId: "me5" }          -> the group matched to that pokemon_sets row
//   POST { limit: 20 }             -> the 20 newest groups
//   POST { limit: 20, offset: 20 } -> the next 20 (paginate; a full sweep can
//                                     exceed the 150s edge-function wall-clock)
//
// Public POST — it only writes non-sensitive catalogue data.

import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.0";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

const TCGCSV_BASE = "https://tcgcsv.com/tcgplayer";
const POKEMON_CATEGORY = 3;
const GROUP_DELAY_MS = 150;
// tcgcsv.com is CloudFront-fronted and 401s requests with no User-Agent or a
// Deno-default one — send an explicit identifying UA.
const UA = "CollectX/1.0 (+https://coll-x.lovable.app)";

type Json = Record<string, unknown> | unknown[] | string | number | boolean | null;

interface TcgGroup {
  groupId: number;
  name: string;
  abbreviation?: string;
  publishedOn?: string;
}

interface TcgProduct {
  productId: number;
  name: string;
  imageUrl?: string;
  url?: string;
  extendedData?: Array<{ name: string; value?: string }>;
}

interface TcgPrice {
  productId: number;
  marketPrice: number | null;
  lowPrice: number | null;
  subTypeName?: string;
}

function json(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });
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
    } catch (e) {
      lastErr = e;
    }
    await sleep(400 * (i + 1));
  }
  throw lastErr instanceof Error ? lastErr : new Error(String(lastErr));
}

const norm = (s: string) =>
  s.toLowerCase().replace(/[^a-z0-9]+/g, " ").replace(/\bpokemon\b/g, "").trim();

/** A TCGCSV product is a single card iff it carries both Number and Rarity. */
function isSingle(p: TcgProduct): boolean {
  const keys = new Set((p.extendedData ?? []).map((e) => e.name));
  return keys.has("Number") && keys.has("Rarity");
}

/** Digital redemption codes for Pokémon TCG Live — worthless, excluded. */
function isCodeCard(name: string): boolean {
  return /\bcode card\b/i.test(name) || /online code/i.test(name);
}

function classify(name: string): string {
  const n = name.toLowerCase();
  if (n.includes("case")) return "case";
  if (n.includes("elite trainer box")) return "etb";
  if (n.includes("booster box")) return "box";
  if (n.includes("booster bundle") || n.includes("bundle")) return "bundle";
  if (n.includes("blister")) return "blister-pack";
  if (n.includes("tin")) return "tin";
  if (n.includes("build") || n.includes("battle deck") || /\bdeck\b/.test(n)) return "deck";
  if (n.includes("booster pack") || n.includes("booster packs")) return "booster-pack";
  if (n.includes("collection") || n.includes("box")) return "box";
  return "other";
}

async function refreshGroup(
  supabase: ReturnType<typeof createClient>,
  group: TcgGroup,
  setId: string | null,
): Promise<{ groupId: number; products: number }> {
  const [prodResp, priceResp] = await Promise.all([
    getJson<{ results: TcgProduct[] }>(`${TCGCSV_BASE}/${POKEMON_CATEGORY}/${group.groupId}/products`),
    getJson<{ results: TcgPrice[] }>(`${TCGCSV_BASE}/${POKEMON_CATEGORY}/${group.groupId}/prices`),
  ]);

  // Best price per product — prefer a "Normal" sub-type, else the first row.
  const priceFor = new Map<number, TcgPrice>();
  for (const pr of priceResp.results ?? []) {
    const cur = priceFor.get(pr.productId);
    if (!cur || pr.subTypeName === "Normal") priceFor.set(pr.productId, pr);
  }

  const released = group.publishedOn ? group.publishedOn.slice(0, 10) : null;
  const rows = (prodResp.results ?? [])
    .filter((p) => !isSingle(p) && !isCodeCard(p.name))
    .map((p) => {
      const pr = priceFor.get(p.productId);
      return {
        id: p.productId,
        set_id: setId,
        group_id: group.groupId,
        group_name: group.name,
        name: p.name,
        product_type: classify(p.name),
        image_url: p.imageUrl ?? null,
        tcgplayer_url: p.url ?? null,
        market_price_usd: pr?.marketPrice ?? null,
        low_price_usd: pr?.lowPrice ?? null,
        released_on: released,
        updated_at: new Date().toISOString(),
      };
    });

  if (rows.length > 0) {
    for (let i = 0; i < rows.length; i += 100) {
      const { error } = await supabase
        .from("sealed_products")
        .upsert(rows.slice(i, i + 100), { onConflict: "id" });
      if (error) throw new Error(`upsert sealed_products (${group.groupId}): ${error.message}`);
    }
  }

  await supabase.from("sealed_product_imports").upsert({
    group_id: group.groupId,
    set_id: setId,
    last_imported_at: new Date().toISOString(),
    product_count: rows.length,
    last_error: null,
  });

  return { groupId: group.groupId, products: rows.length };
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });
  if (req.method !== "POST") return json({ error: "Method not allowed" }, 405);

  let body: { groupId?: unknown; setId?: unknown; limit?: unknown; offset?: unknown } = {};
  try {
    body = await req.json();
  } catch {
    /* empty body is fine */
  }
  const oneGroup = Number.isFinite(Number(body.groupId)) ? Number(body.groupId) : 0;
  const oneSet = typeof body.setId === "string" ? body.setId.trim() : "";
  const limit = Number.isFinite(Number(body.limit)) ? Math.max(1, Number(body.limit)) : 0;
  const offset = Number.isFinite(Number(body.offset)) ? Math.max(0, Number(body.offset)) : 0;

  const supabaseUrl = Deno.env.get("SUPABASE_URL");
  const serviceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");
  if (!supabaseUrl || !serviceKey) return json({ error: "Server misconfigured" }, 500);
  const supabase = createClient(supabaseUrl, serviceKey, { auth: { persistSession: false } });

  // Our sets, for matching TCGCSV groups -> pokemon_sets.id.
  const { data: sets, error: setsErr } = await supabase
    .from("pokemon_sets")
    .select("id, name, ptcgo_code");
  if (setsErr) return json({ error: `list sets: ${setsErr.message}` }, 500);

  const byCode = new Map<string, string>();
  const byName = new Map<string, string>();
  for (const s of (sets ?? []) as Array<{ id: string; name: string; ptcgo_code: string | null }>) {
    if (s.ptcgo_code) byCode.set(s.ptcgo_code.toUpperCase(), s.id);
    if (s.name) byName.set(norm(s.name), s.id);
  }
  const matchSet = (g: TcgGroup): string | null => {
    if (g.abbreviation && byCode.has(g.abbreviation.toUpperCase())) {
      return byCode.get(g.abbreviation.toUpperCase())!;
    }
    // group names look like "ME05: Pitch Black" — try the part after the colon too
    const candidates = [g.name, g.name.split(":").pop() ?? g.name];
    for (const c of candidates) {
      const key = norm(c);
      if (byName.has(key)) return byName.get(key)!;
    }
    return null;
  };

  let allGroups: TcgGroup[];
  try {
    const resp = await getJson<{ results: TcgGroup[] }>(`${TCGCSV_BASE}/${POKEMON_CATEGORY}/groups`);
    allGroups = (resp.results ?? []).sort((a, b) =>
      (b.publishedOn ?? "").localeCompare(a.publishedOn ?? ""),
    );
  } catch (e) {
    return json({ error: `list groups: ${e instanceof Error ? e.message : String(e)}` }, 502);
  }

  let groups: TcgGroup[];
  if (oneGroup) {
    groups = allGroups.filter((g) => g.groupId === oneGroup);
  } else if (oneSet) {
    groups = allGroups.filter((g) => matchSet(g) === oneSet);
  } else if (limit || offset) {
    groups = allGroups.slice(offset, offset + (limit || allGroups.length));
  } else {
    groups = allGroups;
  }

  const results: Array<{ groupId: number; products: number }> = [];
  const errors: Array<{ groupId: number; error: string }> = [];
  for (const g of groups) {
    try {
      results.push(await refreshGroup(supabase, g, matchSet(g)));
    } catch (err) {
      const msg = err instanceof Error ? err.message : String(err);
      errors.push({ groupId: g.groupId, error: msg });
      await supabase.from("sealed_product_imports").upsert({
        group_id: g.groupId,
        last_imported_at: new Date(0).toISOString(),
        last_error: msg,
      });
    }
    await sleep(GROUP_DELAY_MS);
  }

  return json({
    ok: true,
    offset,
    limit: limit || null,
    groups: groups.length,
    groupsImported: results.length,
    productsUpserted: results.reduce((s, r) => s + r.products, 0),
    errors,
  });
});
