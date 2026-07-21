// Edge function: seed-database
//
// Bulk-imports the full Pokémon TCG dataset into the local Supabase mirror.
// Designed to be called in batches from the frontend so it never exceeds the
// 60-second edge-function timeout.
//
// Two phases:
//   POST { "phase": "sets" }
//     — Fetches all set metadata from the TCG API and upserts into pokemon_sets
//       + set_images. Returns { done: true, count: N }.
//
//   POST { "phase": "cards", "offset": 0, "limit": 10, "force": false }
//     — Reads set IDs from pokemon_sets (ordered by release_date DESC so newest
//       sets are seeded first), imports cards for sets[offset..offset+limit-1],
//       and returns { results, nextOffset, total, done }.
//     — Skips sets whose import record is fresher than 24 h (override with force).
//     — Keep limit ≤ 10 to stay within the 60s timeout comfortably.
//
// Admin-only endpoint. The Supabase gateway verifies the caller's JWT and the
// function independently checks public.user_roles before using service-role
// writes.

import { createClient } from "npm:@supabase/supabase-js@2.103.3";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

const TCG_API_BASE = "https://api.pokemontcg.io/v2";
const FRESHNESS_MS = 24 * 60 * 60 * 1000;
const PAGE_SIZE = 50;
const MAX_PAGES = 20;

type Json = Record<string, unknown> | unknown[] | string | number | boolean | null;

interface TcgSet {
  id: string;
  name: string;
  series?: string;
  printedTotal?: number;
  total?: number;
  ptcgoCode?: string;
  releaseDate?: string;
  legalities?: Json;
  images?: { logo?: string; symbol?: string };
}

interface TcgCard {
  id: string;
  name: string;
  supertype?: string;
  subtypes?: string[];
  hp?: string;
  types?: string[];
  set?: { id?: string; name?: string };
  number?: string;
  artist?: string;
  rarity?: string;
  flavorText?: string;
  images?: { small?: string; large?: string };
  tcgplayer?: { prices?: Json };
  attacks?: Json;
  abilities?: Json;
  weaknesses?: Json;
  resistances?: Json;
  evolvesFrom?: string;
  regulationMark?: string;
}

function json(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });
}

async function fetchJson<T>(url: string): Promise<T> {
  const apiKey = Deno.env.get("POKEMON_TCG_API_KEY");
  const headers: Record<string, string> = { Accept: "application/json" };
  if (apiKey) headers["X-Api-Key"] = apiKey;
  const res = await fetch(url, { headers });
  if (!res.ok) throw new Error(`TCG API ${res.status} — ${url}: ${await res.text()}`);
  return res.json() as Promise<T>;
}

// ─── Phase: sets ──────────────────────────────────────────────────────────────

async function importSets(supabase: ReturnType<typeof createClient>, _force: boolean) {
  // Set metadata is a small upsert and does not need a fake set_imports row.
  // Individual card-set freshness remains tracked by each real set ID.

  let all: TcgSet[] = [];
  let page = 1;
  while (page <= 10) {
    const body = await fetchJson<{ data: TcgSet[] }>(
      `${TCG_API_BASE}/sets?page=${page}&pageSize=250`,
    );
    const batch = body.data ?? [];
    all = all.concat(batch);
    if (batch.length < 250) break;
    page++;
  }

  // Upsert all sets in 100-row chunks
  for (let i = 0; i < all.length; i += 100) {
    const rows = all.slice(i, i + 100).map((s) => ({
      id: s.id,
      name: s.name,
      series: s.series,
      printed_total: s.printedTotal,
      total: s.total,
      ptcgo_code: s.ptcgoCode,
      release_date: s.releaseDate,
      logo_url: s.images?.logo,
      symbol_url: s.images?.symbol,
      legalities: s.legalities,
      images: s.images,
    }));
    const { error } = await supabase.from("pokemon_sets").upsert(rows);
    if (error) throw new Error(`upsert sets: ${error.message}`);
  }

  // Upsert logo + symbol image records
  const imageRows = all.flatMap((s) => {
    const rows = [];
    if (s.images?.logo) rows.push({ set_id: s.id, image_url: s.images.logo, image_type: "logo", source: "pokemon_tcg_api", is_working: true, last_checked: new Date().toISOString() });
    if (s.images?.symbol) rows.push({ set_id: s.id, image_url: s.images.symbol, image_type: "symbol", source: "pokemon_tcg_api", is_working: true, last_checked: new Date().toISOString() });
    return rows;
  });
  for (let i = 0; i < imageRows.length; i += 100) {
    const { error } = await supabase
      .from("set_images")
      .upsert(imageRows.slice(i, i + 100), { onConflict: "set_id,image_type,image_url" });
    if (error) throw new Error(`upsert set images: ${error.message}`);
  }

  return { skipped: false, count: all.length };
}

// ─── Phase: cards (one set) ───────────────────────────────────────────────────

