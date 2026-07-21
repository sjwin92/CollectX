
-- 1. Correct default status
ALTER TABLE public.trades ALTER COLUMN status SET DEFAULT 'proposed';

-- 2. Link listings to a real collection row (optional, backfill-safe)
ALTER TABLE public.marketplace_listings
  ADD COLUMN IF NOT EXISTS user_card_id uuid REFERENCES public.user_cards(id) ON DELETE SET NULL;

-- 3. Per-trade delivery addresses (each participant submits their own)
CREATE TABLE IF NOT EXISTS public.trade_addresses (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  trade_id uuid NOT NULL REFERENCES public.trades(id) ON DELETE CASCADE,
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  address jsonb NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (trade_id, user_id)
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.trade_addresses TO authenticated;
GRANT ALL ON public.trade_addresses TO service_role;
ALTER TABLE public.trade_addresses ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Owner can view own address" ON public.trade_addresses;
DROP POLICY IF EXISTS "Owner can insert own address" ON public.trade_addresses;
DROP POLICY IF EXISTS "Owner can update own address" ON public.trade_addresses;
DROP POLICY IF EXISTS "Owner can delete own address" ON public.trade_addresses;

CREATE POLICY "Owner can view own address" ON public.trade_addresses
  FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Owner can insert own address" ON public.trade_addresses
  FOR INSERT WITH CHECK (
    auth.uid() = user_id
    AND EXISTS (
      SELECT 1 FROM public.trades t
      WHERE t.id = trade_id AND auth.uid() IN (t.initiator_user_id, t.recipient_user_id)
    )
  );
CREATE POLICY "Owner can update own address" ON public.trade_addresses
  FOR UPDATE USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Owner can delete own address" ON public.trade_addresses
  FOR DELETE USING (auth.uid() = user_id);

DROP TRIGGER IF EXISTS update_trade_addresses_updated_at ON public.trade_addresses;
CREATE TRIGGER update_trade_addresses_updated_at
  BEFORE UPDATE ON public.trade_addresses
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- 4. Chat messages must carry text or an image
ALTER TABLE public.trade_messages
  DROP CONSTRAINT IF EXISTS trade_messages_content_required;
ALTER TABLE public.trade_messages
  ADD CONSTRAINT trade_messages_content_required
  CHECK (length(coalesce(message,'')) > 0 OR image_url IS NOT NULL);

-- 5. propose_trade RPC — server verifies ownership, builds snapshots
CREATE OR REPLACE FUNCTION public.propose_trade(
  _listing_id uuid,
  _offered_user_card_ids uuid[],
  _message text DEFAULT NULL
) RETURNS public.trades
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  caller uuid := auth.uid();
  listing public.marketplace_listings;
  offered_cards jsonb;
  recipient_snapshot jsonb;
  trade_row public.trades;
BEGIN
  IF caller IS NULL THEN RAISE EXCEPTION 'Not authenticated'; END IF;
  IF _offered_user_card_ids IS NULL OR array_length(_offered_user_card_ids, 1) IS NULL THEN
    RAISE EXCEPTION 'Select at least one card to offer';
  END IF;

  SELECT * INTO listing FROM public.marketplace_listings WHERE id = _listing_id;
  IF listing.id IS NULL THEN RAISE EXCEPTION 'Listing not found'; END IF;
  IF listing.status <> 'active' THEN RAISE EXCEPTION 'Listing is not active'; END IF;
  IF listing.user_id = caller THEN RAISE EXCEPTION 'Cannot propose against your own listing'; END IF;

  IF EXISTS (
    SELECT 1 FROM unnest(_offered_user_card_ids) AS oid
    LEFT JOIN public.user_cards uc ON uc.id = oid
    WHERE uc.id IS NULL OR uc.user_id <> caller OR uc.for_trade = false
  ) THEN
    RAISE EXCEPTION 'One or more offered cards are not owned by you or not marked for trade';
  END IF;

  SELECT jsonb_agg(jsonb_build_object(
    'id', uc.card_id,
    'user_card_id', uc.id,
    'card_name', uc.card_name,
    'imageUrl', uc.card_image,
    'condition', COALESCE(uc.condition,'near_mint'),
    'estimatedValue', COALESCE(uc.trade_value::text,'0'),
    'quantity', 1,
    'graded', uc.is_graded,
    'grading_company', uc.grading_company,
    'grade_score', uc.grade_score
  ))
  INTO offered_cards
  FROM public.user_cards uc
  WHERE uc.id = ANY(_offered_user_card_ids);

  recipient_snapshot := jsonb_build_array(jsonb_build_object(
    'id', listing.card_id,
    'listing_id', listing.id,
    'user_card_id', listing.user_card_id,
    'card_name', listing.card_name,
    'imageUrl', listing.image_url,
    'condition', COALESCE(listing.condition,'near_mint'),
    'estimatedValue', COALESCE(listing.asking_price::text,'0'),
    'quantity', 1,
    'graded', listing.is_graded,
    'grading_company', listing.grade_company,
    'grade_score', listing.grade_score::text
  ));

  INSERT INTO public.trades (
    initiator_user_id, recipient_user_id, status,
    initiator_cards, recipient_cards, description, metadata
  ) VALUES (
    caller, listing.user_id, 'proposed',
    offered_cards, recipient_snapshot,
    NULLIF(trim(coalesce(_message,'')),''),
    jsonb_build_object('listing_id', listing.id)
  ) RETURNING * INTO trade_row;

  RETURN trade_row;
END;
$$;
REVOKE ALL ON FUNCTION public.propose_trade(uuid, uuid[], text) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.propose_trade(uuid, uuid[], text) TO authenticated;

-- 6. accept_trade — also creates both shipment rows idempotently
CREATE OR REPLACE FUNCTION public.accept_trade(_trade_id uuid)
RETURNS public.trades
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE updated public.trades;
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

  INSERT INTO public.trade_shipments (trade_id, sender_user_id, recipient_user_id, status)
  VALUES
    (updated.id, updated.initiator_user_id, updated.recipient_user_id, 'pending'),
    (updated.id, updated.recipient_user_id, updated.initiator_user_id, 'pending')
  ON CONFLICT (trade_id, sender_user_id) DO NOTHING;

  RETURN updated;
END;
$$;

-- 7. mark_trade_shipped — require destination address, tracking, carrier
CREATE OR REPLACE FUNCTION public.mark_trade_shipped(_trade_id uuid, _tracking text, _carrier text)
RETURNS public.trade_shipments
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  caller uuid := auth.uid();
  ship public.trade_shipments;
  dest_ready boolean;
  other_shipped boolean;
BEGIN
  IF caller IS NULL THEN RAISE EXCEPTION 'Not authenticated'; END IF;
  IF _tracking IS NULL OR length(trim(_tracking)) = 0 THEN RAISE EXCEPTION 'Tracking number required'; END IF;
  IF _carrier  IS NULL OR length(trim(_carrier))  = 0 THEN RAISE EXCEPTION 'Carrier required'; END IF;

  SELECT EXISTS (
    SELECT 1
      FROM public.trade_shipments s
      JOIN public.trade_addresses ta
        ON ta.trade_id = s.trade_id AND ta.user_id = s.recipient_user_id
     WHERE s.trade_id = _trade_id AND s.sender_user_id = caller
  ) INTO dest_ready;

  IF NOT dest_ready THEN
    RAISE EXCEPTION 'Waiting for the other participant to submit their delivery address';
  END IF;

  UPDATE public.trade_shipments
     SET tracking_number = _tracking,
         status = 'shipped',
         shipped_at = COALESCE(shipped_at, now()),
         metadata = COALESCE(metadata,'{}'::jsonb) || jsonb_build_object('carrier', _carrier),
         updated_at = now()
   WHERE trade_id = _trade_id AND sender_user_id = caller
  RETURNING * INTO ship;

  IF ship.id IS NULL THEN RAISE EXCEPTION 'No shipment found for this trade/sender'; END IF;

  SELECT EXISTS (
    SELECT 1 FROM public.trade_shipments s
    WHERE s.trade_id = _trade_id AND s.sender_user_id <> caller
      AND s.status IN ('shipped','delivered')
      AND s.tracking_number IS NOT NULL
  ) INTO other_shipped;

  IF other_shipped THEN
    UPDATE public.trades SET status='shipped', updated_at=now()
     WHERE id = _trade_id AND status='accepted';
  END IF;

  RETURN ship;
END;
$$;

-- 8. Remove broken public view; add safe RPC that returns both parcels
DROP VIEW IF EXISTS public.trade_shipments_public;

CREATE OR REPLACE FUNCTION public.get_trade_shipments(_trade_id uuid)
RETURNS TABLE (
  id uuid,
  sender_user_id uuid,
  recipient_user_id uuid,
  status text,
  tracking_number text,
  carrier text,
  shipped_at timestamptz,
  delivered_at timestamptz
)
LANGUAGE sql
SECURITY DEFINER
STABLE
SET search_path = public
AS $$
  SELECT s.id, s.sender_user_id, s.recipient_user_id, s.status,
         s.tracking_number,
         (s.metadata->>'carrier')::text AS carrier,
         s.shipped_at, s.delivered_at
    FROM public.trade_shipments s
    JOIN public.trades t ON t.id = s.trade_id
   WHERE s.trade_id = _trade_id
     AND auth.uid() IN (t.initiator_user_id, t.recipient_user_id);
$$;
REVOKE ALL ON FUNCTION public.get_trade_shipments(uuid) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.get_trade_shipments(uuid) TO authenticated;

-- 9. submit_trade_address RPC (upsert own address)
CREATE OR REPLACE FUNCTION public.submit_trade_address(_trade_id uuid, _address jsonb)
RETURNS public.trade_addresses
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  caller uuid := auth.uid();
  row_out public.trade_addresses;
BEGIN
  IF caller IS NULL THEN RAISE EXCEPTION 'Not authenticated'; END IF;
  IF _address IS NULL OR jsonb_typeof(_address) <> 'object' THEN
    RAISE EXCEPTION 'Address required';
  END IF;
  IF NOT EXISTS (
    SELECT 1 FROM public.trades t
    WHERE t.id = _trade_id AND caller IN (t.initiator_user_id, t.recipient_user_id)
      AND t.status = 'accepted'
  ) THEN
    RAISE EXCEPTION 'Trade must be accepted to submit an address';
  END IF;

  INSERT INTO public.trade_addresses (trade_id, user_id, address)
    VALUES (_trade_id, caller, _address)
  ON CONFLICT (trade_id, user_id) DO UPDATE
    SET address = EXCLUDED.address, updated_at = now()
  RETURNING * INTO row_out;
  RETURN row_out;
END;
$$;
REVOKE ALL ON FUNCTION public.submit_trade_address(uuid, jsonb) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.submit_trade_address(uuid, jsonb) TO authenticated;

-- 10. get_trade_destination_address — only for the shipment sender
CREATE OR REPLACE FUNCTION public.get_trade_destination_address(_trade_id uuid)
RETURNS jsonb
LANGUAGE plpgsql
STABLE SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  caller uuid := auth.uid();
  dest jsonb;
BEGIN
  IF caller IS NULL THEN RETURN NULL; END IF;
  SELECT ta.address INTO dest
    FROM public.trade_shipments s
    JOIN public.trade_addresses ta
      ON ta.trade_id = s.trade_id AND ta.user_id = s.recipient_user_id
   WHERE s.trade_id = _trade_id AND s.sender_user_id = caller;
  RETURN dest;
END;
$$;
REVOKE ALL ON FUNCTION public.get_trade_destination_address(uuid) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.get_trade_destination_address(uuid) TO authenticated;
