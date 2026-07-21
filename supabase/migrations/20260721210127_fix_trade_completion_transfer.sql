-- PostgreSQL 17 completion fix (version recorded by Supabase). The former `uid`
-- variable conflicted with an `unnest` column alias. Use an explicit card
-- reference alias so the
-- second receipt can complete the trade and record both ownership transfers.

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

  -- Only proceed to completion when both sides have confirmed and the trade
  -- is still in the shipped state.
  IF t.initiator_confirmed_at IS NULL
     OR t.recipient_confirmed_at IS NULL
     OR t.status <> 'shipped' THEN
    RETURN t;
  END IF;

  SELECT COALESCE(array_agg((entry->>'user_card_id')::uuid), ARRAY[]::uuid[])
    INTO init_ids
    FROM jsonb_array_elements(
           CASE WHEN jsonb_typeof(t.initiator_cards) = 'array'
                THEN t.initiator_cards ELSE '[]'::jsonb END
         ) AS entry
   WHERE (entry->>'user_card_id') ~ '^[0-9a-fA-F-]{36}$';

  SELECT COALESCE(array_agg((entry->>'user_card_id')::uuid), ARRAY[]::uuid[])
    INTO recp_ids
    FROM jsonb_array_elements(
           CASE WHEN jsonb_typeof(t.recipient_cards) = 'array'
                THEN t.recipient_cards ELSE '[]'::jsonb END
         ) AS entry
   WHERE (entry->>'user_card_id') ~ '^[0-9a-fA-F-]{36}$';

  IF array_length(init_ids, 1) IS NULL OR array_length(recp_ids, 1) IS NULL THEN
    RAISE EXCEPTION 'Trade snapshots are missing card references';
  END IF;

  SELECT array_agg(card_id ORDER BY card_id)
    INTO all_ids
    FROM (
      SELECT DISTINCT unnest(init_ids || recp_ids) AS card_id
    ) AS involved_cards;

  -- Lock all involved collection rows in a deterministic order.
  PERFORM 1
    FROM (
      SELECT id
        FROM public.user_cards
       WHERE id = ANY(all_ids)
       ORDER BY id
       FOR UPDATE
    ) AS locked_cards;

  SELECT count(*)
    INTO ok_count
    FROM public.user_cards
   WHERE id = ANY(init_ids)
     AND user_id = t.initiator_user_id
     AND for_trade = false;
  IF ok_count <> array_length(init_ids, 1) THEN
    RAISE EXCEPTION 'Initiator cards are no longer reserved or owned';
  END IF;

  SELECT count(*)
    INTO ok_count
    FROM public.user_cards
   WHERE id = ANY(recp_ids)
     AND user_id = t.recipient_user_id
     AND for_trade = false;
  IF ok_count <> array_length(recp_ids, 1) THEN
    RAISE EXCEPTION 'Recipient cards are no longer reserved or owned';
  END IF;

  listing_id := (t.metadata->>'listing_id')::uuid;
  IF listing_id IS NOT NULL THEN
    UPDATE public.marketplace_listings
       SET status = 'completed', updated_at = now()
     WHERE id = listing_id
       AND status IN ('pending', 'active');
  END IF;

  INSERT INTO public.trade_ownership_transfers (
    trade_id,
    user_card_id,
    from_user_id,
    to_user_id
  )
  SELECT
    t.id,
    card_ref.user_card_id,
    t.initiator_user_id,
    t.recipient_user_id
  FROM unnest(init_ids) AS card_ref(user_card_id)
  ON CONFLICT (trade_id, user_card_id) DO NOTHING;

  INSERT INTO public.trade_ownership_transfers (
    trade_id,
    user_card_id,
    from_user_id,
    to_user_id
  )
  SELECT
    t.id,
    card_ref.user_card_id,
    t.recipient_user_id,
    t.initiator_user_id
  FROM unnest(recp_ids) AS card_ref(user_card_id)
  ON CONFLICT (trade_id, user_card_id) DO NOTHING;

  UPDATE public.user_cards
     SET user_id = t.recipient_user_id,
         for_trade = false,
         for_sale = false,
         updated_at = now()
   WHERE id = ANY(init_ids);

  UPDATE public.user_cards
     SET user_id = t.initiator_user_id,
         for_trade = false,
         for_sale = false,
         updated_at = now()
   WHERE id = ANY(recp_ids);

  UPDATE public.card_images
     SET user_id = t.recipient_user_id
   WHERE user_card_id = ANY(init_ids);

  UPDATE public.card_images
     SET user_id = t.initiator_user_id
   WHERE user_card_id = ANY(recp_ids);

  UPDATE public.trades
     SET status = 'completed',
         completed_at = now(),
         updated_at = now()
   WHERE id = _trade_id
     AND status = 'shipped'
  RETURNING * INTO t;

  UPDATE public.profiles
     SET total_trades = total_trades + 1,
         successful_trades = successful_trades + 1,
         updated_at = now()
   WHERE user_id IN (t.initiator_user_id, t.recipient_user_id);

  RETURN t;
END;
$function$;

REVOKE ALL ON FUNCTION public.confirm_trade_receipt(uuid) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.confirm_trade_receipt(uuid) TO authenticated;
