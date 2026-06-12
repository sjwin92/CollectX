import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { normalizeSetId } from "@/services/setIdMappingService";
import { usdToGbp } from "@/services/currencyService";
import type { CardItemProps } from "@/components/cards/CardItem";

const FRESHNESS_MS = 24 * 60 * 60 * 1000; // mirror the edge function

function extractGbpPrice(tcgplayerPrices: any): string {
  const p = tcgplayerPrices;
  const usd =
    p?.holofoil?.market ?? p?.holofoil?.mid ??
    p?.normal?.market ?? p?.normal?.mid ??
    p?.reverseHolofoil?.market ?? p?.reverseHolofoil?.mid ??
    p?.["1stEditionHolofoil"]?.market ??
    p?.unlimitedHolofoil?.market ?? 0;
  return usd > 0 ? `£${usdToGbp(usd).toFixed(2)}` : "N/A";
}

interface CardRow {
  id: string;
  name: string | null;
  set_id: string | null;
  set_name: string | null;
  number: string | null;
  rarity: string | null;
  small_image_url: string | null;
  large_image_url: string | null;
  tcgplayer_prices: any;
}

function toCardItems(rows: CardRow[]): CardItemProps[] {
  return rows.map((row) => ({
    id: row.id,
    name: row.name ?? "Unknown Card",
    imageUrl: row.small_image_url ?? row.large_image_url ?? undefined,
    rarity: row.rarity ?? "Unknown",
    condition: "Near Mint",
    estimatedValue: extractGbpPrice(row.tcgplayer_prices),
    number: row.number ?? undefined,
    set: { id: row.set_id ?? undefined, name: row.set_name ?? undefined },
  }));
}

async function readMirror(setId: string): Promise<CardItemProps[]> {
  const { data, error } = await (supabase as any)
    .from("pokemon_cards")
    .select("id,name,set_id,set_name,number,rarity,small_image_url,large_image_url,tcgplayer_prices")
    .eq("set_id", setId)
    .order("number");
  if (error) throw error;
  return toCardItems((data ?? []) as CardRow[]);
}

async function readFreshness(setId: string): Promise<number | null> {
  const { data } = await (supabase as any)
    .from("set_imports")
    .select("last_imported_at")
    .eq("set_id", setId)
    .maybeSingle();
  return data?.last_imported_at ? new Date(data.last_imported_at).getTime() : null;
}

async function fetchSetCards(rawSetId: string): Promise<CardItemProps[]> {
  const setId = normalizeSetId(rawSetId);

  // 1. Read whatever the mirror has right now.
  let cards = await readMirror(setId);
  const importedAt = await readFreshness(setId);
  const stale = !importedAt || Date.now() - importedAt > FRESHNESS_MS;

  // 2. If we have nothing OR data is stale, trigger an import.
  if (cards.length === 0 || stale) {
    try {
      await supabase.functions.invoke("import-set-cards", { body: { setId } });
      cards = await readMirror(setId);
    } catch (err) {
      // If we already had cached cards, keep them rather than failing the page.
      if (cards.length === 0) throw err;
      console.warn("import-set-cards failed, serving stale data:", err);
    }
  }

  return cards;
}

export function useSetCards(setId: string | null | undefined) {
  return useQuery({
    queryKey: ["set-cards", setId ? normalizeSetId(setId) : null] as const,
    queryFn: () => fetchSetCards(setId!),
    enabled: !!setId,
    staleTime: 24 * 60 * 60 * 1000, // local cache mirrors the server freshness window
  });
}
