## Goal
Cards load instantly on every visit — first user to view a set pays a ~2s import cost, everyone else (including the same user across reloads) gets the cards from the database in <200ms. Prices stay fresh because each set auto-refreshes after 24h.

## Architecture

```text
        ┌────────────────────────────────────────────┐
        │ Browser (PokemonCards page)                │
        │                                            │
        │ 1. React Query reads ['set-cards', id]     │
        │    from IndexedDB (instant if cached)      │
        │                                            │
        │ 2. Fetch from Supabase mirror tables ◄─────┼──┐
        │                                            │  │
        │ 3. If miss OR stale (>24h), call edge fn ──┼──┼──► import-set-cards
        │                                            │  │     (server-side)
        │ 4. Re-read mirror tables, render           │  │       │
        └────────────────────────────────────────────┘  │       ▼
                                                        │  External TCG API
        ┌────────────────────────────────────────────┐  │       │
        │ Supabase Postgres                          │  │       │
        │  • pokemon_sets       (set metadata)       │◄─┴───────┘
        │  • pokemon_cards      (card rows + prices) │
        │  • set_images         (logo/symbol URLs)   │
        │  • set_imports        (last_imported_at)   │
        └────────────────────────────────────────────┘
```

## What gets built

### 1. Database (one migration)
- Recreate `pokemon_sets`, `pokemon_cards`, `set_images` from the existing 2025-07-31 migration files (they reference dropped tables today).
- New table `set_imports(set_id pk, last_imported_at timestamptz, card_count int)` — drives the 24h staleness check.
- Public-read RLS so the browser can `SELECT` directly without an edge function on the happy path.
- Indexes: `pokemon_cards(set_id)`, `pokemon_cards(set_id, number)`, `pokemon_sets(release_date desc)`.

### 2. Edge function `import-set-cards`
- Input: `{ setId: string, force?: boolean }`.
- Reads `set_imports.last_imported_at`. If <24h old and `force !== true`, returns `{ skipped: true }` immediately.
- Otherwise pages through the TCG API for that set, upserts into `pokemon_sets` + `pokemon_cards` + `set_images`, then stamps `set_imports`.
- Uses the service-role key (server-side) so it bypasses RLS for writes.
- Validates `setId` with Zod, returns standard CORS headers.

### 3. Frontend
- Replace the `loadAllCards` flow in `src/pages/PokemonCards.tsx` with a single React Query hook `useSetCards(setId)`:
  1. Read `pokemon_cards` rows for `setId` from Supabase.
  2. Read `set_imports.last_imported_at`. If missing or >24h, fire `supabase.functions.invoke('import-set-cards', { body: { setId } })` and then re-read.
  3. Return mapped `CardItemProps[]`.
- Add React Query **persistence**: `@tanstack/query-sync-storage-persister` + `persistQueryClient` writing to `localStorage` (small footprint, instant rehydrate on cold load). Persist only the `set-cards` and `sets-list` keys for 7 days.
- Same hook for the sets list (`useAllSets`) so the homepage tiles are also instant after first load.
- Delete the now-dead "Falling back to external API" branch — mirror is the only path. Keeps the rule in project memory true again.

### 4. Backfill
- Add a tiny admin route (or one-time button on `/admin/nav-metrics`) that calls `import-set-cards` for every set returned by `getSets()` once, so popular sets are warm before users touch them. Optional — without it, the first visitor to each set just waits ~2s.

## Files touched
- `supabase/migrations/<new>.sql` — recreate 3 tables, add `set_imports`, indexes, RLS, GRANTs.
- `supabase/functions/import-set-cards/index.ts` — new edge function.
- `src/hooks/useSetCards.ts` — new React Query hook (replaces ad-hoc `loadAllCards`).
- `src/hooks/useAllSets.ts` — new React Query hook for sets list.
- `src/lib/queryClient.ts` — set up persistent React Query client (new file).
- `src/main.tsx` — wrap with `PersistQueryClientProvider`.
- `src/pages/PokemonCards.tsx` — swap to `useSetCards`, drop the 5-page external loop and in-memory cache (superseded).
- `src/pages/Sets.tsx` — swap to `useAllSets`.
- `src/services/supabasePokemonService.ts` — keep, but remove the "missing table" short-circuit since tables exist again.
- `src/services/pokemonDataImporter.ts` — delete (replaced by edge function).

## Performance expectations
| Scenario | Before | After |
|---|---|---|
| First user clicks a brand-new set | 3–8s (5 API pages) | ~2s (edge function import) |
| Same user revisits set | 3–8s again | <50ms (IndexedDB hydrate) |
| Different user, same set | 3–8s | <200ms (Supabase read) |
| Set last imported >24h ago | n/a | <200ms render + silent background refresh |

## Risks / trade-offs
- **Edge function cold start**: ~300–500ms extra on the very first import. Acceptable for a one-time-per-set cost.
- **TCG API rate limits**: import-set-cards is gated by the 24h freshness check, so each set is fetched at most once per day across all users.
- **Storage**: ~250 cards × ~50 sets × ~2KB = ~25MB total. Negligible.
- **Stale prices**: bounded at 24h. If you ever want real-time prices, swap to eBay live pricing (already integrated for sealed products).

## Out of scope
- Per-card price history.
- Backfilling ALL sets upfront (the optional admin button covers this on demand).
- Search across all cards globally — current search scope (within a set / by name) is unchanged.
