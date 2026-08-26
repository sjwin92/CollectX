import { useQuery } from "@tanstack/react-query";
import { getActiveStoreMap } from "@/services/storeService";

/**
 * Batch-resolve which of the given seller user-ids are active verified stores.
 * Mirrors useCardTypeMeta — pass every visible seller id from a page at once.
 */
export function useActiveStores(userIds: Array<string | undefined | null>) {
  const ids = Array.from(new Set(userIds.filter((v): v is string => !!v))).sort();
  const query = useQuery({
    queryKey: ["active-stores", ids],
    enabled: ids.length > 0,
    staleTime: 10 * 60 * 1000,
    queryFn: () => getActiveStoreMap(ids),
  });
  return query.data ?? new Map<string, { slug: string; name: string }>();
}
