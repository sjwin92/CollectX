
-- ────────────────────────────────────────────────────────────────────────────
-- Phase 1: reliable card-for-card trade journey
-- ────────────────────────────────────────────────────────────────────────────

-- 1. TRADES ------------------------------------------------------------------

-- Normalize any legacy statuses first so new CHECK passes
UPDATE public.trades
   SET status = CASE
     WHEN status IN ('processing','escrowed','received') THEN 'accepted'
     WHEN status = 'declined' THEN 'cancelled'
     ELSE status
   END
 WHERE status NOT IN ('proposed','accepted','shipped','completed','cancelled','disputed');

ALTER TABLE public.trades
  DROP COLUMN IF EXISTS escrow_required,
  DROP COLUMN IF EXISTS initiator_value,
  DROP COLUMN IF EXISTS recipient_value;

ALTER TABLE public.trades
  ADD COLUMN IF NOT EXISTS accepted_at            timestamptz,
  ADD COLUMN IF NOT EXISTS completed_at           timestamptz,
  ADD COLUMN IF NOT EXISTS cancelled_at           timestamptz,
  ADD COLUMN IF NOT EXISTS initiator_confirmed_at timestamptz,
  ADD COLUMN IF NOT EXISTS recipient_confirmed_at timestamptz;

ALTER TABLE public.trades
  DROP CONSTRAINT IF EXISTS trades_status_check,
  ADD  CONSTRAINT trades_status_check
       CHECK (status IN ('proposed','accepted','shipped','completed','cancelled','disputed'));

ALTER TABLE public.trades
  DROP CONSTRAINT IF EXISTS trades_distinct_participants,
  ADD  CONSTRAINT trades_distinct_participants
       CHECK (initiator_user_id <> recipient_user_id);

-- Require non-empty card arrays on both sides
CREATE OR REPLACE FUNCTION public.trades_require_both_sides()
RETURNS TRIGGER
LANGUAGE plpgsql
SET search_path = public
AS $$
BEGIN
  IF NEW.initiator_cards IS NULL
     OR jsonb_typeof(NEW.initiator_cards) <> 'array'
     OR jsonb_array_length(NEW.initiator_cards) = 0 THEN
    RAISE EXCEPTION 'initiator_cards must be a non-empty array';
  END IF;
  IF NEW.recipient_cards IS NULL
     OR jsonb_typeof(NEW.recipient_cards) <> 'array'
     OR jsonb_array_length(NEW.recipient_cards) = 0 THEN
    RAISE EXCEPTION 'recipient_cards must be a non-empty array (counter-offer required)';
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_trades_require_both_sides ON public.trades;
CREATE TRIGGER trg_trades_require_both_sides
  BEFORE INSERT ON public.trades
  FOR EACH ROW EXECUTE FUNCTION public.trades_require_both_sides();

-- Lock down direct UPDATEs (all status transitions go via RPCs)
DROP POLICY IF EXISTS "Trade participants can update trades" ON public.trades;
CREATE POLICY "No direct updates to trades"
  ON public.trades FOR UPDATE
  USING (false);

-- 2. TRADE MESSAGES ----------------------------------------------------------

ALTER TABLE public.trade_messages
  ADD COLUMN IF NOT EXISTS image_url text;

-- 3. TRADE RATINGS -----------------------------------------------------------

ALTER TABLE public.trade_ratings
  DROP CONSTRAINT IF EXISTS trade_ratings_rating_check,
  ADD  CONSTRAINT trade_ratings_rating_check CHECK (rating BETWEEN 1 AND 5);

ALTER TABLE public.trade_ratings
  DROP CONSTRAINT IF EXISTS trade_ratings_no_self,
  ADD  CONSTRAINT trade_ratings_no_self CHECK (rater_user_id <> rated_user_id);

CREATE UNIQUE INDEX IF NOT EXISTS trade_ratings_one_per_rater
  ON public.trade_ratings (trade_id, rater_user_id);

DROP POLICY IF EXISTS "Trade participants can create ratings" ON public.trade_ratings;
CREATE POLICY "Participants can rate completed trades"
  ON public.trade_ratings FOR INSERT
  WITH CHECK (
    auth.uid() = rater_user_id
    AND EXISTS (
      SELECT 1 FROM public.trades t
      WHERE t.id = trade_ratings.trade_id
        AND t.status = 'completed'
        AND (
          (t.initiator_user_id = auth.uid() AND t.recipient_user_id = rated_user_id) OR
          (t.recipient_user_id = auth.uid() AND t.initiator_user_id = rated_user_id)
        )
    )
  );

-- 4. TRADE SHIPMENTS ---------------------------------------------------------

-- One shipment per sender per trade
CREATE UNIQUE INDEX IF NOT EXISTS trade_shipments_one_per_sender
  ON public.trade_shipments (trade_id, sender_user_id);

