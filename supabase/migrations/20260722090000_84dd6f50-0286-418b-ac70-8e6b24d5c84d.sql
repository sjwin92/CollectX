
-- ────────────────────────────────────────────────────────────────────────────
-- RLS audit follow-up.
--
-- Of the three gaps originally found here, two (notifications INSERT,
-- chat_messages UPDATE) were already closed independently in production —
-- confirmed by querying pg_policies directly rather than trusting the
-- migration file history, which has drifted from what's actually live.
-- escrow_transactions no longer exists at all (dropped independently).
-- Only the notifications lockdown is re-stated below for explicitness/audit
-- trail, matching this repo's existing convention (see "No direct updates to
-- trades"); it's a no-op today since RLS already default-denies with no
-- INSERT policy present, but documents intent against future regressions.
-- ────────────────────────────────────────────────────────────────────────────

DROP POLICY IF EXISTS "Anyone authenticated can insert notifications" ON public.notifications;
CREATE POLICY "No direct inserts to notifications"
  ON public.notifications FOR INSERT
  WITH CHECK (false);

-- ────────────────────────────────────────────────────────────────────────────
-- card_images: the intended tightening from 20260722085050 (own-row,
-- authenticated-only SELECT) never actually took effect on this project —
-- confirmed live via pg_policies: card_images still carried the original
-- "Card images are viewable by everyone" USING (true) policy. That let any
-- anon or authenticated caller bulk-read every user's card-photo rows (and
-- who owns them) via the anon key, not just the intended for_trade/for_sale
-- listing photos. Applying the fix for real here.
-- ────────────────────────────────────────────────────────────────────────────

DROP POLICY IF EXISTS "Card images are viewable by everyone" ON public.card_images;
DROP POLICY IF EXISTS "Users can view their own card images" ON public.card_images;
CREATE POLICY "Users can view their own card images"
  ON public.card_images FOR SELECT
  TO authenticated
  USING (auth.uid() = user_id);
