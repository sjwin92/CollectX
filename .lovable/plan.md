# CollectX / Trade Collectors Haven — Status Audit & Launch Plan

## TL;DR
The Pokémon data layer, auth, and collection are real and working. **The entire trade → escrow → shipping → rating pipeline is demo-grade**: escrow payments are `setTimeout` simulations, reputation is hardcoded, ratings never persist, and every transactional table is empty (0 trades, 0 listings, 0 escrows, 0 ratings). Admin routes and one edge function are under-protected. MCP is not implemented anywhere. Nothing has ever gone through the live flow.

---

## Current state by area

| # | Area | Verdict | Evidence |
|---|------|---------|----------|
| 1 | Auth (email + Google via Lovable Cloud) | Working | `Auth.tsx`, `AuthContext.tsx`, `integrations/lovable/index.ts` |
| 1a | Password reset UI | Missing | No `resetPasswordForEmail` in `src/pages` |
| 2 | Collection CRUD + image upload | Working (1 row in `user_cards`) | `supabaseCollectionService.ts`, `cardImageUploadService.ts` |
| 3 | Pokémon sets/cards mirror | Working (173 sets, 616 cards) | `import-sets`, `import-set-cards` edge functions |
| 3a | Legacy Pokémon services | Dead code | `pokemonSetsApi.ts`, `unifiedCardService.ts`, `simpleImageService.ts` (0 imports) |
| 4 | Marketplace | Plumbing real, 0 listings ever | `supabaseMarketplaceService.ts`, `increment_listing_views` RPC live |
| 5 | Trades / proposals | Real backend, 0 trades ever; duplicated code | Two `TradeProposalForm` files; `tradeService.ts` + `supabaseTradeService.ts` split |
| 6 | Escrow & payments | **Stubbed — no processor** | `escrowService.ts:73-113` `setTimeout` + `return true`; no Stripe/Paddle anywhere |
| 7 | Shipping | Schema real, no carrier API | `shipping_methods` etc. exist, 0 shipments; no FedEx/UPS/Shippo integration |
| 8 | Messaging | Working; overlapping schemas | `trade_messages` used; `chat_conversations`/`chat_messages` tables exist but likely unwired |
| 9 | Notifications | Working schema, 0 rows | `supabaseNotificationService.ts` with realtime channels |
| 10 | Ratings / reputation | **Broken — mock only** | `reputationService.ts:90-124` returns hardcoded data, `submitTradeRating` `console.log`s and returns without persisting |
| 10a | Disputes | Missing | No dispute table, no UI |
| 11 | AI card search | **Likely broken** | `ai-card-search/index.ts:63` reads `ANTHROPIC_API_KEY`; project secret is named `Claude` — name mismatch |
| 12 | eBay integration | Real OAuth, auth-gated (401 by design), needs creds | `ebay-integration/index.ts`; `EBAY_APP_ID`/`EBAY_CERT_ID` presence unconfirmed |
| 13 | Admin & roles | Backend gated correctly, **no admin seeded** | `user_roles` = 0 rows; `has_role` RLS wired |
| 13a | Admin routes client-side | **Under-protected** | `App.tsx:75-76` only `ProtectedRoute` (login), not role check |
| 13b | `seed-database` edge function | **Public/unauthenticated** | No `Authorization` check — cost/DoS risk |
| 14 | Nav analytics | Working | `navAnalytics.ts` → `nav_metrics` (65 rows) |
| 14a | General analytics | Explicit no-op stub | `supabaseAnalyticsService.ts` header: "All methods are no-ops" |
| 15 | Currency (USD→GBP) | Working, low risk | `currencyService.ts` via frankfurter.app |
| 16 | Build/perf | Solid | Manual chunking, lazy admin routes, `SmartImage` |
| 17 | Duplicate/dead code | See §17 audit above | Confirmed |
| 18 | MCP | **Not implemented anywhere** | Zero hits repo-wide |

