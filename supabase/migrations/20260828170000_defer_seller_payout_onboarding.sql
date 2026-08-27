-- Defer seller payout onboarding (Stripe Connect Express).
--
-- Before: a buyer could not create an order at all unless the seller had
-- completed Stripe onboarding (charges_enabled = true). That put a ~2-minute
-- identity check in front of every seller before they had even made a sale.
--
-- After: sellers list and sell freely. The onboarding check moves to the point
-- it is actually needed — marking an order shipped — so a seller verifies only
-- once they have a real sale to fulfil ("verify when you cash out"). The
-- buyer's money is held by the platform either way, and if a seller never
-- verifies the buyer can open a dispute on the paid_held order for a refund
-- (unchanged).
--
-- Payout release (releaseOrderPayout / releaseStoreOrderPayout) already fails
-- safe: stripe.transfers.create to an unverified account errors and is caught,
-- so no extra guard is needed there.

-- 1. create_store_order — drop the upfront charges_enabled gate.
CREATE OR REPLACE FUNCTION public.create_store_order(_inventory_id uuid, _quantity integer, _buyer_user_id uuid)
 RETURNS store_orders
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE
  inv public.store_inventory;
  sp public.store_profiles;
  fee_cfg public.marketplace_fee_config;
  fee_override public.account_fee_overrides;
  qty int := GREATEST(COALESCE(_quantity, 1), 1);
  seller_fee_bps int;
  buyer_fee_bps int;
  unit_amt numeric(12,2);
  item_amt numeric(12,2);
  buyer_fee numeric(12,2);
  seller_fee numeric(12,2);
  total_amt numeric(12,2);
  payout_amt numeric(12,2);
  o public.store_orders;
BEGIN
  IF _buyer_user_id IS NULL THEN RAISE EXCEPTION 'buyer required'; END IF;

  SELECT * INTO inv FROM public.store_inventory WHERE id = _inventory_id FOR UPDATE;
  IF inv.id IS NULL THEN RAISE EXCEPTION 'SKU not found'; END IF;
  IF NOT inv.listed OR inv.price_gbp IS NULL THEN
    RAISE EXCEPTION 'This item is not for sale';
  END IF;
  IF inv.quantity - inv.reserved < qty THEN
    RAISE EXCEPTION 'Not enough stock — % available', GREATEST(inv.quantity - inv.reserved, 0);
  END IF;
  IF _buyer_user_id = inv.store_id THEN
    RAISE EXCEPTION 'You cannot buy from your own store';
  END IF;

  SELECT * INTO sp FROM public.store_profiles WHERE user_id = inv.store_id;
  IF sp.user_id IS NULL OR sp.status <> 'active' THEN
    RAISE EXCEPTION 'This store is not open for orders';
  END IF;

  -- (payout-onboarding check removed — see mark_store_order_shipped)

  SELECT * INTO fee_cfg FROM public.marketplace_fee_config WHERE id = 1;
  SELECT * INTO fee_override FROM public.account_fee_overrides WHERE user_id = inv.store_id;

  seller_fee_bps := COALESCE(fee_override.seller_fee_bps, fee_cfg.seller_fee_bps);
  buyer_fee_bps  := COALESCE(fee_override.buyer_protection_fee_bps, fee_cfg.buyer_protection_fee_bps);

  unit_amt  := inv.price_gbp;
  item_amt  := round(unit_amt * qty, 2);
  buyer_fee := round(item_amt * buyer_fee_bps / 10000.0 + fee_cfg.buyer_protection_fee_fixed, 2);
  seller_fee := round(item_amt * seller_fee_bps / 10000.0, 2);
  total_amt := round(item_amt + buyer_fee, 2);
  payout_amt := round(item_amt - seller_fee, 2);

  -- Reserve the stock. Concurrency-safe: the row is locked FOR UPDATE above,
  -- so a second checkout blocks here and re-reads the updated `reserved`.
  UPDATE public.store_inventory
     SET reserved = reserved + qty, updated_at = now()
   WHERE id = _inventory_id;

  INSERT INTO public.store_orders (
    inventory_id, store_id, buyer_user_id, quantity,
    unit_amount, item_amount, buyer_fee_amount, seller_fee_amount,
    total_charged_amount, seller_payout_amount, currency,
    card_id, card_name, image_url, set_id, set_name, card_number, rarity,
    condition, is_graded, grade_company, grade_score
  ) VALUES (
    inv.id, inv.store_id, _buyer_user_id, qty,
    unit_amt, item_amt, buyer_fee, seller_fee,
    total_amt, payout_amt, 'gbp',
    inv.card_id, inv.card_name, inv.image_url, inv.set_id, inv.set_name, inv.card_number, inv.rarity,
    inv.condition, inv.is_graded, inv.grade_company, inv.grade_score
  )
  RETURNING * INTO o;

  RETURN o;
END;
$function$;

