
-- ============================================================
-- 1. Marketplace: trade-only normalization + snapshot trigger
-- ============================================================

-- Normalize legacy rows to trade-only, clear any asking_price
UPDATE public.marketplace_listings
   SET listing_type = 'trade',
       asking_price = NULL
 WHERE listing_type <> 'trade' OR asking_price IS NOT NULL;

-- Deduplicate: keep newest active/pending per user_card_id, cancel the rest
WITH ranked AS (
  SELECT id,
         row_number() OVER (
           PARTITION BY user_card_id
           ORDER BY (status = 'pending') DESC, created_at DESC
         ) AS rn
    FROM public.marketplace_listings
   WHERE status IN ('active','pending')
)
UPDATE public.marketplace_listings ml
   SET status = 'cancelled', updated_at = now()
  FROM ranked r
 WHERE ml.id = r.id AND r.rn > 1;

-- Constrain listing_type to 'trade'
ALTER TABLE public.marketplace_listings DROP CONSTRAINT IF EXISTS marketplace_listings_listing_type_check;
ALTER TABLE public.marketplace_listings
  ADD CONSTRAINT marketplace_listings_listing_type_check
  CHECK (listing_type = 'trade');

-- Partial unique index: one active/pending listing per user_card_id
DROP INDEX IF EXISTS uniq_active_listing_per_user_card;
CREATE UNIQUE INDEX uniq_active_listing_per_user_card
  ON public.marketplace_listings (user_card_id)
  WHERE status IN ('active','pending');

-- Snapshot trigger: source identity from user_cards; forbid link mutation
CREATE OR REPLACE FUNCTION public.marketplace_listing_snapshot()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE uc public.user_cards;
BEGIN
  IF TG_OP = 'UPDATE' THEN
    IF NEW.user_id <> OLD.user_id THEN
      RAISE EXCEPTION 'user_id is immutable on marketplace_listings';
    END IF;
    IF NEW.user_card_id IS DISTINCT FROM OLD.user_card_id THEN
      RAISE EXCEPTION 'user_card_id is immutable on marketplace_listings';
    END IF;
  END IF;

  IF NEW.user_card_id IS NULL THEN
    RAISE EXCEPTION 'user_card_id is required';
  END IF;

  SELECT * INTO uc FROM public.user_cards WHERE id = NEW.user_card_id;
  IF uc.id IS NULL THEN
    RAISE EXCEPTION 'Linked collection card not found';
  END IF;
  IF uc.user_id <> NEW.user_id THEN
    RAISE EXCEPTION 'Collection card is not owned by listing user';
  END IF;

  -- Trusted snapshot (overrides any client-supplied identity fields)
  NEW.card_id         := uc.card_id;
  NEW.card_name       := COALESCE(uc.card_name, '');
  NEW.image_url       := uc.card_image;
  NEW.image_url_small := uc.card_image;
  NEW.set_id          := uc.set_id;
  NEW.set_name        := uc.set_name;
  NEW.card_number     := uc.card_number;
  NEW.rarity          := uc.rarity;
  NEW.condition       := COALESCE(uc.condition, 'near_mint');
  NEW.is_graded       := uc.is_graded;
  NEW.grade_company   := uc.grading_company;
  NEW.grade_score     := CASE
                            WHEN uc.grade_score IS NULL OR uc.grade_score = '' THEN NULL
                            ELSE NULLIF(regexp_replace(uc.grade_score, '[^0-9.]', '', 'g'), '')::numeric
                          END;
  NEW.quantity        := GREATEST(uc.quantity, 1);

  -- Trade-only enforcement
  NEW.listing_type := 'trade';
  NEW.asking_price := NULL;

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_marketplace_listing_snapshot ON public.marketplace_listings;
CREATE TRIGGER trg_marketplace_listing_snapshot
  BEFORE INSERT OR UPDATE ON public.marketplace_listings
  FOR EACH ROW EXECUTE FUNCTION public.marketplace_listing_snapshot();

-- ============================================================
-- 2. user_cards: block mutation/deletion while reserved in a live trade
-- ============================================================

CREATE OR REPLACE FUNCTION public.user_card_locked_in_live_trade(_user_card_id uuid)
RETURNS boolean
LANGUAGE sql
STABLE SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1
      FROM public.trades t,
           LATERAL (
             SELECT (e->>'user_card_id') AS uc_id
               FROM jsonb_array_elements(
                      CASE WHEN jsonb_typeof(t.initiator_cards) = 'array'
                           THEN t.initiator_cards ELSE '[]'::jsonb END
                    ) e
             UNION ALL
             SELECT (e->>'user_card_id')
               FROM jsonb_array_elements(
                      CASE WHEN jsonb_typeof(t.recipient_cards) = 'array'
                           THEN t.recipient_cards ELSE '[]'::jsonb END
                    ) e
           ) x
     WHERE t.status IN ('accepted','shipped','disputed')
       AND x.uc_id = _user_card_id::text
  );
$$;

