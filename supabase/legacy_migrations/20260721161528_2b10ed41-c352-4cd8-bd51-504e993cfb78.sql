
CREATE OR REPLACE FUNCTION public.accept_trade(_trade_id uuid)
RETURNS public.trades
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $fn$
DECLARE
  caller uuid := auth.uid();
  trade_peek public.trades;
  listing_peek public.marketplace_listings;
  trade_row public.trades;
  listing public.marketplace_listings;
  listed_user_card_id uuid;
  listing_id uuid;
  offered_ids uuid[];
  involved_ids uuid[];
  offered_id uuid;
  seen_ids uuid[] := ARRAY[]::uuid[];
  elem jsonb;
  raw_id text;
  uuid_re constant text := '^[0-9a-fA-F]{8}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{12}$';
  locked_count int;
  ok_count int;
  conflict_count int;
BEGIN
  IF caller IS NULL THEN RAISE EXCEPTION 'Not authenticated'; END IF;

  ------------------------------------------------------------------
  -- 1) Non-locking reads to discover the ids we will need to lock.
  ------------------------------------------------------------------
  SELECT * INTO trade_peek FROM public.trades WHERE id = _trade_id;
  IF trade_peek.id IS NULL THEN RAISE EXCEPTION 'Trade not found'; END IF;
  IF trade_peek.recipient_user_id <> caller THEN
    RAISE EXCEPTION 'Only the recipient can accept this trade';
  END IF;
  IF trade_peek.status <> 'proposed' THEN
    RAISE EXCEPTION 'Trade is no longer proposed';
  END IF;

  listing_id := (trade_peek.metadata->>'listing_id')::uuid;
  IF listing_id IS NULL THEN
    RAISE EXCEPTION 'Trade has no linked listing';
  END IF;

  SELECT * INTO listing_peek FROM public.marketplace_listings WHERE id = listing_id;
  IF listing_peek.id IS NULL THEN RAISE EXCEPTION 'Listing not found'; END IF;
  IF listing_peek.user_card_id IS NULL THEN
    RAISE EXCEPTION 'Listing is no longer backed by a tradable collection card';
  END IF;
  listed_user_card_id := listing_peek.user_card_id;

  ------------------------------------------------------------------
  -- 2) Validate initiator_cards element shape and collect offered ids.
  ------------------------------------------------------------------
  IF jsonb_typeof(trade_peek.initiator_cards) <> 'array'
     OR jsonb_array_length(trade_peek.initiator_cards) = 0 THEN
    RAISE EXCEPTION 'Trade has no offered cards';
  END IF;

  offered_ids := ARRAY[]::uuid[];
  FOR elem IN SELECT * FROM jsonb_array_elements(trade_peek.initiator_cards) LOOP
    IF jsonb_typeof(elem) <> 'object' THEN
      RAISE EXCEPTION 'Invalid offered card entry';
    END IF;
    raw_id := elem->>'user_card_id';
    IF raw_id IS NULL OR raw_id !~ uuid_re THEN
      RAISE EXCEPTION 'Offered cards missing or malformed user_card_id';
    END IF;
    offered_id := raw_id::uuid;
    IF offered_id = ANY(seen_ids) THEN
      RAISE EXCEPTION 'Duplicate offered card in trade';
    END IF;
    seen_ids := array_append(seen_ids, offered_id);
    offered_ids := array_append(offered_ids, offered_id);
  END LOOP;

  ------------------------------------------------------------------
  -- 3) Sorted, unique involved_ids (offered + listed).
  ------------------------------------------------------------------
  SELECT array_agg(x ORDER BY x)
    INTO involved_ids
    FROM (SELECT DISTINCT unnest(offered_ids || ARRAY[listed_user_card_id]::uuid[]) AS x) s;

  ------------------------------------------------------------------
  -- 4) Lock ALL involved user_cards base rows in a single ordered query.
  --    This is the global serialization point for concurrent accepts.
  ------------------------------------------------------------------
  PERFORM 1
    FROM (
      SELECT id FROM public.user_cards
       WHERE id = ANY(involved_ids)
       ORDER BY id
       FOR UPDATE
    ) locked;
  GET DIAGNOSTICS locked_count = ROW_COUNT;
  IF locked_count <> array_length(involved_ids, 1) THEN
    RAISE EXCEPTION 'One or more cards are no longer available';
  END IF;

  ------------------------------------------------------------------
  -- 5) Lock the linked listing row.
  ------------------------------------------------------------------
  SELECT * INTO listing FROM public.marketplace_listings
    WHERE id = listing_id
    FOR UPDATE;
  IF listing.id IS NULL THEN RAISE EXCEPTION 'Listing not found'; END IF;

  ------------------------------------------------------------------
  -- 6) Lock the trade row.
  ------------------------------------------------------------------
  SELECT * INTO trade_row FROM public.trades
    WHERE id = _trade_id
    FOR UPDATE;
  IF trade_row.id IS NULL THEN RAISE EXCEPTION 'Trade not found'; END IF;

  ------------------------------------------------------------------
  -- 7) Post-lock re-validation against locked rows.
  ------------------------------------------------------------------
  IF trade_row.recipient_user_id <> caller THEN
    RAISE EXCEPTION 'Only the recipient can accept this trade';
  END IF;
  IF trade_row.status <> 'proposed' THEN
    RAISE EXCEPTION 'Trade is no longer proposed';
  END IF;
  IF (trade_row.metadata->>'listing_id')::uuid <> listing_id THEN
    RAISE EXCEPTION 'Trade listing reference changed';
  END IF;

  IF listing.status <> 'active' THEN
    RAISE EXCEPTION 'Listing is no longer available';
  END IF;
  IF listing.user_id <> trade_row.recipient_user_id THEN
    RAISE EXCEPTION 'Listing owner mismatch';
  END IF;
  IF listing.user_card_id IS DISTINCT FROM listed_user_card_id THEN
    RAISE EXCEPTION 'Listing is no longer backed by the expected collection card';
  END IF;

  -- Listed card is owned by listing owner, still for_trade, matches card_id
  SELECT count(*) INTO ok_count
    FROM public.user_cards
   WHERE id = listed_user_card_id
     AND user_id = listing.user_id
     AND for_trade = true
     AND card_id = listing.card_id;
  IF ok_count <> 1 THEN
    RAISE EXCEPTION 'Listing is no longer backed by a tradable collection card';
  END IF;

  -- Every offered card is owned by the initiator and still for_trade
  SELECT count(*) INTO ok_count
    FROM public.user_cards
   WHERE id = ANY(offered_ids)
     AND user_id = trade_row.initiator_user_id
     AND for_trade = true;
  IF ok_count <> array_length(offered_ids, 1) THEN
    RAISE EXCEPTION 'One or more offered cards are not owned by the initiator or not marked for trade';
  END IF;

  -- Live-trade conflict check across every involved id
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

  ------------------------------------------------------------------
  -- 8) Commit the trade: reserve, flip listing, accept, seed shipments,
  --    cancel competing proposals.
  ------------------------------------------------------------------
  UPDATE public.user_cards
     SET for_trade = false, updated_at = now()
   WHERE id = ANY(involved_ids);

  UPDATE public.marketplace_listings
     SET status = 'pending', updated_at = now()
   WHERE id = listing_id;

  UPDATE public.trades
     SET status = 'accepted', accepted_at = now(), updated_at = now()
   WHERE id = _trade_id
  RETURNING * INTO trade_row;

  INSERT INTO public.trade_shipments (trade_id, sender_user_id, recipient_user_id, status)
  VALUES
    (trade_row.id, trade_row.initiator_user_id, trade_row.recipient_user_id, 'pending'),
    (trade_row.id, trade_row.recipient_user_id, trade_row.initiator_user_id, 'pending')
  ON CONFLICT (trade_id, sender_user_id) DO NOTHING;

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

  ------------------------------------------------------------------
  -- 9) Cancel other active listings backed by ANY involved card,
  --    excluding this trade's linked listing.
  ------------------------------------------------------------------
  UPDATE public.marketplace_listings ml
     SET status = 'cancelled', updated_at = now()
   WHERE ml.status = 'active'
     AND ml.id <> listing_id
     AND ml.user_card_id = ANY(involved_ids);

  RETURN trade_row;
END;
$fn$;