-- 2. mark_order_shipped — the seller must have a verified payout account before
--    they can fulfil an order (this is the point onboarding is actually needed).
CREATE OR REPLACE FUNCTION public.mark_order_shipped(_order_id uuid, _tracking text, _carrier text)
 RETURNS order_shipments
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE
  caller uuid := auth.uid();
  o public.orders;
  ship public.order_shipments;
  dest_ready boolean;
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

  SELECT * INTO o FROM public.orders WHERE id = _order_id FOR UPDATE;
  IF o.id IS NULL THEN RAISE EXCEPTION 'Order not found'; END IF;
  IF caller <> o.seller_user_id THEN RAISE EXCEPTION 'Only the seller can mark an order shipped'; END IF;
  IF o.status <> 'paid_held' THEN
    RAISE EXCEPTION 'Order must be paid before it can be shipped';
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM public.seller_stripe_accounts
     WHERE user_id = o.seller_user_id AND charges_enabled = true
  ) THEN
    RAISE EXCEPTION 'Connect your payout account before shipping this order so we can pay you — set it up from your Profile.';
  END IF;

  SELECT EXISTS (
    SELECT 1 FROM public.order_addresses
     WHERE order_id = _order_id AND user_id = o.buyer_user_id
  ) INTO dest_ready;
  IF NOT dest_ready THEN
    RAISE EXCEPTION 'Waiting for the buyer to submit a delivery address';
  END IF;

  UPDATE public.order_shipments
     SET tracking_number = t_track,
         status = 'shipped',
         shipped_at = COALESCE(shipped_at, now()),
         metadata = COALESCE(metadata, '{}'::jsonb) || jsonb_build_object('carrier', t_carrier),
         updated_at = now()
   WHERE order_id = _order_id
     AND status = 'pending'
  RETURNING * INTO ship;

  IF ship.id IS NULL THEN
    RAISE EXCEPTION 'Shipment is not pending or has already been recorded';
  END IF;

  UPDATE public.orders
     SET status = 'shipped', shipped_at = now(), updated_at = now()
   WHERE id = _order_id AND status = 'paid_held';

  INSERT INTO public.notifications (user_id, type, title, message, data, action_url)
  VALUES (o.buyer_user_id, 'order_shipped', 'Your order has shipped',
          'The seller marked your order as shipped.',
          jsonb_build_object('order_id', o.id), '/orders/' || o.id);

  RETURN ship;
END;
$function$;

-- 3. mark_store_order_shipped — same guard, keyed on the store owner's account.
CREATE OR REPLACE FUNCTION public.mark_store_order_shipped(_order_id uuid, _tracking text, _carrier text)
 RETURNS store_order_shipments
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE
  caller uuid := auth.uid();
  o public.store_orders;
  ship public.store_order_shipments;
  dest_ready boolean;
  t_track text; t_carrier text;
BEGIN
  IF caller IS NULL THEN RAISE EXCEPTION 'Not authenticated'; END IF;

  t_track   := trim(coalesce(_tracking, ''));
  t_carrier := trim(coalesce(_carrier, ''));
  IF t_track = ''   THEN RAISE EXCEPTION 'Tracking number required'; END IF;
  IF t_carrier = '' THEN RAISE EXCEPTION 'Carrier required'; END IF;
  IF length(t_track) > 100 THEN RAISE EXCEPTION 'Tracking number is too long'; END IF;
  IF length(t_carrier) > 80 THEN RAISE EXCEPTION 'Carrier name is too long'; END IF;

  SELECT * INTO o FROM public.store_orders WHERE id = _order_id FOR UPDATE;
  IF o.id IS NULL THEN RAISE EXCEPTION 'Order not found'; END IF;
  IF NOT public.can_fulfil_store_orders(o.store_id) THEN RAISE EXCEPTION 'Only the store can mark an order shipped'; END IF;
  IF o.status <> 'paid_held' THEN RAISE EXCEPTION 'Order must be paid before it can be shipped'; END IF;

  IF NOT EXISTS (
    SELECT 1 FROM public.seller_stripe_accounts
     WHERE user_id = o.store_id AND charges_enabled = true
  ) THEN
    RAISE EXCEPTION 'Connect payouts before shipping this order so we can pay the store. Go to Store settings to connect payouts.';
  END IF;

  SELECT EXISTS (
    SELECT 1 FROM public.store_order_addresses
     WHERE order_id = _order_id AND user_id = o.buyer_user_id
  ) INTO dest_ready;
  IF NOT dest_ready THEN RAISE EXCEPTION 'Waiting for the buyer to submit a delivery address'; END IF;

  UPDATE public.store_order_shipments
     SET tracking_number = t_track,
         status = 'shipped',
         shipped_at = COALESCE(shipped_at, now()),
         metadata = COALESCE(metadata, '{}'::jsonb) || jsonb_build_object('carrier', t_carrier),
         updated_at = now()
   WHERE order_id = _order_id AND status = 'pending'
  RETURNING * INTO ship;

  IF ship.id IS NULL THEN RAISE EXCEPTION 'Shipment is not pending or has already been recorded'; END IF;

  UPDATE public.store_orders
     SET status = 'shipped', shipped_at = now(), updated_at = now()
   WHERE id = _order_id AND status = 'paid_held';

  INSERT INTO public.notifications (user_id, type, title, message, data, action_url)
  VALUES (o.buyer_user_id, 'store_order_shipped', 'Your order has shipped',
          'The store marked your order as shipped.',
          jsonb_build_object('store_order_id', o.id), '/store-orders/' || o.id);

  RETURN ship;
END;
$function$;
