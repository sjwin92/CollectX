-- CollectX for Business — Phase 2b: buyer checkout for store SKUs.
--
-- `store_orders` parallels `orders` the way `orders` parallels `trades`:
--   * the item is a `store_inventory` SKU, not a `user_cards` row + listing;
--   * a completed sale DECREMENTS `store_inventory.quantity` — there is no
--     physical-row ownership transfer;
--   * the escrow rails are identical — buyer pays the platform, funds are
--     held, a Stripe Transfer pays the store on confirm/auto-confirm, the
--     platform keeps buyer_fee + seller_fee.
--
-- Same security discipline as `orders`: no client INSERT/UPDATE on the core
-- table, every state transition via a SECURITY DEFINER RPC, and the
-- money-moving transitions restricted to service_role (called only from the
-- Stripe webhook / release-payout edge functions).

-- ============================================================================
-- 1. store_orders
-- ============================================================================
CREATE TABLE public.store_orders (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  inventory_id uuid NOT NULL REFERENCES public.store_inventory(id),
  store_id uuid NOT NULL REFERENCES public.store_profiles(user_id),   -- the seller
  buyer_user_id uuid NOT NULL REFERENCES auth.users(id),
  status text NOT NULL DEFAULT 'pending_payment'
    CHECK (status IN ('pending_payment', 'paid_held', 'shipped', 'completed', 'refunded', 'cancelled', 'disputed')),
  quantity int NOT NULL DEFAULT 1 CHECK (quantity >= 1),
  unit_amount numeric(12,2) NOT NULL,
  item_amount numeric(12,2) NOT NULL,
  buyer_fee_amount numeric(12,2) NOT NULL DEFAULT 0,
  seller_fee_amount numeric(12,2) NOT NULL DEFAULT 0,
  total_charged_amount numeric(12,2) NOT NULL,
  seller_payout_amount numeric(12,2),
  currency text NOT NULL DEFAULT 'gbp',
  stripe_payment_intent_id text UNIQUE,
  stripe_transfer_id text,
  stripe_checkout_session_id text UNIQUE,
  dispute_reason text,
  auto_confirm_at timestamptz,
  shipped_at timestamptz,
  completed_at timestamptz,
  cancelled_at timestamptz,
  -- SKU snapshot at purchase time (the inventory row can be re-priced or
  -- deleted afterwards; the order must stay legible on its own).
  card_id text,
  card_name text,
  image_url text,
  set_id text,
  set_name text,
  card_number text,
  rarity text,
  condition text,
  is_graded boolean NOT NULL DEFAULT false,
  grade_company text,
  grade_score numeric,
  metadata jsonb NOT NULL DEFAULT '{}'::jsonb,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  CHECK (buyer_user_id <> store_id)
);

CREATE INDEX store_orders_buyer_idx ON public.store_orders (buyer_user_id);
CREATE INDEX store_orders_store_idx ON public.store_orders (store_id);
CREATE INDEX store_orders_inventory_idx ON public.store_orders (inventory_id);
CREATE INDEX store_orders_auto_confirm_idx ON public.store_orders (auto_confirm_at) WHERE status = 'shipped';

ALTER TABLE public.store_orders ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Participants can view own store orders"
  ON public.store_orders FOR SELECT
  USING (auth.uid() IN (buyer_user_id, store_id));

CREATE POLICY "No direct inserts to store_orders"
  ON public.store_orders FOR INSERT WITH CHECK (false);

CREATE POLICY "No direct updates to store_orders"
  ON public.store_orders FOR UPDATE USING (false);

CREATE TRIGGER update_store_orders_updated_at
  BEFORE UPDATE ON public.store_orders
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

GRANT SELECT ON public.store_orders TO authenticated;
GRANT ALL ON public.store_orders TO service_role;

