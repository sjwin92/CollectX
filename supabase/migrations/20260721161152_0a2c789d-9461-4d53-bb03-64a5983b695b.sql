
-- 1) Harden accept_trade
CREATE OR REPLACE FUNCTION public.accept_trade(_trade_id uuid)
RETURNS public.trades
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $fn$
DECLARE
  caller uuid := auth.uid();
  trade_row public.trades;
  listing_id uuid;
  listing public.marketplace_listings;
  listed_card public.user_cards;
  offered_ids uuid[];
  offered_id uuid;
  seen_ids uuid[] := ARRAY[]::uuid[];
  involved_ids uuid[];
  card_row public.user_cards;
  conflict_count int;
BEGIN
  IF caller IS NULL THEN RAISE EXCEPTION 'Not authenticated'; END IF;

  -- Lock the trade row first
  SELECT * INTO trade_row FROM public.trades
    WHERE id = _trade_id
    FOR UPDATE;
  IF trade_row.id IS NULL THEN RAISE EXCEPTION 'Trade not found'; END IF;
  IF trade_row.recipient_user_id <> caller THEN
    RAISE EXCEPTION 'Only the recipient can accept this trade';
  END IF;
  IF trade_row.status <> 'proposed' THEN
    RAISE EXCEPTION 'Trade is no longer proposed';
  END IF;

  listing_id := (trade_row.metadata->>'listing_id')::uuid;
  IF listing_id IS NULL THEN
    RAISE EXCEPTION 'Trade has no linked listing';
  END IF;

  -- Lock the linked listing row
  SELECT * INTO listing FROM public.marketplace_listings
    WHERE id = listing_id
    FOR UPDATE;
  IF listing.id IS NULL THEN RAISE EXCEPTION 'Listing not found'; END IF;
  IF listing.status <> 'active' THEN
    RAISE EXCEPTION 'Listing is no longer available';
  END IF;
  IF listing.user_id <> trade_row.recipient_user_id THEN
    RAISE EXCEPTION 'Listing owner mismatch';
  END IF;
  IF listing.user_card_id IS NULL THEN
    RAISE EXCEPTION 'Listing is no longer backed by a tradable collection card';
  END IF;

  -- Lock and revalidate the listed (recipient's) card
  SELECT * INTO listed_card FROM public.user_cards
    WHERE id = listing.user_card_id
    FOR UPDATE;
  IF listed_card.id IS NULL
     OR listed_card.user_id <> listing.user_id
     OR listed_card.for_trade = false
     OR listed_card.card_id <> listing.card_id THEN
    RAISE EXCEPTION 'Listing is no longer backed by a tradable collection card';
  END IF;

  -- Extract offered user_card_ids from the server-recorded initiator_cards
  IF jsonb_typeof(trade_row.initiator_cards) <> 'array'
     OR jsonb_array_length(trade_row.initiator_cards) = 0 THEN
    RAISE EXCEPTION 'Trade has no offered cards';
  END IF;

  SELECT array_agg((elem->>'user_card_id')::uuid ORDER BY (elem->>'user_card_id'))
    INTO offered_ids
    FROM jsonb_array_elements(trade_row.initiator_cards) AS elem;

  IF offered_ids IS NULL OR array_length(offered_ids, 1) IS NULL THEN
    RAISE EXCEPTION 'Offered cards missing user_card_id';
  END IF;

  -- Reject nulls and duplicates
  FOREACH offered_id IN ARRAY offered_ids LOOP
    IF offered_id IS NULL THEN
      RAISE EXCEPTION 'Invalid offered card reference';
    END IF;
    IF offered_id = ANY(seen_ids) THEN
      RAISE EXCEPTION 'Duplicate offered card in trade';
    END IF;
    seen_ids := array_append(seen_ids, offered_id);
  END LOOP;

  -- Lock every offered user_cards row in deterministic (sorted) order
  FOREACH offered_id IN ARRAY offered_ids LOOP
    SELECT * INTO card_row FROM public.user_cards
      WHERE id = offered_id
      FOR UPDATE;
    IF card_row.id IS NULL THEN
      RAISE EXCEPTION 'Offered card is no longer available';
    END IF;
    IF card_row.user_id <> trade_row.initiator_user_id THEN
      RAISE EXCEPTION 'Offered card is not owned by the initiator';
    END IF;
    IF card_row.for_trade = false THEN
      RAISE EXCEPTION 'Offered card is no longer marked for trade';
    END IF;
  END LOOP;

  -- Build the full involved id list (offered + listed)
  involved_ids := offered_ids || ARRAY[listed_card.id]::uuid[];

  -- Reject if any involved user_card_id is committed to another live trade
  SELECT count(*) INTO conflict_count
    FROM public.trades t,
         LATERAL (
           SELECT (e->>'user_card_id')::uuid AS uc_id
             FROM jsonb_array_elements(t.initiator_cards) e
           UNION ALL
           SELECT (e->>'user_card_id')::uuid
             FROM jsonb_array_elements(t.recipient_cards) e
         ) x
   WHERE t.id <> trade_row.id
     AND t.status IN ('accepted','shipped','disputed')
     AND x.uc_id = ANY(involved_ids);
  IF conflict_count > 0 THEN
    RAISE EXCEPTION 'One or more cards are already committed to another live trade';
  END IF;

  -- Reserve every involved user_cards row
  UPDATE public.user_cards
     SET for_trade = false, updated_at = now()
   WHERE id = ANY(involved_ids);

  -- Flip listing to pending
  UPDATE public.marketplace_listings
     SET status = 'pending', updated_at = now()
   WHERE id = listing_id;

  -- Accept the trade
  UPDATE public.trades
     SET status = 'accepted', accepted_at = now(), updated_at = now()
   WHERE id = _trade_id
  RETURNING * INTO trade_row;

  -- Ensure exactly two shipment rows (idempotent)
  INSERT INTO public.trade_shipments (trade_id, sender_user_id, recipient_user_id, status)
  VALUES
    (trade_row.id, trade_row.initiator_user_id, trade_row.recipient_user_id, 'pending'),
    (trade_row.id, trade_row.recipient_user_id, trade_row.initiator_user_id, 'pending')
  ON CONFLICT (trade_id, sender_user_id) DO NOTHING;

  -- Cancel other proposed trades touching any newly reserved card
  UPDATE public.trades t
     SET status = 'cancelled',
         cancelled_at = now(),
         updated_at = now()
   WHERE t.status = 'proposed'
     AND t.id <> trade_row.id
     AND EXISTS (
       SELECT 1
         FROM (
           SELECT (e->>'user_card_id')::uuid AS uc_id
             FROM jsonb_array_elements(t.initiator_cards) e
           UNION ALL
           SELECT (e->>'user_card_id')::uuid
             FROM jsonb_array_elements(t.recipient_cards) e
         ) y
        WHERE y.uc_id = ANY(involved_ids)
     );

  -- Cancel other active listings backed by any newly reserved offered card
  UPDATE public.marketplace_listings ml
     SET status = 'cancelled', updated_at = now()
   WHERE ml.status = 'active'
     AND ml.id <> listing_id
     AND ml.user_card_id = ANY(offered_ids);

  RETURN trade_row;
END;
$fn$;

-- 2) Harden mark_trade_shipped
CREATE OR REPLACE FUNCTION public.mark_trade_shipped(_trade_id uuid, _tracking text, _carrier text)
RETURNS public.trade_shipments
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $fn$
DECLARE
  caller uuid := auth.uid();
  trade_row public.trades;
  ship public.trade_shipments;
  dest_ready boolean;
  other_shipped boolean;
  t_track text;
  t_carrier text;
