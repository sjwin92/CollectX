
-- 1. marketplace_listings.user_card_id: NOT NULL (0 rows in prod, safe)
ALTER TABLE public.marketplace_listings
  ALTER COLUMN user_card_id SET NOT NULL;

-- 2. Rebuild listing RLS: require user_card_id ownership + for_trade + card_id match
DROP POLICY IF EXISTS "Users can create their own listings" ON public.marketplace_listings;
DROP POLICY IF EXISTS "Users can update their own listings" ON public.marketplace_listings;

CREATE POLICY "Users can create their own listings"
  ON public.marketplace_listings
  FOR INSERT TO authenticated
  WITH CHECK (
    auth.uid() = user_id
    AND EXISTS (
      SELECT 1 FROM public.user_cards uc
      WHERE uc.id = marketplace_listings.user_card_id
        AND uc.user_id = auth.uid()
        AND uc.for_trade = true
        AND uc.card_id = marketplace_listings.card_id
    )
  );

CREATE POLICY "Users can update their own listings"
  ON public.marketplace_listings
  FOR UPDATE TO authenticated
  USING (auth.uid() = user_id)
  WITH CHECK (
    auth.uid() = user_id
    AND EXISTS (
      SELECT 1 FROM public.user_cards uc
      WHERE uc.id = marketplace_listings.user_card_id
        AND uc.user_id = auth.uid()
        AND uc.for_trade = true
        AND uc.card_id = marketplace_listings.card_id
    )
  );

-- 3. Block direct trade inserts: only propose_trade (SECURITY DEFINER) may create trades
DROP POLICY IF EXISTS "Users can create trades they initiate" ON public.trades;
REVOKE INSERT ON public.trades FROM authenticated;

-- 4. trade_addresses: revoke direct writes, keep SELECT for owner
DROP POLICY IF EXISTS "Owner can insert own address" ON public.trade_addresses;
DROP POLICY IF EXISTS "Owner can update own address" ON public.trade_addresses;
DROP POLICY IF EXISTS "Owner can delete own address" ON public.trade_addresses;
REVOKE INSERT, UPDATE, DELETE ON public.trade_addresses FROM authenticated, anon;

-- 5. Harden submit_trade_address: validate required fields + block after other side shipped
CREATE OR REPLACE FUNCTION public.submit_trade_address(_trade_id uuid, _address jsonb)
RETURNS public.trade_addresses
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
DECLARE
  caller uuid := auth.uid();
  row_out public.trade_addresses;
  full_name text;
  line1 text;
  city text;
  postal_code text;
  country text;
  other uuid;
BEGIN
  IF caller IS NULL THEN RAISE EXCEPTION 'Not authenticated'; END IF;
  IF _address IS NULL OR jsonb_typeof(_address) <> 'object' THEN
    RAISE EXCEPTION 'Address required';
  END IF;

  -- Participant + accepted-state gate
  SELECT CASE WHEN t.initiator_user_id = caller THEN t.recipient_user_id
              WHEN t.recipient_user_id = caller THEN t.initiator_user_id END
    INTO other
    FROM public.trades t
   WHERE t.id = _trade_id
     AND t.status = 'accepted'
     AND caller IN (t.initiator_user_id, t.recipient_user_id);
  IF other IS NULL THEN
    RAISE EXCEPTION 'Trade must be accepted to submit an address';
  END IF;

  -- Field validation
  full_name   := trim(coalesce(_address->>'full_name',''));
  line1       := trim(coalesce(_address->>'line1',''));
  city        := trim(coalesce(_address->>'city',''));
  postal_code := trim(coalesce(_address->>'postal_code',''));
  country     := trim(coalesce(_address->>'country',''));
  IF full_name = '' OR line1 = '' OR city = '' OR postal_code = '' OR country = '' THEN
    RAISE EXCEPTION 'Address must include full_name, line1, city, postal_code and country';
  END IF;
  IF length(full_name) > 200 OR length(line1) > 300 OR length(city) > 120
     OR length(postal_code) > 40 OR length(country) > 80 THEN
    RAISE EXCEPTION 'Address field too long';
  END IF;

  -- Block changes after the other party's outgoing parcel to caller has shipped
  IF EXISTS (
    SELECT 1 FROM public.trade_shipments s
     WHERE s.trade_id = _trade_id
       AND s.sender_user_id = other
       AND s.recipient_user_id = caller
       AND s.status IN ('shipped','delivered')
  ) THEN
    RAISE EXCEPTION 'Address is locked: the other participant has already shipped to you';
  END IF;

  INSERT INTO public.trade_addresses (trade_id, user_id, address)
    VALUES (_trade_id, caller, _address)
  ON CONFLICT (trade_id, user_id) DO UPDATE
    SET address = EXCLUDED.address, updated_at = now()
  RETURNING * INTO row_out;
  RETURN row_out;
END;
$function$;