async function importCardsForSet(
  supabase: ReturnType<typeof createClient>,
  setId: string,
  setName: string,
  force: boolean,
): Promise<{ skipped?: boolean; cardCount?: number; error?: string }> {
  if (!force) {
    const { data: existing } = await supabase
      .from("set_imports")
      .select("last_imported_at")
      .eq("set_id", setId)
      .maybeSingle();
    if (existing?.last_imported_at) {
      const age = Date.now() - new Date(existing.last_imported_at).getTime();
      if (age < FRESHNESS_MS) return { skipped: true };
    }
  }

  try {
    let allCards: TcgCard[] = [];
    let page = 1;
    while (page <= MAX_PAGES) {
      const url = `${TCG_API_BASE}/cards?page=${page}&pageSize=${PAGE_SIZE}&q=${encodeURIComponent(`set.id:${setId}`)}`;
      const resp = await fetchJson<{ data: TcgCard[] }>(url);
      const batch = resp.data ?? [];
      allCards = allCards.concat(batch);
      if (batch.length < PAGE_SIZE) break;
      page++;
    }

    if (allCards.length > 0) {
      const rows = allCards.map((c) => ({
        id: c.id,
        name: c.name ?? "Unknown",
        supertype: c.supertype,
        subtypes: c.subtypes,
        hp: c.hp,
        types: c.types,
        set_id: c.set?.id ?? setId,
        set_name: c.set?.name ?? setName,
        number: c.number,
        artist: c.artist,
        rarity: c.rarity,
        flavor_text: c.flavorText,
        images: c.images as Json,
        tcgplayer_prices: c.tcgplayer?.prices as Json,
        small_image_url: c.images?.small,
        large_image_url: c.images?.large,
      }));
      for (let i = 0; i < rows.length; i += 100) {
        const { error } = await supabase.from("pokemon_cards").upsert(rows.slice(i, i + 100));
        if (error) throw new Error(`upsert cards: ${error.message}`);
      }
    }

    const { error: importError } = await supabase.from("set_imports").upsert({
      set_id: setId,
      last_imported_at: new Date().toISOString(),
      card_count: allCards.length,
      last_error: null,
    });
    if (importError) throw new Error(`record import: ${importError.message}`);

    return { cardCount: allCards.length };
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    await supabase.from("set_imports").upsert({
      set_id: setId,
      last_imported_at: new Date(0).toISOString(),
      last_error: message,
    });
    return { error: message };
  }
}

// ─── Main handler ─────────────────────────────────────────────────────────────

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });
  if (req.method !== "POST") return json({ error: "Method not allowed" }, 405);

  const supabaseUrl = Deno.env.get("SUPABASE_URL");
  const readDefaultKey = (name: string) => {
    const value = Deno.env.get(name);
    if (!value) return undefined;
    try {
      return JSON.parse(value)?.default as string | undefined;
    } catch {
      return undefined;
    }
  };
  const serviceKey =
    readDefaultKey("SUPABASE_SECRET_KEYS") ?? Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");
  const publishableKey =
    readDefaultKey("SUPABASE_PUBLISHABLE_KEYS") ?? Deno.env.get("SUPABASE_ANON_KEY");
  if (!supabaseUrl || !serviceKey || !publishableKey) {
    return json({ error: "Server misconfigured" }, 500);
  }

  // --- Admin auth gate ---
  const authHeader = req.headers.get("Authorization");
  if (!authHeader) return json({ error: "Unauthorized" }, 401);
  const authClient = createClient(supabaseUrl, publishableKey);
  const token = authHeader.replace("Bearer ", "");
  const { data: userData, error: userErr } = await authClient.auth.getUser(token);
  if (userErr || !userData?.user) return json({ error: "Unauthorized" }, 401);

  const supabase = createClient(supabaseUrl, serviceKey, { auth: { persistSession: false } });
  const { data: roleRow } = await supabase
    .from("user_roles")
    .select("role")
    .eq("user_id", userData.user.id)
    .eq("role", "admin")
    .maybeSingle();
  if (!roleRow) return json({ error: "Forbidden — admin only" }, 403);


  let body: { phase?: string; offset?: number; limit?: number; force?: boolean } = {};
  try { body = await req.json(); } catch { /* empty body ok */ }

  const phase = body.phase ?? "cards";
  const offset = typeof body.offset === "number" ? body.offset : 0;
  const limit = Math.min(Math.max(typeof body.limit === "number" ? body.limit : 5, 1), 5);
  const force = body.force === true;

  // ── Phase: sets ──
  if (phase === "sets") {
    try {
      const result = await importSets(supabase, force);
      return json({ phase: "sets", ...result });
    } catch (err) {
      return json({ error: err instanceof Error ? err.message : String(err) }, 500);
    }
  }

  // ── Phase: cards ──
  if (phase === "cards") {
    // Read set IDs from our DB ordered newest-first so the most relevant sets
    // are seeded first. pokemon_sets must be populated (run phase=sets first).
    const { data: sets, error: setsError } = await supabase
      .from("pokemon_sets")
      .select("id, name")
      .order("release_date", { ascending: false })
      .range(offset, offset + limit - 1);

    if (setsError) return json({ error: setsError.message }, 500);
    if (!sets || sets.length === 0) return json({ phase: "cards", done: true, total: 0, nextOffset: offset });

    const { count: totalCount } = await supabase
      .from("pokemon_sets")
      .select("id", { count: "exact", head: true });

    const total = totalCount ?? 0;
    const results: { setId: string; setName: string; skipped?: boolean; cardCount?: number; error?: string }[] = [];

    for (const set of sets) {
      const result = await importCardsForSet(supabase, set.id, set.name, force);
      results.push({ setId: set.id, setName: set.name, ...result });
    }

    const nextOffset = offset + limit;
    const done = nextOffset >= total;

    return json({
      phase: "cards",
      results,
      offset,
      limit,
      nextOffset,
      total,
      done,
      summary: {
        imported: results.filter((r) => r.cardCount !== undefined).length,
        skipped: results.filter((r) => r.skipped).length,
        failed: results.filter((r) => r.error).length,
        totalCards: results.reduce((sum, r) => sum + (r.cardCount ?? 0), 0),
      },
    });
  }

  return json({ error: `Unknown phase "${phase}". Use "sets" or "cards".` }, 400);
});
