import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { normalizeSetId } from "@/services/setIdMappingService";
import { usdToGbp } from "@/services/currencyService";
import type { CardItemProps } from "@/components/cards/CardItem";
import { CACHE_TTL } from "@/lib/cacheConfig";
import type { Json } from "@/integrations/supabase/types";

function extractGbpPrice(tcgplayerPrices: Json | null): string {
  const p =
    tcgplayerPrices && typeof tcgplayerPrices === "object" && !Array.isArray(tcgplayerPrices)
      ? tcgplayerPrices
      : {};
  const price = (variant: string, field: "market" | "mid") => {
    const value = p[variant];
    return value && typeof value === "object" && !Array.isArray(value)
      ? value[field]
      : undefined;
  };
  const usd =
    price("holofoil", "market") ?? price("holofoil", "mid") ??
    price("normal", "market") ?? price("normal", "mid") ??
    price("reverseHolofoil", "market") ?? price("reverseHolofoil", "mid") ??
    price("1stEditionHolofoil", "market") ??
    price("unlimitedHolofoil", "market") ?? 0;
  return typeof usd === "number" && usd > 0 ? `£${usdToGbp(usd).toFixed(2)}` : "N/A";
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
  tcgplayer_prices: Json | null;
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
  const { data, error } = await supabase
    .from("pokemon_cards")
    .select("id,name,set_id,set_name,number,rarity,small_image_url,large_image_url,tcgplayer_prices")
    .eq("set_id", setId)
    .order("number");
  if (error) throw error;
  return toCardItems((data ?? []) as CardRow[]);
}

async function fetchSetCards(rawSetId: string): Promise<CardItemProps[]> {
  const setId = normalizeSetId(rawSetId);
  return readMirror(setId);
}

export function useSetCards(setId: string | null | undefined) {
  return useQuery({
    queryKey: ["set-cards", setId ? normalizeSetId(setId) : null] as const,
    queryFn: () => fetchSetCards(setId!),
    enabled: !!setId,
    staleTime: CACHE_TTL.SET_CARDS,
  });
}