-- 6. Harden propose_trade: require valid user_card_id on the listing, snapshot from user_cards
CREATE OR REPLACE FUNCTION public.propose_trade(
  _listing_id uuid,
  _offered_user_card_ids uuid[],
  _message text DEFAULT NULL
)
RETURNS public.trades
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
DECLARE
  caller uuid := auth.uid();
  listing public.marketplace_listings;
  listed_card public.user_cards;
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
  IF listing.user_card_id IS NULL THEN
    RAISE EXCEPTION 'Listing is no longer backed by a tradable collection card';
  END IF;

  -- Recipient side: verify the listed user_cards row is still owned, tradable, matches card_id
  SELECT * INTO listed_card
    FROM public.user_cards
   WHERE id = listing.user_card_id
     AND user_id = listing.user_id
     AND for_trade = true
     AND card_id = listing.card_id;
  IF listed_card.id IS NULL THEN
    RAISE EXCEPTION 'Listing is no longer backed by a tradable collection card';
  END IF;

  -- Offered side: caller must own each offered user_cards row and it must be tradable
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
    'id', listed_card.card_id,
    'listing_id', listing.id,
    'user_card_id', listed_card.id,
    'card_name', listed_card.card_name,
    'imageUrl', listed_card.card_image,
    'condition', COALESCE(listed_card.condition,'near_mint'),
    'estimatedValue', COALESCE(listed_card.trade_value::text,'0'),
    'quantity', 1,
    'graded', listed_card.is_graded,
    'grading_company', listed_card.grading_company,
    'grade_score', listed_card.grade_score
  ));

  INSERT INTO public.trades (
    initiator_user_id, recipient_user_id, status,
    initiator_cards, recipient_cards, description, metadata
  ) VALUES (
    caller, listing.user_id, 'proposed',
    offered_cards, recipient_snapshot,
    NULLIF(trim(coalesce(_message,'')),''),
    jsonb_build_object('listing_id', listing.id, 'user_card_id', listed_card.id)
  ) RETURNING * INTO trade_row;

  RETURN trade_row;
END;
$function$;

-- 7. accept_trade: lock listing FOR UPDATE, re-validate, mark listing pending
CREATE OR REPLACE FUNCTION public.accept_trade(_trade_id uuid)
RETURNS public.trades
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
DECLARE
  updated public.trades;
  listing_id uuid;
  listing public.marketplace_listings;
BEGIN
  -- Load & authorize
  SELECT * INTO updated FROM public.trades
    WHERE id = _trade_id AND status = 'proposed' AND recipient_user_id = auth.uid();
  IF updated.id IS NULL THEN
    RAISE EXCEPTION 'Cannot accept trade: not recipient or not in proposed state';
  END IF;

  listing_id := (updated.metadata->>'listing_id')::uuid;
  IF listing_id IS NULL THEN
    RAISE EXCEPTION 'Trade has no linked listing';
  END IF;

  -- Lock listing row to prevent double-accept race
  SELECT * INTO listing
    FROM public.marketplace_listings
   WHERE id = listing_id
   FOR UPDATE;
  IF listing.id IS NULL THEN
    RAISE EXCEPTION 'Listing not found';
  END IF;
  IF listing.status <> 'active' THEN
    RAISE EXCEPTION 'Listing is no longer available';
  END IF;
  IF listing.user_id <> updated.recipient_user_id THEN
    RAISE EXCEPTION 'Listing owner mismatch';
  END IF;
  IF listing.user_card_id IS NULL
     OR NOT EXISTS (
       SELECT 1 FROM public.user_cards uc
        WHERE uc.id = listing.user_card_id
          AND uc.user_id = listing.user_id
          AND uc.for_trade = true
          AND uc.card_id = listing.card_id
     ) THEN
    RAISE EXCEPTION 'Listing is no longer backed by a tradable collection card';
  END IF;

  -- Flip listing to pending (blocks other proposals from being accepted)
  UPDATE public.marketplace_listings
     SET status = 'pending', updated_at = now()
   WHERE id = listing_id;

  -- Accept the trade
  UPDATE public.trades
     SET status = 'accepted', accepted_at = now(), updated_at = now()
   WHERE id = _trade_id
  RETURNING * INTO updated;

  -- Ensure shipment placeholders exist idempotently
  INSERT INTO public.trade_shipments (trade_id, sender_user_id, recipient_user_id, status)
  VALUES
    (updated.id, updated.initiator_user_id, updated.recipient_user_id, 'pending'),
    (updated.id, updated.recipient_user_id, updated.initiator_user_id, 'pending')
  ON CONFLICT (trade_id, sender_user_id) DO NOTHING;

  RETURN updated;
END;
$function$;

-- 8. confirm_trade_receipt: on completion mark listing completed
CREATE OR REPLACE FUNCTION public.confirm_trade_receipt(_trade_id uuid)
RETURNS public.trades
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
DECLARE
  t public.trades;
  listing_id uuid;
BEGIN
  SELECT * INTO t FROM public.trades WHERE id = _trade_id;
  IF t.id IS NULL THEN RAISE EXCEPTION 'Trade not found'; END IF;
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

  SELECT * INTO t FROM public.trades WHERE id = _trade_id;
  IF t.initiator_confirmed_at IS NOT NULL
     AND t.recipient_confirmed_at IS NOT NULL
     AND t.status = 'shipped' THEN
    UPDATE public.trades
       SET status = 'completed', completed_at = now(), updated_at = now()
     WHERE id = _trade_id
    RETURNING * INTO t;

    UPDATE public.profiles
       SET total_trades = total_trades + 1,
           successful_trades = successful_trades + 1,
           updated_at = now()
     WHERE user_id IN (t.initiator_user_id, t.recipient_user_id);

    listing_id := (t.metadata->>'listing_id')::uuid;
    IF listing_id IS NOT NULL THEN
      UPDATE public.marketplace_listings
         SET status = 'completed', updated_at = now()
       WHERE id = listing_id
         AND status IN ('pending','active');
    END IF;
  END IF;

  RETURN t;
END;
$function$;
