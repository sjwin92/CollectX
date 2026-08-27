-- Deferred seller payout onboarding, part 2: the marketplace_listings insert
-- trigger (marketplace_listing_snapshot) also blocked creating a *sale* listing
-- unless the seller was already Stripe-verified. Part 1 (20260828170000) only
-- covered the buy side and the store side, so a personal seller still could not
-- list a card for sale without onboarding first.
--
-- After: any collection card can be listed for sale immediately. The
-- asking_price > 0 check stays; the charges_enabled check is dropped — payout
-- verification is required at mark_order_shipped time instead.
CREATE OR REPLACE FUNCTION public.marketplace_listing_snapshot()
 RETURNS trigger
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
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

  IF NEW.listing_type = 'trade' THEN
    NEW.asking_price := NULL;
  ELSIF NEW.listing_type = 'sale' THEN
    IF NEW.asking_price IS NULL OR NEW.asking_price <= 0 THEN
      RAISE EXCEPTION 'asking_price must be greater than 0 for sale listings';
    END IF;
    -- (payout-onboarding check removed — enforced at mark_order_shipped instead)
  END IF;

  RETURN NEW;
END;
$function$;