-- ============================================================================
-- 2. store_order_addresses / store_order_shipments
-- Parallel to order_addresses / order_shipments — duplicated rather than
-- generalized, same reasoning as the orders migration.
-- ============================================================================
CREATE TABLE public.store_order_addresses (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  order_id uuid NOT NULL REFERENCES public.store_orders(id) ON DELETE CASCADE,
  user_id uuid NOT NULL,
  address jsonb NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (order_id, user_id)
);

ALTER TABLE public.store_order_addresses ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Owner can view own store order address"
  ON public.store_order_addresses FOR SELECT
  USING (auth.uid() = user_id);

CREATE TRIGGER update_store_order_addresses_updated_at
  BEFORE UPDATE ON public.store_order_addresses
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

GRANT SELECT ON public.store_order_addresses TO authenticated;
GRANT ALL ON public.store_order_addresses TO service_role;

CREATE TABLE public.store_order_shipments (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  order_id uuid NOT NULL UNIQUE REFERENCES public.store_orders(id) ON DELETE CASCADE,
  sender_user_id uuid NOT NULL,
  recipient_user_id uuid NOT NULL,
  tracking_number text,
  status text NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'shipped', 'delivered')),
  shipped_at timestamptz,
  delivered_at timestamptz,
  metadata jsonb NOT NULL DEFAULT '{}'::jsonb,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.store_order_shipments ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Sender can view own store order shipment"
  ON public.store_order_shipments FOR SELECT
  USING (auth.uid() = sender_user_id);

CREATE TRIGGER update_store_order_shipments_updated_at
  BEFORE UPDATE ON public.store_order_shipments
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

GRANT SELECT ON public.store_order_shipments TO authenticated;
GRANT ALL ON public.store_order_shipments TO service_role;

-- ============================================================================
-- 3. create_store_order — service-role only. Called by the
-- create-store-checkout edge function AFTER it has authenticated the buyer.
-- Does everything that must be atomic: re-validate the SKU, reserve stock,
-- compute fees (per-store override → global config), insert the order.
-- ============================================================================
CREATE OR REPLACE FUNCTION public.create_store_order(
  _inventory_id uuid,
  _quantity int,
  _buyer_user_id uuid
)
RETURNS public.store_orders
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

  IF NOT EXISTS (
    SELECT 1 FROM public.seller_stripe_accounts
     WHERE user_id = inv.store_id AND charges_enabled = true
  ) THEN
    RAISE EXCEPTION 'This store has not connected payouts yet';
  END IF;

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

-- ============================================================================
-- 4. User-facing RPCs (authenticated)
-- ============================================================================
CREATE OR REPLACE FUNCTION public.submit_store_order_address(_order_id uuid, _address jsonb)
RETURNS public.store_order_addresses
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
DECLARE
  caller uuid := auth.uid();
  o public.store_orders;
  full_name text; line1 text; city text; postal_code text; country text;
  row_out public.store_order_addresses;
BEGIN
  IF caller IS NULL THEN RAISE EXCEPTION 'Not authenticated'; END IF;
  IF _address IS NULL OR jsonb_typeof(_address) <> 'object' THEN
    RAISE EXCEPTION 'Address required';
  END IF;

  SELECT * INTO o FROM public.store_orders WHERE id = _order_id;
  IF o.id IS NULL THEN RAISE EXCEPTION 'Order not found'; END IF;
  IF caller NOT IN (o.buyer_user_id, o.store_id) THEN RAISE EXCEPTION 'Not a participant'; END IF;
  IF o.status = 'shipped' THEN RAISE EXCEPTION 'Address is locked: this order has already shipped'; END IF;
  IF o.status NOT IN ('paid_held') THEN
    RAISE EXCEPTION 'Order must be paid before an address can be submitted';
  END IF;

  full_name   := trim(coalesce(_address->>'full_name', ''));
  line1       := trim(coalesce(_address->>'line1', ''));
  city        := trim(coalesce(_address->>'city', ''));
  postal_code := trim(coalesce(_address->>'postal_code', ''));
  country     := trim(coalesce(_address->>'country', ''));
  IF full_name = '' OR line1 = '' OR city = '' OR postal_code = '' OR country = '' THEN
    RAISE EXCEPTION 'Address must include full_name, line1, city, postal_code and country';
  END IF;
  IF length(full_name) > 200 OR length(line1) > 300 OR length(city) > 120
     OR length(postal_code) > 40 OR length(country) > 80 THEN
    RAISE EXCEPTION 'Address field too long';
  END IF;

  INSERT INTO public.store_order_addresses (order_id, user_id, address)
    VALUES (_order_id, caller, _address)
  ON CONFLICT (order_id, user_id) DO UPDATE
    SET address = EXCLUDED.address, updated_at = now()
  RETURNING * INTO row_out;
  RETURN row_out;
