// Edge function: import-set-cards
// Pulls cards for a Pokémon set from the public TCG API and upserts them into
// the local mirror tables (pokemon_sets, pokemon_cards, set_images). Stamps
// `set_imports.last_imported_at` so the frontend can rely on a 24h freshness
// window without re-importing on every page view.
//
// Public endpoint (no auth required) — callable from the browser.

import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.0";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

const TCG_API_BASE = "https://api.pokemontcg.io/v2";
const FRESHNESS_MS = 24 * 60 * 60 * 1000; // 24h
const MAX_PAGES = 20; // safety cap (1000 cards)
const PAGE_SIZE = 50;

type Json = Record<string, unknown> | unknown[] | string | number | boolean | null;

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
}

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

function jsonResponse(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });
}

async function fetchJson<T>(url: string): Promise<T> {
  const res = await fetch(url, { headers: { Accept: "application/json" } });
  if (!res.ok) throw new Error(`TCG API ${res.status}: ${await res.text()}`);
  return res.json() as Promise<T>;
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });
  if (req.method !== "POST") return jsonResponse({ error: "Method not allowed" }, 405);

  // --- input validation (Zod-free to keep cold start small) -----------------
  let body: { setId?: unknown; force?: unknown };
  try {
    body = await req.json();
  } catch {
    return jsonResponse({ error: "Invalid JSON body" }, 400);
  }
  const setId = typeof body.setId === "string" ? body.setId.trim() : "";
  const force = body.force === true;
  if (!setId || !/^[a-z0-9._-]{1,32}$/i.test(setId)) {
    return jsonResponse({ error: "setId required (string, ≤32 chars, alphanumeric)" }, 400);
  }

  const supabaseUrl = Deno.env.get("SUPABASE_URL");
  const serviceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");
  if (!supabaseUrl || !serviceKey) {
    return jsonResponse({ error: "Server misconfigured" }, 500);
  }
  const supabase = createClient(supabaseUrl, serviceKey, {
    auth: { persistSession: false },
  });

  // --- freshness check ------------------------------------------------------
  if (!force) {
    const { data: existing } = await supabase
      .from("set_imports")
      .select("last_imported_at, card_count")
      .eq("set_id", setId)
      .maybeSingle();

    if (existing?.last_imported_at) {
      const age = Date.now() - new Date(existing.last_imported_at).getTime();
      if (age < FRESHNESS_MS) {
        return jsonResponse({
          skipped: true,
          reason: "fresh",
          ageMs: age,
          cardCount: existing.card_count,
        });
      }
    }
  }

  try {
    // --- 1. Upsert the set metadata ----------------------------------------
    const setResp = await fetchJson<{ data: TcgSet }>(`${TCG_API_BASE}/sets/${setId}`);
    const set = setResp.data;
    if (!set?.id) return jsonResponse({ error: `Set ${setId} not found in TCG API` }, 404);

    await supabase.from("pokemon_sets").upsert({
      id: set.id,
      name: set.name,
      series: set.series,
      printed_total: set.printedTotal,
      total: set.total,
      ptcgo_code: set.ptcgoCode,
      release_date: set.releaseDate,
      logo_url: set.images?.logo,
      symbol_url: set.images?.symbol,
      legalities: set.legalities,
      images: set.images,
    });

    if (set.images?.logo) {
      await supabase.from("set_images").upsert({
        set_id: set.id,
        image_url: set.images.logo,
        image_type: "logo",
        source: "pokemon_tcg_api",
        is_working: true,
        last_checked: new Date().toISOString(),
      }, { onConflict: "set_id,image_type,image_url" });
    }
    if (set.images?.symbol) {
      await supabase.from("set_images").upsert({
        set_id: set.id,
        image_url: set.images.symbol,
        image_type: "symbol",
        source: "pokemon_tcg_api",
        is_working: true,
        last_checked: new Date().toISOString(),
      }, { onConflict: "set_id,image_type,image_url" });
    }

    // --- 2. Page through cards ---------------------------------------------
    let allCards: TcgCard[] = [];
    let page = 1;
    while (page <= MAX_PAGES) {
      const url = `${TCG_API_BASE}/cards?page=${page}&pageSize=${PAGE_SIZE}&q=${encodeURIComponent(
        `set.id:${setId}`,
      )}`;
      const resp = await fetchJson<{ data: TcgCard[] }>(url);
      const batch = resp.data ?? [];
      allCards = allCards.concat(batch);
      if (batch.length < PAGE_SIZE) break;
      page++;
    }

    // --- 3. Bulk upsert cards ----------------------------------------------
    if (allCards.length > 0) {
      const rows = allCards.map((c) => ({
        id: c.id,
        name: c.name ?? "Unknown",
        supertype: c.supertype,
        subtypes: c.subtypes,
        hp: c.hp,
        types: c.types,
        set_id: c.set?.id ?? setId,
        set_name: c.set?.name ?? set.name,
        number: c.number,
        artist: c.artist,
        rarity: c.rarity,
        flavor_text: c.flavorText,
        images: c.images as Json,
        tcgplayer_prices: c.tcgplayer?.prices as Json,
        small_image_url: c.images?.small,
        large_image_url: c.images?.large,
      }));
      // Chunk to avoid hitting payload limits.
      for (let i = 0; i < rows.length; i += 100) {
        const chunk = rows.slice(i, i + 100);
        const { error } = await supabase.from("pokemon_cards").upsert(chunk);
        if (error) throw new Error(`upsert cards: ${error.message}`);
      }
    }

    // --- 4. Stamp the import row -------------------------------------------
    await supabase.from("set_imports").upsert({
      set_id: setId,
      last_imported_at: new Date().toISOString(),
      card_count: allCards.length,
      last_error: null,
    });

    return jsonResponse({ imported: true, setId, cardCount: allCards.length });
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    // Record the failure so the frontend can show useful state.
    await supabase
      .from("set_imports")
      .upsert({ set_id: setId, last_imported_at: new Date(0).toISOString(), last_error: message })
      .select();
    return jsonResponse({ error: message }, 500);
  }
});
