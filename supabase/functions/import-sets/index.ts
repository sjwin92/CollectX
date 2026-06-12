// Edge function: import-sets
// Fetches the full list of Pokémon sets from the public TCG API and upserts
// them into pokemon_sets + set_images. No card data — just the set metadata
// needed for the Sets index page. Cached behind a 24h freshness check via
// the special set_imports row id "__all_sets__".

import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.0";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

const TCG_API_BASE = "https://api.pokemontcg.io/v2";
const FRESHNESS_MS = 24 * 60 * 60 * 1000;
const SENTINEL = "__all_sets__";

interface TcgSet {
  id: string;
  name: string;
  series?: string;
  printedTotal?: number;
  total?: number;
  ptcgoCode?: string;
  releaseDate?: string;
  legalities?: unknown;
  images?: { logo?: string; symbol?: string };
}

function json(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });
  if (req.method !== "POST" && req.method !== "GET")
    return json({ error: "Method not allowed" }, 405);

  let force = false;
  if (req.method === "POST") {
    try {
      const body = await req.json();
      force = body?.force === true;
    } catch { /* empty body ok */ }
  }

  const supabaseUrl = Deno.env.get("SUPABASE_URL");
  const serviceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");
  if (!supabaseUrl || !serviceKey) return json({ error: "Server misconfigured" }, 500);

  const supabase = createClient(supabaseUrl, serviceKey, {
    auth: { persistSession: false },
  });

  if (!force) {
    const { data: existing } = await supabase
      .from("set_imports")
      .select("last_imported_at, card_count")
      .eq("set_id", SENTINEL)
      .maybeSingle();
    if (existing?.last_imported_at) {
      const age = Date.now() - new Date(existing.last_imported_at).getTime();
      if (age < FRESHNESS_MS) {
        return json({ skipped: true, reason: "fresh", ageMs: age, count: existing.card_count });
      }
    }
  }

  try {
    // The /sets endpoint returns up to 250 per page; one page is enough today
    // (~170 sets) but we still paginate defensively.
    let all: TcgSet[] = [];
    let page = 1;
    while (page <= 10) {
      const res = await fetch(`${TCG_API_BASE}/sets?page=${page}&pageSize=250`, {
        headers: { Accept: "application/json" },
      });
      if (!res.ok) throw new Error(`TCG /sets ${res.status}: ${await res.text()}`);
      const body = await res.json() as { data: TcgSet[] };
      const batch = body.data ?? [];
      all = all.concat(batch);
      if (batch.length < 250) break;
      page++;
    }

    if (all.length > 0) {
      const rows = all.map((s) => ({
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
      for (let i = 0; i < rows.length; i += 100) {
        const { error } = await supabase.from("pokemon_sets").upsert(rows.slice(i, i + 100));
        if (error) throw new Error(`upsert sets: ${error.message}`);
      }
    }

    await supabase.from("set_imports").upsert({
      set_id: SENTINEL,
      last_imported_at: new Date().toISOString(),
      card_count: all.length,
      last_error: null,
    });

    return json({ imported: true, count: all.length });
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    return json({ error: message }, 500);
  }
});