END;
$function$;

CREATE OR REPLACE FUNCTION public.get_store_order_destination_address(_order_id uuid)
RETURNS jsonb
LANGUAGE plpgsql
STABLE SECURITY DEFINER
SET search_path TO 'public'
AS $function$
DECLARE
  caller uuid := auth.uid();
  dest jsonb;
BEGIN
  IF caller IS NULL THEN RETURN NULL; END IF;
  SELECT oa.address INTO dest
    FROM public.store_orders o
    JOIN public.store_order_addresses oa
      ON oa.order_id = o.id AND oa.user_id = o.buyer_user_id
   WHERE o.id = _order_id AND o.store_id = caller;
  RETURN dest;
END;
$function$;

CREATE OR REPLACE FUNCTION public.mark_store_order_shipped(_order_id uuid, _tracking text, _carrier text)
RETURNS public.store_order_shipments
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
  IF caller <> o.store_id THEN RAISE EXCEPTION 'Only the store can mark an order shipped'; END IF;
  IF o.status <> 'paid_held' THEN RAISE EXCEPTION 'Order must be paid before it can be shipped'; END IF;

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

CREATE OR REPLACE FUNCTION public.get_store_order_shipment(_order_id uuid)
RETURNS TABLE(id uuid, sender_user_id uuid, recipient_user_id uuid, status text,
              tracking_number text, carrier text, shipped_at timestamptz, delivered_at timestamptz)
LANGUAGE sql
STABLE SECURITY DEFINER
SET search_path TO 'public'
AS $function$
  SELECT s.id, s.sender_user_id, s.recipient_user_id, s.status,
         s.tracking_number,
         (s.metadata->>'carrier')::text AS carrier,
         s.shipped_at, s.delivered_at
    FROM public.store_order_shipments s
    JOIN public.store_orders o ON o.id = s.order_id
   WHERE s.order_id = _order_id
     AND auth.uid() IN (o.buyer_user_id, o.store_id);
$function$;

CREATE OR REPLACE FUNCTION public.open_store_order_dispute(_order_id uuid, _reason text)
RETURNS public.store_orders
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
DECLARE
  caller uuid := auth.uid();
  o public.store_orders;
BEGIN
  IF caller IS NULL THEN RAISE EXCEPTION 'Not authenticated'; END IF;

  SELECT * INTO o FROM public.store_orders WHERE id = _order_id FOR UPDATE;
  IF o.id IS NULL THEN RAISE EXCEPTION 'Order not found'; END IF;
  IF caller NOT IN (o.buyer_user_id, o.store_id) THEN RAISE EXCEPTION 'Not a participant'; END IF;
  IF o.status NOT IN ('paid_held', 'shipped') THEN
    RAISE EXCEPTION 'Order cannot be disputed in its current state';
  END IF;

  UPDATE public.store_orders
     SET status = 'disputed', dispute_reason = left(coalesce(_reason, ''), 2000), updated_at = now()
   WHERE id = _order_id
  RETURNING * INTO o;

  INSERT INTO public.notifications (user_id, type, title, message, data, action_url)
  VALUES (
    CASE WHEN caller = o.buyer_user_id THEN o.store_id ELSE o.buyer_user_id END,
    'store_order_disputed', 'A dispute was opened',
    'A dispute was opened on a store order. It is paused pending manual review.',
    jsonb_build_object('store_order_id', o.id), '/store-orders/' || o.id
  );

  RETURN o;
