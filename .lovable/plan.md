
# Phase 1 — Reliable Card-for-Card Trade Journey

Goal: make one two-user, card-for-card trade complete reliably from listing → proposal → accept → chat → dual shipment → dual receipt → completion → ratings. All monetary/escrow simulation is removed. No new product features.

## Trade state machine

Single `trades.status` column, transitions owned by SECURITY DEFINER RPCs. No client-side status writes.

```text
proposed ──accept──► accepted ──both shipments created──► shipped
                │                                          │
                └──decline / cancel──► cancelled           ├─each side confirm_receipt──►
                                                           │
                                              both confirmed → completed
                                                           │
                                              either opens issue → disputed (manual)
```

Allowed statuses: `proposed | accepted | shipped | completed | cancelled | disputed`.
Terminal: `completed`, `cancelled`. `disputed` is a flag; resolution is deferred.

Each transition is a dedicated RPC that (a) verifies `auth.uid()` is the correct participant, (b) verifies current status, (c) does the update in one statement guarded by `WHERE status = <expected>` so concurrent double-clicks cannot duplicate.

## Database migrations

One migration, in order:

1. **Clean up `trades` schema**
   - Drop unused columns: `escrow_required`, `initiator_value`, `recipient_value` (nothing genuine uses them post-Phase-1).
   - Add: `accepted_at`, `completed_at`, `cancelled_at timestamptz`; `initiator_confirmed_at`, `recipient_confirmed_at timestamptz`.
   - Add CHECK: `status IN ('proposed','accepted','shipped','completed','cancelled','disputed')`.
   - Add CHECK: `initiator_user_id <> recipient_user_id`.
   - Keep `initiator_cards`/`recipient_cards jsonb` as the source of truth for proposed cards (each entry: `{user_card_id, card_id, card_name, card_image, quantity, condition, is_graded, grading_company, grade_score}`), non-empty check on both.

2. **Tighten RLS on `trades`**
   - Replace broad `UPDATE` policy with `USING (false)`; all mutations go through RPCs (SECURITY DEFINER).
   - Keep participant SELECT policy.
   - Keep initiator INSERT policy but add trigger: reject INSERT if `recipient_cards` is empty (must be a concrete counter-offer, not open-ended).

3. **`trade_shipments` privacy split**
   - Add view `public.trade_shipments_public` with `security_invoker=on` exposing everything **except** `sender_address`, `recipient_address`, `shipping_label_url`.
   - Replace SELECT policy on base table: participants may read only rows where `auth.uid() = sender_user_id` (own full row incl. own address); the counterparty reads the public view.
   - Keep INSERT: `auth.uid() = sender_user_id`.
   - Replace UPDATE policy: sender can update their own shipment fields (tracking, status → `shipped`/`in_transit`); recipient cannot UPDATE the base row. Status transitions to `delivered` and `received` happen via RPC only.
   - Add unique index `(trade_id, sender_user_id)` — one shipment per sender per trade.

4. **`trade_messages` fix**
   - Column is already `sender_user_id`; keep it. Add `image_url text` column (nullable) so uploaded images survive. Update policies unchanged.

5. **`trade_ratings` constraints**
   - Add unique `(trade_id, rater_user_id)` — one rating per rater per trade.
   - Add CHECK `rating BETWEEN 1 AND 5`.
   - Add CHECK `rater_user_id <> rated_user_id`.
   - Tighten INSERT: also require the trade to be `completed` and rated_user to be the counterparty (validated via subquery on `trades`).

6. **Server-side RPCs (SECURITY DEFINER, `SET search_path = public`)**
   - `accept_trade(_trade_id uuid)` — recipient only; `proposed → accepted`; sets `accepted_at`.
   - `decline_trade(_trade_id uuid)` — recipient only; `proposed → cancelled`.
   - `cancel_trade(_trade_id uuid)` — initiator only, only while `proposed`; `→ cancelled`.
   - `mark_trade_shipped(_shipment_id uuid, _tracking text, _carrier text)` — sender only; updates shipment; if both shipments now have tracking, flips trade `accepted → shipped`.
   - `confirm_trade_receipt(_trade_id uuid)` — participant only; sets their `*_confirmed_at`; if both set, flips `shipped → completed`, `completed_at = now()`, increments both profiles' `successful_trades` and `total_trades`.
   - `open_trade_dispute(_trade_id uuid, _reason text)` — participant; sets `status='disputed'`, stores reason in `metadata`.

7. **Reputation from real data**
   - Replace hand-maintained `profiles.reputation_score` write path with a trigger on `trade_ratings` INSERT that recomputes `AVG(rating)` for `rated_user_id`.

8. **GRANTs** on every new/changed object per platform rules; RPCs granted to `authenticated`.

## Application changes (small, focused)

### Services to consolidate

- `src/services/tradeService.ts` — becomes the single trade API. Rewrite each function to call the RPCs above; remove escrow-related exports (`payInitiatorEscrow`, `payRecipientEscrow`, `releaseTradeEscrow`, `validateReleaseEscrow`).
- **Delete**: `src/services/escrowService.ts`, `src/services/supabaseEscrowService.ts`, `src/services/reputationService.ts` (mock), `src/services/supabaseTradeService.ts` (duplicate of tradeService, causes drift — merge any still-used helpers like `uploadTradeImage` into `tradeService.ts`).
- `src/services/shippingService.ts` — wire `createShipment`, `updateTracking`, `getTradeShipments` to real `trade_shipments` table + `trade_shipments_public` view. Remove any simulated cost/label generation from the trade path (keep types but return null/placeholder).