-- Public projection: everything except private/sensitive fields
DROP VIEW IF EXISTS public.trade_shipments_public;
CREATE VIEW public.trade_shipments_public
WITH (security_invoker = on) AS
SELECT
  id, trade_id, sender_user_id, recipient_user_id,
  shipping_method_id, tracking_number,
  shipping_cost, insurance_value, weight_kg, dimensions_cm,
  status, shipped_at, delivered_at,
  created_at, updated_at
FROM public.trade_shipments;

GRANT SELECT ON public.trade_shipments_public TO authenticated;

-- Base-table SELECT restricted to the sender only (private address stays private)
DROP POLICY IF EXISTS "Trade participants can view shipments" ON public.trade_shipments;
CREATE POLICY "Sender can view own shipment"
  ON public.trade_shipments FOR SELECT
  USING (auth.uid() = sender_user_id);

-- Recipients cannot UPDATE base rows
DROP POLICY IF EXISTS "Trade participants can update shipments" ON public.trade_shipments;
CREATE POLICY "Sender can update own shipment"
  ON public.trade_shipments FOR UPDATE
  USING (auth.uid() = sender_user_id)
  WITH CHECK (auth.uid() = sender_user_id);

-- 5. RPCs --------------------------------------------------------------------

-- accept_trade
CREATE OR REPLACE FUNCTION public.accept_trade(_trade_id uuid)
RETURNS public.trades
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  updated public.trades;
BEGIN
  UPDATE public.trades
     SET status = 'accepted',
         accepted_at = now(),
         updated_at = now()
   WHERE id = _trade_id
     AND status = 'proposed'
     AND recipient_user_id = auth.uid()
  RETURNING * INTO updated;

  IF updated.id IS NULL THEN
    RAISE EXCEPTION 'Cannot accept trade: not recipient or not in proposed state';
  END IF;
  RETURN updated;
END;
$$;

-- decline_trade
CREATE OR REPLACE FUNCTION public.decline_trade(_trade_id uuid)
RETURNS public.trades
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE updated public.trades;
BEGIN
  UPDATE public.trades
     SET status = 'cancelled',
         cancelled_at = now(),
         updated_at = now()
   WHERE id = _trade_id
     AND status = 'proposed'
     AND recipient_user_id = auth.uid()
  RETURNING * INTO updated;
  IF updated.id IS NULL THEN
    RAISE EXCEPTION 'Cannot decline trade';
  END IF;
  RETURN updated;
END;
$$;

-- cancel_trade (initiator only, while proposed)
CREATE OR REPLACE FUNCTION public.cancel_trade(_trade_id uuid)
RETURNS public.trades
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE updated public.trades;
BEGIN
  UPDATE public.trades
     SET status = 'cancelled',
         cancelled_at = now(),
         updated_at = now()
   WHERE id = _trade_id
     AND status = 'proposed'
     AND initiator_user_id = auth.uid()
  RETURNING * INTO updated;
  IF updated.id IS NULL THEN
    RAISE EXCEPTION 'Cannot cancel trade';
  END IF;
  RETURN updated;
END;
$$;

-- mark_trade_shipped
CREATE OR REPLACE FUNCTION public.mark_trade_shipped(
  _trade_id uuid,
  _tracking text,
  _carrier text
)
RETURNS public.trade_shipments
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  ship public.trade_shipments;
  other_shipped boolean;
BEGIN
  IF _tracking IS NULL OR length(trim(_tracking)) = 0 THEN
    RAISE EXCEPTION 'Tracking number required';
  END IF;

  UPDATE public.trade_shipments
     SET tracking_number = _tracking,
         status = 'shipped',
         shipped_at = COALESCE(shipped_at, now()),
         metadata = COALESCE(metadata, '{}'::jsonb) || jsonb_build_object('carrier', _carrier),
         updated_at = now()
   WHERE trade_id = _trade_id
     AND sender_user_id = auth.uid()
  RETURNING * INTO ship;

  IF ship.id IS NULL THEN
    RAISE EXCEPTION 'No shipment found for this trade/sender';
  END IF;

  -- If both parties have shipped, flip the trade to shipped
  SELECT EXISTS (
    SELECT 1 FROM public.trade_shipments s
     WHERE s.trade_id = _trade_id
       AND s.sender_user_id <> auth.uid()
       AND s.status IN ('shipped','delivered')
       AND s.tracking_number IS NOT NULL
  ) INTO other_shipped;

  IF other_shipped THEN
    UPDATE public.trades
       SET status = 'shipped',
           updated_at = now()
     WHERE id = _trade_id
       AND status = 'accepted';
  END IF;

  RETURN ship;
END;
$$;

