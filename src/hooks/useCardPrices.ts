import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { BASE_URL, fetchFromApi } from "@/services/api/pokemonApiConfig";
import { marketPriceGbp } from "@/lib/cardPrice";

/**
 * Batch-loads live market prices (GBP) for a set of card ids, returning a
 * lookup Map keyed by card id.
 *
 * Two sources, merged:
 *  1. the `pokemon_cards` mirror (`tcgplayer_prices`) — instant, but only as
 *     fresh as the last `import-set-cards` run and currently sparse;
 *  2. a live pokemontcg.io lookup for any id the mirror can't price — this is
 *     what actually makes the figure "live" today.
 *
 * Mirrors `useCardTypeMeta` — pass every visible card id from a page at once;
 * pass an empty array to disable it.
 */
export function useCardPrices(cardIds: Array<string | undefined | null>) {
  const ids = Array.from(new Set(cardIds.filter((v): v is string => !!v))).sort();

  const query = useQuery({
    queryKey: ["card-prices", ids],
    enabled: ids.length > 0,
    // TCGplayer market prices move slowly; an hour is plenty fresh for a UI hint.
    staleTime: 60 * 60 * 1000,
    gcTime: 24 * 60 * 60 * 1000,
    queryFn: async () => {
      const map = new Map<string, number>();

      // 1. Mirror — one query for everything we can.
      const { data, error } = await supabase
        .from("pokemon_cards")
        .select("id, tcgplayer_prices")
        .in("id", ids);
      if (error) throw error;
      for (const row of data ?? []) {
        const gbp = marketPriceGbp((row as { tcgplayer_prices?: unknown }).tcgplayer_prices);
        if (gbp > 0) map.set(row.id, gbp);
      }

      // 2. Live fallback for anything the mirror couldn't price.
      const missing = ids.filter((id) => !map.has(id));
      if (missing.length > 0) {
        await Promise.all(
          chunk(missing, 15).map(async (group) => {
            try {
              const q = encodeURIComponent(group.map((id) => `id:"${id}"`).join(" OR "));
              const res = await fetchFromApi(
                `${BASE_URL}/cards?q=${q}&pageSize=${group.length}&select=id,tcgplayer`,
              );
              if (!res.ok) return;
              const body = (await res.json()) as { data?: Array<{ id: string; tcgplayer?: { prices?: unknown } }> };
              for (const card of body.data ?? []) {
                const gbp = marketPriceGbp(card.tcgplayer?.prices);
                if (gbp > 0) map.set(card.id, gbp);
              }
            } catch {
              // A pricing hint is best-effort — never let it break the page.
            }
          }),
        );
      }

      return map;
    },
  });

  return query.data ?? new Map<string, number>();
}

function chunk<T>(arr: T[], size: number): T[][] {
  const out: T[][] = [];
  for (let i = 0; i < arr.length; i += size) out.push(arr.slice(i, i + size));
  return out;
}
