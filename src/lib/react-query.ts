import { QueryClient } from "@tanstack/react-query";
import { createSyncStoragePersister } from "@tanstack/query-sync-storage-persister";
import { persistQueryClient } from "@tanstack/react-query-persist-client";

/**
 * Shared React Query client with localStorage persistence.
 *
 * Queries whose key starts with one of `PERSISTED_KEYS` survive page reloads
 * and tab restarts for 7 days, so Pokémon set/card data is rehydrated
 * instantly on cold load. Everything else stays in-memory only.
 */
const PERSISTED_KEYS = ["set-cards", "sets-list", "set-meta"] as const;
const SEVEN_DAYS_MS = 7 * 24 * 60 * 60 * 1000;

export const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 60 * 1000,
      refetchOnWindowFocus: false,
      // Long gcTime so persisted queries survive between sessions.
      gcTime: SEVEN_DAYS_MS,
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
    queryClient,
    persister,
    maxAge: SEVEN_DAYS_MS,
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