-- confirm_trade_receipt
CREATE OR REPLACE FUNCTION public.confirm_trade_receipt(_trade_id uuid)
RETURNS public.trades
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  t public.trades;
BEGIN
  SELECT * INTO t FROM public.trades WHERE id = _trade_id;
  IF t.id IS NULL THEN
    RAISE EXCEPTION 'Trade not found';
  END IF;
  IF auth.uid() NOT IN (t.initiator_user_id, t.recipient_user_id) THEN
    RAISE EXCEPTION 'Not a participant';
  END IF;
  IF t.status <> 'shipped' THEN
    RAISE EXCEPTION 'Trade must be shipped before confirming receipt';
  END IF;

  IF auth.uid() = t.initiator_user_id THEN
    UPDATE public.trades
       SET initiator_confirmed_at = COALESCE(initiator_confirmed_at, now()),
           updated_at = now()
     WHERE id = _trade_id AND initiator_confirmed_at IS NULL
    RETURNING * INTO t;
  ELSE
    UPDATE public.trades
       SET recipient_confirmed_at = COALESCE(recipient_confirmed_at, now()),
           updated_at = now()
     WHERE id = _trade_id AND recipient_confirmed_at IS NULL
    RETURNING * INTO t;
  END IF;

  -- If both confirmed, complete trade
  SELECT * INTO t FROM public.trades WHERE id = _trade_id;
  IF t.initiator_confirmed_at IS NOT NULL AND t.recipient_confirmed_at IS NOT NULL AND t.status = 'shipped' THEN
    UPDATE public.trades
       SET status = 'completed',
           completed_at = now(),
           updated_at = now()
     WHERE id = _trade_id
    RETURNING * INTO t;

    UPDATE public.profiles
       SET total_trades = total_trades + 1,
           successful_trades = successful_trades + 1,
           updated_at = now()
     WHERE user_id IN (t.initiator_user_id, t.recipient_user_id);
  END IF;

  RETURN t;
END;
$$;

-- open_trade_dispute
CREATE OR REPLACE FUNCTION public.open_trade_dispute(_trade_id uuid, _reason text)
RETURNS public.trades
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE t public.trades;
BEGIN
  UPDATE public.trades
     SET status = 'disputed',
         metadata = COALESCE(metadata, '{}'::jsonb) || jsonb_build_object(
           'dispute', jsonb_build_object(
             'opened_by', auth.uid(),
             'opened_at', now(),
             'reason', _reason
           )),
         updated_at = now()
   WHERE id = _trade_id
     AND auth.uid() IN (initiator_user_id, recipient_user_id)
     AND status IN ('accepted','shipped')
  RETURNING * INTO t;
  IF t.id IS NULL THEN
    RAISE EXCEPTION 'Cannot open dispute';
  END IF;
  RETURN t;
END;
$$;

REVOKE ALL ON FUNCTION public.accept_trade(uuid)               FROM PUBLIC, anon;
REVOKE ALL ON FUNCTION public.decline_trade(uuid)              FROM PUBLIC, anon;
REVOKE ALL ON FUNCTION public.cancel_trade(uuid)               FROM PUBLIC, anon;
REVOKE ALL ON FUNCTION public.mark_trade_shipped(uuid,text,text) FROM PUBLIC, anon;
REVOKE ALL ON FUNCTION public.confirm_trade_receipt(uuid)      FROM PUBLIC, anon;
REVOKE ALL ON FUNCTION public.open_trade_dispute(uuid,text)    FROM PUBLIC, anon;

GRANT EXECUTE ON FUNCTION public.accept_trade(uuid)               TO authenticated;
GRANT EXECUTE ON FUNCTION public.decline_trade(uuid)              TO authenticated;
GRANT EXECUTE ON FUNCTION public.cancel_trade(uuid)               TO authenticated;
GRANT EXECUTE ON FUNCTION public.mark_trade_shipped(uuid,text,text) TO authenticated;
GRANT EXECUTE ON FUNCTION public.confirm_trade_receipt(uuid)      TO authenticated;
GRANT EXECUTE ON FUNCTION public.open_trade_dispute(uuid,text)    TO authenticated;

-- 6. REPUTATION TRIGGER ------------------------------------------------------

CREATE OR REPLACE FUNCTION public.recompute_profile_reputation()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  target uuid := COALESCE(NEW.rated_user_id, OLD.rated_user_id);
  avg_rating numeric;
BEGIN
  SELECT COALESCE(AVG(rating), 0) INTO avg_rating
    FROM public.trade_ratings
   WHERE rated_user_id = target;

  UPDATE public.profiles
     SET reputation_score = avg_rating,
         updated_at = now()
   WHERE user_id = target;

  RETURN NULL;
END;
$$;

DROP TRIGGER IF EXISTS trg_ratings_reputation ON public.trade_ratings;
CREATE TRIGGER trg_ratings_reputation
  AFTER INSERT OR UPDATE OR DELETE ON public.trade_ratings
  FOR EACH ROW EXECUTE FUNCTION public.recompute_profile_reputation();