DROP POLICY IF EXISTS "Users can update their own cards" ON public.user_cards;
CREATE POLICY "Users can update their own cards" ON public.user_cards
  FOR UPDATE
  USING (auth.uid() = user_id AND NOT public.user_card_locked_in_live_trade(id))
  WITH CHECK (auth.uid() = user_id AND NOT public.user_card_locked_in_live_trade(id));

DROP POLICY IF EXISTS "Users can delete their own cards" ON public.user_cards;
CREATE POLICY "Users can delete their own cards" ON public.user_cards
  FOR DELETE
  USING (auth.uid() = user_id AND NOT public.user_card_locked_in_live_trade(id));

-- ============================================================
-- 3. propose_trade: snapshot real quantities
-- ============================================================

CREATE OR REPLACE FUNCTION public.propose_trade(_listing_id uuid, _offered_user_card_ids uuid[], _message text DEFAULT NULL::text)
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

  SELECT * INTO listed_card
    FROM public.user_cards
   WHERE id = listing.user_card_id
     AND user_id = listing.user_id
     AND for_trade = true
     AND card_id = listing.card_id;
  IF listed_card.id IS NULL THEN
    RAISE EXCEPTION 'Listing is no longer backed by a tradable collection card';
  END IF;

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
    'quantity', GREATEST(uc.quantity, 1),
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
    'quantity', GREATEST(listed_card.quantity, 1),
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

-- ============================================================
-- 4. Ownership-transfer audit table
-- ============================================================

CREATE TABLE IF NOT EXISTS public.trade_ownership_transfers (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  trade_id uuid NOT NULL REFERENCES public.trades(id) ON DELETE CASCADE,
  user_card_id uuid NOT NULL,
  from_user_id uuid NOT NULL,
  to_user_id uuid NOT NULL,
  transferred_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (trade_id, user_card_id)
);

GRANT SELECT ON public.trade_ownership_transfers TO authenticated;
GRANT ALL ON public.trade_ownership_transfers TO service_role;

ALTER TABLE public.trade_ownership_transfers ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Participants can view transfers for their trades" ON public.trade_ownership_transfers;
CREATE POLICY "Participants can view transfers for their trades"
  ON public.trade_ownership_transfers
  FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM public.trades t
       WHERE t.id = trade_ownership_transfers.trade_id
         AND auth.uid() IN (t.initiator_user_id, t.recipient_user_id)
    )
  );

-- No client writes; only SECURITY DEFINER functions can write.

-- ============================================================
-- 5. confirm_trade_receipt: atomic dual-confirm + ownership swap
-- ============================================================

CREATE OR REPLACE FUNCTION public.confirm_trade_receipt(_trade_id uuid)
 RETURNS public.trades
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE
  caller uuid := auth.uid();
  t public.trades;
  listing_id uuid;
  init_ids uuid[];
  recp_ids uuid[];
  all_ids uuid[];
  ok_count int;
  uid uuid;