END;
$function$;

CREATE OR REPLACE FUNCTION public.cancel_store_order(_order_id uuid)
RETURNS public.store_orders
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
DECLARE
  caller uuid := auth.uid();
  o public.store_orders;
BEGIN
  IF caller IS NULL THEN RAISE EXCEPTION 'Not authenticated'; END IF;

  SELECT * INTO o FROM public.store_orders WHERE id = _order_id FOR UPDATE;
  IF o.id IS NULL THEN RAISE EXCEPTION 'Order not found'; END IF;
  IF caller <> o.buyer_user_id THEN RAISE EXCEPTION 'Only the buyer can cancel'; END IF;
  IF o.status <> 'pending_payment' THEN
    RAISE EXCEPTION 'Order can only be cancelled before payment completes';
  END IF;

  UPDATE public.store_orders
     SET status = 'cancelled', cancelled_at = now(), updated_at = now()
   WHERE id = _order_id
  RETURNING * INTO o;

  -- Release the reserved stock.
  UPDATE public.store_inventory
     SET reserved = GREATEST(reserved - o.quantity, 0), updated_at = now()
   WHERE id = o.inventory_id;

  RETURN o;
END;
$function$;

REVOKE ALL ON FUNCTION public.create_store_order(uuid, int, uuid) FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION public.submit_store_order_address(uuid, jsonb) FROM PUBLIC;
REVOKE ALL ON FUNCTION public.get_store_order_destination_address(uuid) FROM PUBLIC;
REVOKE ALL ON FUNCTION public.mark_store_order_shipped(uuid, text, text) FROM PUBLIC;
REVOKE ALL ON FUNCTION public.get_store_order_shipment(uuid) FROM PUBLIC;
REVOKE ALL ON FUNCTION public.open_store_order_dispute(uuid, text) FROM PUBLIC;
REVOKE ALL ON FUNCTION public.cancel_store_order(uuid) FROM PUBLIC;

GRANT EXECUTE ON FUNCTION public.create_store_order(uuid, int, uuid) TO service_role;
GRANT EXECUTE ON FUNCTION public.submit_store_order_address(uuid, jsonb) TO authenticated;
GRANT EXECUTE ON FUNCTION public.get_store_order_destination_address(uuid) TO authenticated;
GRANT EXECUTE ON FUNCTION public.mark_store_order_shipped(uuid, text, text) TO authenticated;
GRANT EXECUTE ON FUNCTION public.get_store_order_shipment(uuid) TO authenticated;
GRANT EXECUTE ON FUNCTION public.open_store_order_dispute(uuid, text) TO authenticated;
GRANT EXECUTE ON FUNCTION public.cancel_store_order(uuid) TO authenticated;

-- ============================================================================
-- 5. Service-role RPCs — money-confirmed transitions. Called ONLY from the
-- Stripe webhook / release-payout edge functions with the service-role key.
-- ============================================================================
CREATE OR REPLACE FUNCTION public.mark_store_order_paid(_order_id uuid, _stripe_payment_intent_id text)
RETURNS public.store_orders
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
DECLARE
  o public.store_orders;
  fee_cfg public.marketplace_fee_config;
BEGIN
  SELECT * INTO fee_cfg FROM public.marketplace_fee_config WHERE id = 1;

  UPDATE public.store_orders
     SET status = 'paid_held',
         stripe_payment_intent_id = _stripe_payment_intent_id,
         auto_confirm_at = now() + make_interval(days => fee_cfg.auto_confirm_days),
         updated_at = now()
   WHERE id = _order_id AND status = 'pending_payment'
  RETURNING * INTO o;

  IF o.id IS NULL THEN
    RETURN NULL;  -- already processed or not found; webhook handlers must be idempotent
  END IF;

  INSERT INTO public.store_order_shipments (order_id, sender_user_id, recipient_user_id, status)
  VALUES (o.id, o.store_id, o.buyer_user_id, 'pending')
  ON CONFLICT (order_id) DO NOTHING;

  INSERT INTO public.notifications (user_id, type, title, message, data, action_url)
  VALUES
    (o.buyer_user_id, 'store_order_paid', 'Payment confirmed', 'Your payment is held until you confirm delivery.', jsonb_build_object('store_order_id', o.id), '/store-orders/' || o.id),
    (o.store_id, 'store_order_paid', 'You made a sale', 'A buyer paid for one of your listings. Ship it to get paid.', jsonb_build_object('store_order_id', o.id), '/store-orders/' || o.id);

  RETURN o;