**Live DB row counts:** pokemon_sets 173 · pokemon_cards 616 · profiles 1 · user_cards 1 · user_roles 0 · marketplace_listings 0 · trades 0 · escrow_transactions 0 · trade_ratings 0 · trade_shipments 0 · notifications 0 · nav_metrics 65.

---

## Top 10 launch blockers (ranked)

1. **Escrow is fake.** `escrowService.ts` simulates payment success unconditionally; no processor SDK exists in the repo. Real money cannot move.
2. **Ratings never persist.** `reputationService.ts` mocks reputation and skips DB writes — `trade_ratings` will stay empty even after users rate.
3. **`seed-database` edge function is publicly callable** and reachable from a login-only `/admin/seed-database` page.
4. **No admin user in `user_roles`** — the admin dashboard is unreachable by anyone today.
5. **AI card search secret name mismatch** — `ANTHROPIC_API_KEY` vs the actual `Claude` secret. Will 500 on every call.
6. **Zero live data in every transactional table** — the trade flow has never end-to-end run in this project.
7. **No password reset flow.**
8. **`supabaseAnalyticsService.ts` is a stub** — any "your activity/stats" UI silently shows zeros.
9. **Duplicated code** (`tradeService` vs `supabaseTradeService`, two `TradeProposalForm`s) risks divergent behavior.
10. **No real carrier shipping** — labels/tracking are manual text fields.

---

## Prioritized next-step roadmap

### Phase 1 — Unblock a believable demo (small, non-payment)
- Seed one admin row into `user_roles`.
- Add a client-side admin-role gate to `/admin/*` routes.
- Add an `Authorization` + `has_role('admin')` check to the `seed-database` edge function.
- Rename `ai-card-search` env read from `ANTHROPIC_API_KEY` to match the existing `Claude` secret (or add a `ANTHROPIC_API_KEY` alias secret).
- Wire `reputationService.ts` and `TradeRatingModal` to the real `trade_ratings` table.
- Add password-reset UI + `/reset-password` page.
- Manually create sample marketplace listings and one full simulated trade so the UI shows non-empty state.

### Phase 2 — Real transactions
- Integrate Stripe (Connect for peer escrow) behind `escrowService.ts`; keep `supabaseEscrowService.ts` bookkeeping.
- Consolidate `tradeService.ts` + `supabaseTradeService.ts`; delete dead `components/trades/TradeProposalForm.tsx`, `pokemonSetsApi.ts`, `unifiedCardService.ts`, `simpleImageService.ts`; audit `collectionService.ts`.
- Real carrier integration (Shippo or EasyPost) populating `tracking_events`.
- Replace `supabaseAnalyticsService.ts` stub with real tables + writes.
- Confirm eBay creds (`EBAY_APP_ID`/`EBAY_CERT_ID`); decide fate of `freeSealedProductsService.ts` fallback.
- Add a dispute-resolution flow (table + UI + escrow state machine hooks).
- Reconcile chat storage: pick either `trade_messages` or `chat_conversations`+`chat_messages` and drop the other.

### Phase 3 — Growth & MCP
- Build MCP from scratch: add `@lovable.dev/mcp-js`, create `src/lib/mcp/` with `defineTool` per capability (collection, marketplace, trades, pokemon lookup) and `defineMcp` entry; the Vite plugin emits `supabase/functions/mcp/index.ts`; wire Supabase OAuth 2.1 as the auth server so each caller acts as the signed-in user under existing RLS. This is a from-scratch build, not a wiring fix.
- Load-test the trade pipeline once real transactions exist.
- Expand product analytics dashboards.

---

## Open questions (need answers to firm up Phase 1)
1. Actual value/name of the AI secret (`Claude` vs `ANTHROPIC_API_KEY`)?
2. Are `EBAY_APP_ID`/`EBAY_CERT_ID` set?
3. Is `collectionService.ts` still referenced anywhere?
4. Are `chat_conversations`/`chat_messages` used by any service?
5. Current live state of the `user_cards.product_type` CHECK constraint (a later migration re-declared the column without the CHECK)?

Approve this plan and I'll switch to build mode and execute Phase 1 in order. Say "start with X" if you want to reorder.
