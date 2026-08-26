import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import type { CardTypeMeta } from "@/lib/cardTypeLabel";

/**
 * Batch-loads the type metadata (supertype / subtypes / types) for a set of
 * card ids from the `pokemon_cards` mirror, returning a lookup Map.
 *
 * Pass every visible card id from a page at once so it's a single query;
 * pass an empty array (or nothing) to disable it.
 */
export function useCardTypeMeta(cardIds: Array<string | undefined | null>) {
  const ids = Array.from(new Set(cardIds.filter((v): v is string => !!v))).sort();

  const query = useQuery({
    queryKey: ["card-type-meta", ids],
    enabled: ids.length > 0,
    staleTime: 24 * 60 * 60 * 1000,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("pokemon_cards")
        .select("id, supertype, subtypes, types")
        .in("id", ids);
      if (error) throw error;
      const map = new Map<string, CardTypeMeta>();
      for (const row of data ?? []) {
        map.set(row.id, {
          supertype: row.supertype,
          subtypes: row.subtypes,
          types: row.types,
        });
      }
      return map;
    },
  });

  return query.data ?? new Map<string, CardTypeMeta>();
}