### UI changes (preserve styling)

- `src/components/marketplace/TradeProposalForm.tsx` / `src/components/trades/TradeProposalForm.tsx` — recipient-card side must be **required** and populated from User B's `user_cards where for_trade=true`. Both sides written as jsonb card snapshots into `trades.initiator_cards` / `recipient_cards`.
- `src/pages/TradeDetail.tsx` composition:
  - Keep `TradeDetailHeader`, `TradeParticipantsCard`, `TradeProgressBar`, `TradeActionsBar`, `TradeChat`, `ShippingInfoCard`, `ImageLightbox`.
  - **Remove** `EscrowDetails`, `EscrowModal`, `EscrowPaymentModal`, `TradeBalancePayment` from the render tree (files can stay on disk but are no longer imported; delete imports).
  - `TradeProgressBar`: relabel steps to `Proposed → Accepted → Shipped → Received → Completed` (no escrow).
  - `TradeActionsBar`: buttons map 1:1 to RPCs (`Accept`, `Decline`, `Cancel`, `Mark Shipped`, `Confirm Receipt`, `Rate Trader`, `Report Issue`). Buttons disabled based on status + role; mutation calls the RPC and refetches.
- `src/components/trades/tradeDetail/ShippingInfoCard.tsx` — split into "Your shipment" (full detail, editable while `accepted`) and "Their shipment" (read from `trade_shipments_public`: carrier, tracking number, status, timestamps only). Address never rendered for counterparty.
- `src/components/trades/tradeDetail/TradeChat.tsx` — uploaded image URL is persisted into new `trade_messages.image_url` (currently discarded). Render via existing `SmartImage`.
- `src/components/trades/tradeDetail/useTradeMutations.ts` — replace escrow mutations with `markShipped`, `confirmReceipt`, `cancel`, `openDispute`, `rate`. Wire to new RPCs.
- `src/components/marketplace/listing/TradeListingProtection.tsx` — change copy from "Protected by CollectX Escrow" to "Direct card-for-card trade" (no monetary claim). Keep icon + layout.
- Add `TradeRatingModal` wiring on the completed state (component exists) — one submit per participant, enforced by the new unique index.

### Removed misleading copy

Grep-and-replace pass in `src/pages/Trades.tsx`, `src/components/marketplace/TradeListing.tsx`, `src/components/trades/*`: remove any "escrow", "funds", "payment protection" strings from the card-for-card flow. Keep visual layout tokens untouched.

## Validation & authorization rules (enforced in RPCs)

| Action | Who | Precondition |
|---|---|---|
| Create trade | any authenticated user | `initiator_user_id = auth.uid()`; both card arrays non-empty; each `user_card_id` in `initiator_cards` belongs to auth.uid() and has `for_trade = true` |
| Accept / Decline | recipient | status = `proposed` |
| Cancel | initiator | status = `proposed` |
| Create shipment | sender participant | status = `accepted`, no existing shipment from this sender |
| Mark shipped | sender of that shipment | shipment exists, tracking non-empty |
| Confirm receipt | participant, once | status = `shipped`, own `*_confirmed_at` is null |
| Rate | participant, once | status = `completed`, rated user is counterparty |
| Message | participant | trade not `cancelled` |

## Acceptance test (two real accounts A, B)

1. A adds a card to collection with `for_trade=true`. B does the same with a different card.
2. B opens A's listing → proposes B's card. Verify row in `trades` with both card snapshots, status `proposed`.
3. A refuses double-click accept: click Accept twice quickly → exactly one status change (RPC guard), no duplicate rows.
4. Chat: A sends text; B replies with an image → row has `image_url` populated; both users see image after refresh.
5. A submits own shipping address + creates shipment; B does the same. Verify: A's `ShippingInfoCard` shows A's full address, B's carrier/tracking only; the reverse for B. Direct SELECT on `trade_shipments` as B for A's row returns 0 rows.
6. Both mark shipped → trade auto-flips to `shipped`.
7. A confirms receipt → status stays `shipped`; B confirms → status flips to `completed`, `completed_at` set, both `profiles.successful_trades` incremented by 1.
8. Each submits one rating; second attempt by same rater fails with unique-violation surfaced as toast.
9. No "escrow"/"payment" string appears anywhere in the trade or listing UI.
10. Supabase linter: no new errors introduced.

## Deliberately deferred

- Real money escrow, Stripe/PayPal, insurance, refunds.
- Automated dispute resolution (only flag + admin visibility).
- Real shipping-label purchase, carrier API tracking events, `tracking_events` polling.
- Reputation tiers/badges beyond raw average rating.
- Marketplace price/monetary listings (`listing_type='sale'`) — kept in schema, not part of Phase-1 journey.
- Notifications integration for trade events.
- Multi-card-per-side balancing UX beyond storing arrays.
- Deleting old escrow component files from disk (imports removed this phase; file cleanup next phase).
