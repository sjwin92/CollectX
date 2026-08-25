-- Fix: marketplace_listings has only ever had a SELECT RLS policy on this
-- live database — no INSERT/UPDATE/DELETE policy exists at all, meaning no
-- user has ever been able to create, edit, or cancel a listing directly
-- (blocked by RLS default-deny, on top of the missing GRANT fixed in the
-- previous migration). Migration history shows a schema reset
-- (~20260416192423) recreated marketplace_listings from scratch without
-- carrying forward whatever write policies the pre-reset (2025-07-31) schema
-- had; later migrations (e.g. the ownership-validating snapshot trigger)
-- assumed those policies still existed.
--
-- The trigger (marketplace_listing_snapshot) already validates card
-- ownership and enforces immutable user_id/user_card_id on every write, so
-- these policies only need to gate the acting user's identity and — for
-- UPDATE/DELETE — restrict to listings not already mid-transaction.
-- Service-role writes (checkout reservation, trade RPCs) bypass RLS
-- entirely and are unaffected by this.

CREATE POLICY "Users can create their own listings"
  ON public.marketplace_listings FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own active or cancelled listings"
  ON public.marketplace_listings FOR UPDATE
  USING (auth.uid() = user_id AND status IN ('active', 'cancelled'))
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can delete their own active or cancelled listings"
  ON public.marketplace_listings FOR DELETE
  USING (auth.uid() = user_id AND status IN ('active', 'cancelled'));