END;
$function$;

CREATE OR REPLACE FUNCTION public.mark_store_order_payment_failed(_order_id uuid)
RETURNS public.store_orders
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
DECLARE
  o public.store_orders;
BEGIN
  UPDATE public.store_orders
     SET status = 'cancelled', cancelled_at = now(), updated_at = now()
   WHERE id = _order_id AND status = 'pending_payment'
  RETURNING * INTO o;

  IF o.id IS NULL THEN RETURN NULL; END IF;

  -- Release the reserved stock (quantity was never decremented).
  UPDATE public.store_inventory
     SET reserved = GREATEST(reserved - o.quantity, 0), updated_at = now()
   WHERE id = o.inventory_id;

  RETURN o;
END;
$function$;

-- Called only after the edge function has confirmed the Stripe Transfer to
-- the store succeeded — never flips status before the store is actually paid.
CREATE OR REPLACE FUNCTION public.complete_store_order(_order_id uuid, _stripe_transfer_id text)
RETURNS public.store_orders
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
DECLARE
  o public.store_orders;
BEGIN
  SELECT * INTO o FROM public.store_orders WHERE id = _order_id FOR UPDATE;
  IF o.id IS NULL THEN RAISE EXCEPTION 'Order not found'; END IF;
  IF o.status <> 'shipped' THEN
    RAISE EXCEPTION 'Order must be shipped and not disputed to complete';
  END IF;

  -- Decrement inventory: the reserved units become sold-and-gone.
  UPDATE public.store_inventory
     SET quantity = GREATEST(quantity - o.quantity, 0),
         reserved = GREATEST(reserved - o.quantity, 0),
         updated_at = now()
   WHERE id = o.inventory_id;

  UPDATE public.store_orders
     SET status = 'completed', completed_at = now(),
         stripe_transfer_id = _stripe_transfer_id, updated_at = now()
   WHERE id = _order_id
  RETURNING * INTO o;

  -- Both sides get a completed-trade credit (feeds reputation, same as orders).
  UPDATE public.profiles
     SET total_trades = total_trades + 1,
         successful_trades = successful_trades + 1,
         updated_at = now()
   WHERE user_id IN (o.buyer_user_id, o.store_id);

  INSERT INTO public.notifications (user_id, type, title, message, data, action_url)
  VALUES
    (o.buyer_user_id, 'store_order_completed', 'Order complete', 'Delivery confirmed — enjoy your card.', jsonb_build_object('store_order_id', o.id), '/store-orders/' || o.id),
    (o.store_id, 'store_order_completed', 'Payout sent', 'Your payout has been sent.', jsonb_build_object('store_order_id', o.id), '/store-orders/' || o.id);

  RETURN o;
END;
$function$;

REVOKE ALL ON FUNCTION public.mark_store_order_paid(uuid, text) FROM PUBLIC;
REVOKE ALL ON FUNCTION public.mark_store_order_payment_failed(uuid) FROM PUBLIC;
REVOKE ALL ON FUNCTION public.complete_store_order(uuid, text) FROM PUBLIC;

GRANT EXECUTE ON FUNCTION public.mark_store_order_paid(uuid, text) TO service_role;
GRANT EXECUTE ON FUNCTION public.mark_store_order_payment_failed(uuid) TO service_role;
GRANT EXECUTE ON FUNCTION public.complete_store_order(uuid, text) TO service_role;