BEGIN
  IF caller IS NULL THEN RAISE EXCEPTION 'Not authenticated'; END IF;

  SELECT * INTO t FROM public.trades WHERE id = _trade_id FOR UPDATE;
  IF t.id IS NULL THEN RAISE EXCEPTION 'Trade not found'; END IF;
  IF caller NOT IN (t.initiator_user_id, t.recipient_user_id) THEN
    RAISE EXCEPTION 'Not a participant';
  END IF;
  IF t.status <> 'shipped' THEN
    RAISE EXCEPTION 'Trade must be shipped before confirming receipt';
  END IF;

  IF caller = t.initiator_user_id THEN
    IF t.initiator_confirmed_at IS NULL THEN
      UPDATE public.trades
         SET initiator_confirmed_at = now(), updated_at = now()
       WHERE id = _trade_id
      RETURNING * INTO t;
    END IF;
  ELSE
    IF t.recipient_confirmed_at IS NULL THEN
      UPDATE public.trades
         SET recipient_confirmed_at = now(), updated_at = now()
       WHERE id = _trade_id
      RETURNING * INTO t;
    END IF;
  END IF;

  -- Only proceed to completion when both sides have confirmed and still 'shipped'
  IF t.initiator_confirmed_at IS NULL
     OR t.recipient_confirmed_at IS NULL
     OR t.status <> 'shipped' THEN
    RETURN t;
  END IF;

  -- Collect user_card_ids from snapshots (text->uuid)
  SELECT COALESCE(array_agg((e->>'user_card_id')::uuid), ARRAY[]::uuid[])
    INTO init_ids
    FROM jsonb_array_elements(
           CASE WHEN jsonb_typeof(t.initiator_cards)='array' THEN t.initiator_cards ELSE '[]'::jsonb END
         ) e
   WHERE (e->>'user_card_id') ~ '^[0-9a-fA-F-]{36}$';

  SELECT COALESCE(array_agg((e->>'user_card_id')::uuid), ARRAY[]::uuid[])
    INTO recp_ids
    FROM jsonb_array_elements(
           CASE WHEN jsonb_typeof(t.recipient_cards)='array' THEN t.recipient_cards ELSE '[]'::jsonb END
         ) e
   WHERE (e->>'user_card_id') ~ '^[0-9a-fA-F-]{36}$';

  IF array_length(init_ids, 1) IS NULL OR array_length(recp_ids, 1) IS NULL THEN
    RAISE EXCEPTION 'Trade snapshots are missing card references';
  END IF;

  SELECT array_agg(x ORDER BY x) INTO all_ids
    FROM (SELECT DISTINCT unnest(init_ids || recp_ids) x) s;

  -- Lock the involved user_cards deterministically
  PERFORM 1 FROM (
    SELECT id FROM public.user_cards WHERE id = ANY(all_ids) ORDER BY id FOR UPDATE
  ) locked;

  -- Validate initiator side is still owned by initiator and reserved
  SELECT count(*) INTO ok_count
    FROM public.user_cards
   WHERE id = ANY(init_ids)
     AND user_id = t.initiator_user_id
     AND for_trade = false;
  IF ok_count <> array_length(init_ids, 1) THEN
    RAISE EXCEPTION 'Initiator cards are no longer reserved or owned';
  END IF;

  SELECT count(*) INTO ok_count
    FROM public.user_cards
   WHERE id = ANY(recp_ids)
     AND user_id = t.recipient_user_id
     AND for_trade = false;
  IF ok_count <> array_length(recp_ids, 1) THEN
    RAISE EXCEPTION 'Recipient cards are no longer reserved or owned';
  END IF;

  -- Mark linked listing completed before ownership change
  listing_id := (t.metadata->>'listing_id')::uuid;
  IF listing_id IS NOT NULL THEN
    UPDATE public.marketplace_listings
       SET status = 'completed', updated_at = now()
     WHERE id = listing_id
       AND status IN ('pending','active');
  END IF;

  -- Record audit rows (idempotent via unique constraint)
  INSERT INTO public.trade_ownership_transfers (trade_id, user_card_id, from_user_id, to_user_id)
    SELECT t.id, uid, t.initiator_user_id, t.recipient_user_id FROM unnest(init_ids) uid
    ON CONFLICT (trade_id, user_card_id) DO NOTHING;
  INSERT INTO public.trade_ownership_transfers (trade_id, user_card_id, from_user_id, to_user_id)
    SELECT t.id, uid, t.recipient_user_id, t.initiator_user_id FROM unnest(recp_ids) uid
    ON CONFLICT (trade_id, user_card_id) DO NOTHING;

  -- Swap ownership; ensure for_trade/for_sale remain false
  UPDATE public.user_cards
     SET user_id = t.recipient_user_id, for_trade = false, for_sale = false, updated_at = now()
   WHERE id = ANY(init_ids);
  UPDATE public.user_cards
     SET user_id = t.initiator_user_id, for_trade = false, for_sale = false, updated_at = now()
   WHERE id = ANY(recp_ids);

  -- Move linked card_images to the new owner
  UPDATE public.card_images
     SET user_id = t.recipient_user_id
   WHERE user_card_id = ANY(init_ids);
  UPDATE public.card_images
     SET user_id = t.initiator_user_id
   WHERE user_card_id = ANY(recp_ids);

  -- Complete the trade
  UPDATE public.trades
     SET status = 'completed', completed_at = now(), updated_at = now()
   WHERE id = _trade_id AND status = 'shipped'
  RETURNING * INTO t;

  -- Increment trade counters once per participant
  UPDATE public.profiles
     SET total_trades = total_trades + 1,
         successful_trades = successful_trades + 1,
         updated_at = now()
   WHERE user_id IN (t.initiator_user_id, t.recipient_user_id);

  RETURN t;
END;
$function$;

-- ============================================================
-- 6. Storage: card-images update/delete tied to card_images ownership
-- ============================================================

CREATE OR REPLACE FUNCTION public.can_manage_card_image_object(_name text)
RETURNS boolean
LANGUAGE sql
STABLE SECURITY DEFINER
SET search_path = public
AS $$
  SELECT
    CASE
      WHEN auth.uid() IS NULL THEN false
      -- If the object is linked to a card_images row, only the current owner may manage it.
      WHEN EXISTS (SELECT 1 FROM public.card_images ci WHERE ci.image_path = _name)
        THEN EXISTS (
          SELECT 1 FROM public.card_images ci
           WHERE ci.image_path = _name
             AND ci.user_id = auth.uid()
        )
      -- Otherwise (unlinked upload) fall back to own-folder rule.
      ELSE (auth.uid())::text = (storage.foldername(_name))[1]
    END;
$$;

DROP POLICY IF EXISTS "Users delete own card-images" ON storage.objects;
CREATE POLICY "Users delete own card-images" ON storage.objects
  FOR DELETE TO authenticated
  USING (bucket_id = 'card-images' AND public.can_manage_card_image_object(name));

DROP POLICY IF EXISTS "Users update own card-images" ON storage.objects;
CREATE POLICY "Users update own card-images" ON storage.objects
  FOR UPDATE TO authenticated
  USING (bucket_id = 'card-images' AND public.can_manage_card_image_object(name));
