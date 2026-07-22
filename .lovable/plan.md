## Phase 1 — Reliable Two-User Card-for-Card Trade

Goal: one complete trade journey (propose → accept → chat → address → ship → confirm → complete → rate) against real schema, no money/escrow, no misleading copy.

Most of this landed in prior turns. This plan closes the remaining verified gaps and locks the invariants.

---

### 1. Schema migrations / constraints / RLS

Single migration, additive only (production has 0 listings / 0 trades so tightening is safe):

**`trades`**
- Drop unused columns if still present: `escrow_required`, `initiator_value`, `recipient_value`.
- Ensure columns exist: `accepted_at`, `completed_at`, `cancelled_at`, `initiator_confirmed_at`, `recipient_confirmed_at` (all `timestamptz`).
- `CHECK (status IN ('proposed','accepted','shipped','completed','cancelled','disputed'))`.
- `CHECK (initiator_user_id <> recipient_user_id)`.
- Keep `trades_require_both_sides` trigger (non-empty jsonb arrays).
- RLS: SELECT = participants only; INSERT = `USING (false)` (force `propose_trade` RPC); UPDATE/DELETE = `USING (false)`.

**`trade_shipments`**
- Unique `(trade_id, sender_user_id)`.
- RLS: SELECT restricted to `sender_user_id = auth.uid()` only (counterparty reads via `get_trade_shipments` RPC that omits addresses/labels). INSERT/UPDATE/DELETE = `USING (false)`.

**`trade_addresses`**
- RLS: SELECT/INSERT/UPDATE restricted to `user_id = auth.uid()`; counterparty reads destination via `get_trade_destination_address` RPC only when they are the sender of the corresponding shipment.

**`trade_messages`**
- Confirm `sender_user_id` and nullable `image_url text` columns exist.
- RLS: SELECT/INSERT for trade participants where `sender_user_id = auth.uid()` and trade not `cancelled`.

**`trade_ratings`**
- Unique `(trade_id, rater_user_id)`.
- `CHECK (rating BETWEEN 1 AND 5)`, `CHECK (rater_user_id <> rated_user_id)`.
- RLS INSERT: participant of a `completed` trade, rated user is counterparty.
- Trigger `recompute_profile_reputation` remains authoritative for `profiles.reputation_score`.

**`marketplace_listings`**
- Keep `marketplace_listing_snapshot` trigger (forces `listing_type='trade'`, nulls `asking_price`, snapshots identity from `user_cards`).
- RLS UPDATE limited to owner AND `status IN ('active','pending')` (block edits on completed/cancelled).

**GRANTs**: `authenticated` on all RPCs; revoke `EXECUTE` from `anon`/`public` on trigger and internal helper functions.

---

### 2. State machine & protected RPCs

```text
proposed ──accept──► accepted ──both mark_shipped──► shipped
   │                    │                              │
   ├─decline (recipient)│                              ├─each confirm_receipt──►
   ├─cancel (initiator) │                              │
   ▼                    ▼                              ▼
cancelled            cancelled                     completed
                                (either) open_dispute → disputed
```

All transitions are `SECURITY DEFINER SET search_path=public` RPCs, each guarded by `WHERE status = <expected>` for idempotency under double-click:

| RPC | Caller | Guard |
|---|---|---|
| `propose_trade(_listing_id, _offered_user_card_ids[], _message)` | anyone auth, ≠ listing owner | listing active, offered cards owned + `for_trade=true` |
| `accept_trade(_trade_id)` | recipient | proposed; deterministic lock of sorted user_cards → listing → trade; reserves cards, cancels competing proposals, seeds two shipments |
| `decline_trade(_trade_id)` | recipient | proposed |
| `cancel_trade(_trade_id)` | initiator | proposed |
| `submit_trade_address(_trade_id, _address)` | participant | trade accepted; locked once other side has shipped to caller |
| `mark_trade_shipped(_trade_id, _tracking, _carrier)` | sender | trade accepted, own shipment pending, destination address exists; flips trade→shipped when both sides shipped |
| `confirm_trade_receipt(_trade_id)` | participant | trade shipped; when both confirmed → swaps ownership, moves card_images, marks listing completed, increments `total_trades`/`successful_trades` |
| `open_trade_dispute(_trade_id, _reason)` | participant | accepted or shipped |
| `get_trade_shipments(_trade_id)` | participant | returns safe columns only (no addresses/labels) |
| `get_trade_destination_address(_trade_id)` | sender | returns recipient address only for own outbound shipment |

Most of these already exist in the DB (see `db-functions`). Gap check: verify `decline_trade`, `cancel_trade`, `open_trade_dispute`, and per-transition guards are present and match above; add any missing.

---

### 3. Source files to update

Verification / small edits only — most refactors already landed:

- `src/services/tradeService.ts` — verify no escrow exports remain; confirm all mutations go through `rpc()`.
- `src/services/shippingService.ts` — remove any cost/label simulation from the active trade path; only expose real `trade_shipments` reads via the RPC.
- `src/components/trades/tradeDetail/useTradeMutations.ts` — ensure exactly: `accept`, `decline`, `cancel`, `submitAddress`, `markShipped`, `confirmReceipt`, `openDispute`, `rate`. No escrow mutations.
- `src/components/trades/tradeDetail/ShippingInfoCard.tsx` — "Your shipment" (own address editable while accepted) vs "Their shipment" (carrier/tracking/status only, never address).
- `src/components/trades/tradeDetail/TradeChat.tsx` — persist `image_url` on send; render via `SmartImage`.
- `src/components/trades/tradeDetail/TradeProgressBar.tsx` — steps: Proposed → Accepted → Shipped → Received → Completed.
- `src/components/trades/tradeDetail/TradeActionsBar.tsx` — buttons 1:1 with RPCs, disabled by status + role.
- `src/components/marketplace/TradeProposalForm.tsx` — offered cards required, must be caller's `user_cards` with `for_trade=true`.
- `src/components/marketplace/CreateListingModal.tsx` — trade-only (already done); verify no price fields.
- `src/components/marketplace/listing/TradeListingProtection.tsx` — copy: "Direct card-for-card trade" (no escrow claim).
- `src/components/trades/TradeRatingModal.tsx` — wired on `completed`, one-per-rater enforced by unique index (surface violation as toast).
- `src/pages/TradeDetail.tsx` — confirm no imports of removed escrow components; hook-order safe.
- `src/pages/Trades.tsx`, `src/components/trades/LiveTradeFeed.tsx`, `src/components/marketplace/TradeListing.tsx` — grep and remove any residual "escrow", "funds", "payment", "protected" strings.
- Delete if still on disk and unimported: `EscrowDetails`, `EscrowModal`, `EscrowPaymentModal`, `TradeBalancePayment`, `escrowService.ts`, `supabaseEscrowService.ts`, `supabaseTradeService.ts` (mock reputation already removed).

---

### 4. Authorization & validation

| Action | Who | Precondition |
|---|---|---|
| Create listing | owner of `user_card_id` | card `for_trade=true`, not in live trade |
| Propose trade | authenticated, not listing owner | listing active; every offered card owned by caller + `for_trade=true` |
| Accept | recipient | status=proposed; all involved cards still owned + `for_trade=true` + not in another live trade |
| Decline | recipient | status=proposed |
| Cancel | initiator | status=proposed |
| Submit address | participant | status=accepted; not locked by other side's shipment |
| Mark shipped | sender | status=accepted; own shipment pending; destination address present; tracking+carrier non-empty |
| Confirm receipt | participant, once | status=shipped; own `*_confirmed_at` null |
| Open dispute | participant | status ∈ (accepted, shipped); reason non-empty ≤2000 |
| Message | participant | trade not cancelled; text or image required |
| Rate | participant, once | status=completed; rated user is counterparty |

Every rule enforced server-side in RPC or RLS. Client checks are UX only.

---

### 5. Two-account end-to-end test (accounts A, B)

1. A and B each add a distinct card to collection with `for_trade=true`.
2. A creates a listing from their card → `marketplace_listings` row snapshot matches `user_cards`.
3. B opens listing, proposes with B's card + message → `trades` row status `proposed`, both snapshots populated.
4. Double-click Accept as A → exactly one status change to `accepted`; two `trade_shipments` rows seeded; A's card + B's card `for_trade=false`.
5. Chat: A sends text; B replies with an image → `trade_messages.image_url` populated; both users see image after reload.
6. Each submits their own address via `submit_trade_address`. Direct `SELECT` on `trade_addresses` as B for A's row returns 0 rows.
7. Each calls `mark_trade_shipped` with tracking/carrier → after second call trade flips to `shipped`. Direct `SELECT` on `trade_shipments` base table as B for A's row returns 0 rows; `get_trade_shipments` returns carrier/tracking only, no address.
8. A confirms receipt → status stays `shipped`; B confirms → status flips to `completed`, ownership swapped in `user_cards`, `card_images.user_id` moved, listing → `completed`, `profiles.total_trades`/`successful_trades` +1 for both.
9. Each submits one rating; second attempt by same rater surfaces unique-violation toast; `profiles.reputation_score` reflects the new average.
10. Grep production build for `escrow`, `funds`, `payment protection`, `insurance` → 0 hits in active trade/marketplace UI.
11. Supabase linter: no new errors.

---

### 6. Deliberately deferred

- Real money escrow, Stripe/PayPal, insurance, refunds.
- Automated dispute resolution beyond flag + admin visibility.
- Real shipping-label purchase, carrier webhook tracking events.
- Reputation tiers/badges beyond raw average.
- Marketplace `listing_type='sale'` monetary flow.
- Notifications integration for trade events.
- Multi-card balancing UX beyond storing arrays.
- Physical deletion of any legacy escrow files that are only unimported (post-Phase-1 cleanup).
