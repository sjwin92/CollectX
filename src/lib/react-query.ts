import { QueryClient } from "@tanstack/react-query";
import { createSyncStoragePersister } from "@tanstack/query-sync-storage-persister";
import { persistQueryClient } from "@tanstack/react-query-persist-client";
import { CACHE_TTL } from "./cacheConfig";

/**
 * Shared React Query client with localStorage persistence.
 *
 * Queries whose key starts with one of `PERSISTED_KEYS` survive page reloads
 * and tab restarts for 7 days, so Pokémon set/card data is rehydrated
 * instantly on cold load. Everything else stays in-memory only.
 */
const PERSISTED_KEYS = ["set-cards", "sets-list", "set-meta", "localPokemonSets", "batchSetImages"] as const;

export const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 60 * 1000,
      refetchOnWindowFocus: false,
      gcTime: CACHE_TTL.PERSIST_MAX_AGE,
    },
  },
});

if (typeof window !== "undefined") {
  const persister = createSyncStoragePersister({
    storage: window.localStorage,
    key: "collectx-rq-cache",
    throttleTime: 1000,
  });

  persistQueryClient({
    queryClient: queryClient as unknown as Parameters<typeof persistQueryClient>[0]["queryClient"],
    persister,
    maxAge: CACHE_TTL.PERSIST_MAX_AGE,
    dehydrateOptions: {
      shouldDehydrateQuery: (query) => {
        const key = query.queryKey[0];
        return (
          typeof key === "string" &&
          PERSISTED_KEYS.some((prefix) => key === prefix)
        );
      },
    },
  });
}