BEGIN
  IF caller IS NULL THEN RAISE EXCEPTION 'Not authenticated'; END IF;

  t_track   := trim(coalesce(_tracking, ''));
  t_carrier := trim(coalesce(_carrier, ''));
  IF t_track = ''   THEN RAISE EXCEPTION 'Tracking number required'; END IF;
  IF t_carrier = '' THEN RAISE EXCEPTION 'Carrier required'; END IF;
  IF length(t_track)   > 100 THEN RAISE EXCEPTION 'Tracking number is too long'; END IF;
  IF length(t_carrier) > 80  THEN RAISE EXCEPTION 'Carrier name is too long'; END IF;

  SELECT * INTO trade_row FROM public.trades
    WHERE id = _trade_id
    FOR UPDATE;
  IF trade_row.id IS NULL THEN RAISE EXCEPTION 'Trade not found'; END IF;
  IF caller NOT IN (trade_row.initiator_user_id, trade_row.recipient_user_id) THEN
    RAISE EXCEPTION 'Not a participant';
  END IF;
  IF trade_row.status <> 'accepted' THEN
    RAISE EXCEPTION 'Trade must be in the accepted state to record a shipment';
  END IF;

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
     SET tracking_number = t_track,
         status = 'shipped',
         shipped_at = COALESCE(shipped_at, now()),
         metadata = COALESCE(metadata,'{}'::jsonb) || jsonb_build_object('carrier', t_carrier),
         updated_at = now()
   WHERE trade_id = _trade_id
     AND sender_user_id = caller
     AND status = 'pending'
  RETURNING * INTO ship;

  IF ship.id IS NULL THEN
    RAISE EXCEPTION 'Your shipment is not pending or has already been recorded';
  END IF;

  SELECT EXISTS (
    SELECT 1 FROM public.trade_shipments s
    WHERE s.trade_id = _trade_id
      AND s.sender_user_id <> caller
      AND s.status IN ('shipped','delivered')
      AND s.tracking_number IS NOT NULL
  ) INTO other_shipped;

  IF other_shipped THEN
    UPDATE public.trades SET status='shipped', updated_at=now()
     WHERE id = _trade_id AND status='accepted';
  END IF;

  RETURN ship;
END;
$fn$;

-- 3) Harden open_trade_dispute
CREATE OR REPLACE FUNCTION public.open_trade_dispute(_trade_id uuid, _reason text)
RETURNS public.trades
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $fn$
DECLARE
  t public.trades;
  reason_clean text;
BEGIN
  reason_clean := trim(coalesce(_reason, ''));
  IF reason_clean = '' THEN
    RAISE EXCEPTION 'A reason is required to open a dispute';
  END IF;
  IF length(reason_clean) > 2000 THEN
    RAISE EXCEPTION 'Dispute reason is too long';
  END IF;

  UPDATE public.trades
     SET status = 'disputed',
         metadata = COALESCE(metadata, '{}'::jsonb) || jsonb_build_object(
           'dispute', jsonb_build_object(
             'opened_by', auth.uid(),
             'opened_at', now(),
             'reason', reason_clean
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
$fn$;
