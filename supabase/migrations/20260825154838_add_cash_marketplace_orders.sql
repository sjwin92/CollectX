-- Cash marketplace pivot: widen marketplace_listings for sale listings, and add a
-- fully parallel `orders` flow (cash purchases) alongside the existing `trades`
-- barter flow. Mirrors the security discipline already established for trades:
-- no client INSERT/UPDATE on the core table, all state transitions via
-- SECURITY DEFINER RPCs, money-moving transitions restricted to service_role
-- (called only from the Stripe webhook / release-payout edge functions).

-- ============================================================================
-- 1. Widen marketplace_listings to support sale listings
-- ============================================================================

ALTER TABLE public.marketplace_listings
  DROP CONSTRAINT marketplace_listings_listing_type_check,
  ADD CONSTRAINT marketplace_listings_listing_type_check
    CHECK (listing_type IN ('trade', 'sale'));

ALTER TABLE public.marketplace_listings
  ADD COLUMN IF NOT EXISTS currency text NOT NULL DEFAULT 'gbp';

-- Rewrite the snapshot trigger: previously unconditionally forced listing_type
-- back to 'trade' and asking_price to NULL. Now: trade listings keep that
-- behavior; sale listings require a positive asking_price AND require the
-- seller to already have a Stripe Connect account that can accept charges
-- (otherwise a buyer could pay for a listing whose payout would fail).
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
    IF NOT EXISTS (
      SELECT 1 FROM public.seller_stripe_accounts
       WHERE user_id = NEW.user_id AND charges_enabled = true
    ) THEN
      RAISE EXCEPTION 'Connect a payout account before listing a card for sale';
    END IF;
  END IF;

  RETURN NEW;
END;
$function$;

-- ============================================================================
-- 2. seller_stripe_accounts (must exist before the trigger above can reference it)
-- ============================================================================

CREATE TABLE public.seller_stripe_accounts (
  user_id uuid PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  stripe_account_id text UNIQUE NOT NULL,
  charges_enabled boolean NOT NULL DEFAULT false,
  payouts_enabled boolean NOT NULL DEFAULT false,
  details_submitted boolean NOT NULL DEFAULT false,
  onboarding_status text NOT NULL DEFAULT 'not_started'
    CHECK (onboarding_status IN ('not_started', 'pending', 'complete', 'restricted')),
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.seller_stripe_accounts ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own stripe account"
  ON public.seller_stripe_accounts FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "No direct writes to seller_stripe_accounts"
  ON public.seller_stripe_accounts FOR ALL
  USING (false) WITH CHECK (false);

CREATE TRIGGER update_seller_stripe_accounts_updated_at
  BEFORE UPDATE ON public.seller_stripe_accounts
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- ============================================================================
-- 3. marketplace_fee_config (singleton, tunable without a redeploy)
-- ============================================================================

CREATE TABLE public.marketplace_fee_config (
  id int PRIMARY KEY DEFAULT 1 CHECK (id = 1),
  buyer_protection_fee_bps int NOT NULL DEFAULT 500,   -- 5%
  buyer_protection_fee_fixed numeric(12,2) NOT NULL DEFAULT 0,
  seller_fee_bps int NOT NULL DEFAULT 0,
  auto_confirm_days int NOT NULL DEFAULT 14,
  updated_at timestamptz NOT NULL DEFAULT now()
);

INSERT INTO public.marketplace_fee_config (id) VALUES (1) ON CONFLICT DO NOTHING;

ALTER TABLE public.marketplace_fee_config ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone can read fee config"
  ON public.marketplace_fee_config FOR SELECT
  USING (true);

CREATE POLICY "No direct writes to marketplace_fee_config"
  ON public.marketplace_fee_config FOR ALL
  USING (false) WITH CHECK (false);

-- ============================================================================
-- 4. orders (cash purchases)
-- ============================================================================

CREATE TABLE public.orders (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  listing_id uuid NOT NULL REFERENCES public.marketplace_listings(id),
  user_card_id uuid NOT NULL REFERENCES public.user_cards(id),
  buyer_user_id uuid NOT NULL REFERENCES auth.users(id),
  seller_user_id uuid NOT NULL REFERENCES auth.users(id),
  status text NOT NULL DEFAULT 'pending_payment'
    CHECK (status IN ('pending_payment', 'paid_held', 'shipped', 'completed', 'refunded', 'cancelled', 'disputed')),
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
  metadata jsonb NOT NULL DEFAULT '{}'::jsonb,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  CHECK (buyer_user_id <> seller_user_id)
);

CREATE INDEX orders_buyer_idx ON public.orders(buyer_user_id);
CREATE INDEX orders_seller_idx ON public.orders(seller_user_id);
CREATE INDEX orders_auto_confirm_idx ON public.orders(auto_confirm_at) WHERE status = 'shipped';

ALTER TABLE public.orders ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Participants can view own orders"
  ON public.orders FOR SELECT
  USING (auth.uid() IN (buyer_user_id, seller_user_id));

-- No client INSERT/UPDATE at all: orders are created by create-checkout-session
-- (service role) and transitioned only via the RPCs below.
CREATE POLICY "No direct inserts to orders"
  ON public.orders FOR INSERT
  WITH CHECK (false);

CREATE POLICY "No direct updates to orders"
  ON public.orders FOR UPDATE
  USING (false);

CREATE TRIGGER update_orders_updated_at
  BEFORE UPDATE ON public.orders
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- Audit trail mirroring trade_ownership_transfers
CREATE TABLE public.order_ownership_transfers (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  order_id uuid NOT NULL REFERENCES public.orders(id) ON DELETE CASCADE,
  user_card_id uuid NOT NULL,
  from_user_id uuid NOT NULL,
  to_user_id uuid NOT NULL,
  transferred_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (order_id, user_card_id)
);

ALTER TABLE public.order_ownership_transfers ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Participants can view own order ownership transfers"
  ON public.order_ownership_transfers FOR SELECT
  USING (auth.uid() IN (from_user_id, to_user_id));

-- ============================================================================
-- 5. order_addresses / order_shipments (shipping) — new tables mirroring the
-- trade_addresses / trade_shipments pattern rather than generalizing those
-- tables in place. Several existing trade RPCs reference trade_addresses /
-- trade_shipments internally by name; duplicating avoids any risk of an
-- overlooked reference breaking the working trade flow under time pressure.
-- ============================================================================

CREATE TABLE public.order_addresses (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  order_id uuid NOT NULL REFERENCES public.orders(id) ON DELETE CASCADE,
  user_id uuid NOT NULL,
  address jsonb NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (order_id, user_id)
);

ALTER TABLE public.order_addresses ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Owner can view own order address"
  ON public.order_addresses FOR SELECT
  USING (auth.uid() = user_id);

CREATE TRIGGER update_order_addresses_updated_at
  BEFORE UPDATE ON public.order_addresses
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE TABLE public.order_shipments (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  order_id uuid NOT NULL UNIQUE REFERENCES public.orders(id) ON DELETE CASCADE,
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

ALTER TABLE public.order_shipments ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Sender can view own order shipment"
  ON public.order_shipments FOR SELECT
  USING (auth.uid() = sender_user_id);

CREATE TRIGGER update_order_shipments_updated_at
  BEFORE UPDATE ON public.order_shipments
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- ============================================================================
-- 6. RPCs — user-facing (grant EXECUTE to authenticated)
-- ============================================================================

CREATE OR REPLACE FUNCTION public.submit_order_address(_order_id uuid, _address jsonb)
RETURNS public.order_addresses
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
DECLARE
  caller uuid := auth.uid();
  o public.orders;
  full_name text;
  line1 text;
  city text;
  postal_code text;
  country text;
  row_out public.order_addresses;
BEGIN
  IF caller IS NULL THEN RAISE EXCEPTION 'Not authenticated'; END IF;
  IF _address IS NULL OR jsonb_typeof(_address) <> 'object' THEN
    RAISE EXCEPTION 'Address required';
  END IF;

  SELECT * INTO o FROM public.orders WHERE id = _order_id;
  IF o.id IS NULL THEN RAISE EXCEPTION 'Order not found'; END IF;
  IF caller NOT IN (o.buyer_user_id, o.seller_user_id) THEN
    RAISE EXCEPTION 'Not a participant';
  END IF;
  IF o.status NOT IN ('paid_held', 'shipped') THEN
    RAISE EXCEPTION 'Order must be paid before an address can be submitted';
  END IF;
  IF o.status = 'shipped' THEN
    RAISE EXCEPTION 'Address is locked: this order has already shipped';
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

  INSERT INTO public.order_addresses (order_id, user_id, address)
    VALUES (_order_id, caller, _address)
  ON CONFLICT (order_id, user_id) DO UPDATE
    SET address = EXCLUDED.address, updated_at = now()
  RETURNING * INTO row_out;
  RETURN row_out;
END;
$function$;

CREATE OR REPLACE FUNCTION public.get_order_destination_address(_order_id uuid)
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
    FROM public.orders o
    JOIN public.order_addresses oa
      ON oa.order_id = o.id AND oa.user_id = o.buyer_user_id
   WHERE o.id = _order_id AND o.seller_user_id = caller;
  RETURN dest;
END;
$function$;

CREATE OR REPLACE FUNCTION public.mark_order_shipped(_order_id uuid, _tracking text, _carrier text)
RETURNS public.order_shipments
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

CREATE OR REPLACE FUNCTION public.get_order_shipment(_order_id uuid)
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
    FROM public.order_shipments s
    JOIN public.orders o ON o.id = s.order_id
   WHERE s.order_id = _order_id
     AND auth.uid() IN (o.buyer_user_id, o.seller_user_id);
$function$;

CREATE OR REPLACE FUNCTION public.open_order_dispute(_order_id uuid, _reason text)
RETURNS public.orders
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
DECLARE
  caller uuid := auth.uid();
  o public.orders;
BEGIN
  IF caller IS NULL THEN RAISE EXCEPTION 'Not authenticated'; END IF;

  SELECT * INTO o FROM public.orders WHERE id = _order_id FOR UPDATE;
  IF o.id IS NULL THEN RAISE EXCEPTION 'Order not found'; END IF;
  IF caller NOT IN (o.buyer_user_id, o.seller_user_id) THEN
    RAISE EXCEPTION 'Not a participant';
  END IF;
  IF o.status NOT IN ('paid_held', 'shipped') THEN
    RAISE EXCEPTION 'Order cannot be disputed in its current state';
  END IF;

  UPDATE public.orders
     SET status = 'disputed',
         dispute_reason = left(coalesce(_reason, ''), 2000),
         updated_at = now()
   WHERE id = _order_id
  RETURNING * INTO o;

  INSERT INTO public.notifications (user_id, type, title, message, data, action_url)
  VALUES (
    CASE WHEN caller = o.buyer_user_id THEN o.seller_user_id ELSE o.buyer_user_id END,
    'order_disputed', 'A dispute was opened',
    'A dispute was opened on an order. This is paused pending manual review.',
    jsonb_build_object('order_id', o.id), '/orders/' || o.id
  );

  RETURN o;
END;
$function$;

CREATE OR REPLACE FUNCTION public.cancel_order(_order_id uuid)
RETURNS public.orders
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
DECLARE
  caller uuid := auth.uid();
  o public.orders;
BEGIN
  IF caller IS NULL THEN RAISE EXCEPTION 'Not authenticated'; END IF;

  SELECT * INTO o FROM public.orders WHERE id = _order_id FOR UPDATE;
  IF o.id IS NULL THEN RAISE EXCEPTION 'Order not found'; END IF;
  IF caller <> o.buyer_user_id THEN RAISE EXCEPTION 'Only the buyer can cancel'; END IF;
  IF o.status <> 'pending_payment' THEN
    RAISE EXCEPTION 'Order can only be cancelled before payment completes';
  END IF;

  UPDATE public.orders
     SET status = 'cancelled', cancelled_at = now(), updated_at = now()
   WHERE id = _order_id
  RETURNING * INTO o;

  UPDATE public.marketplace_listings
     SET status = 'active', updated_at = now()
   WHERE id = o.listing_id AND status = 'pending';

  RETURN o;
END;
$function$;

REVOKE ALL ON FUNCTION public.submit_order_address(uuid, jsonb) FROM PUBLIC;
REVOKE ALL ON FUNCTION public.get_order_destination_address(uuid) FROM PUBLIC;
REVOKE ALL ON FUNCTION public.mark_order_shipped(uuid, text, text) FROM PUBLIC;
REVOKE ALL ON FUNCTION public.get_order_shipment(uuid) FROM PUBLIC;
REVOKE ALL ON FUNCTION public.open_order_dispute(uuid, text) FROM PUBLIC;
REVOKE ALL ON FUNCTION public.cancel_order(uuid) FROM PUBLIC;

GRANT EXECUTE ON FUNCTION public.submit_order_address(uuid, jsonb) TO authenticated;
GRANT EXECUTE ON FUNCTION public.get_order_destination_address(uuid) TO authenticated;
GRANT EXECUTE ON FUNCTION public.mark_order_shipped(uuid, text, text) TO authenticated;
GRANT EXECUTE ON FUNCTION public.get_order_shipment(uuid) TO authenticated;
GRANT EXECUTE ON FUNCTION public.open_order_dispute(uuid, text) TO authenticated;
GRANT EXECUTE ON FUNCTION public.cancel_order(uuid) TO authenticated;

-- ============================================================================
-- 7. RPCs — service-role only (called exclusively from the Stripe webhook /
-- release-payout edge functions using the service-role key; NEVER exposed to
-- authenticated users, since they perform the money-confirmed state
-- transitions and the ownership swap).
-- ============================================================================

CREATE OR REPLACE FUNCTION public.mark_order_paid(_order_id uuid, _stripe_payment_intent_id text)
RETURNS public.orders
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
DECLARE
  o public.orders;
  fee_cfg public.marketplace_fee_config;
BEGIN
  SELECT * INTO fee_cfg FROM public.marketplace_fee_config WHERE id = 1;

  UPDATE public.orders
     SET status = 'paid_held',
         stripe_payment_intent_id = _stripe_payment_intent_id,
         auto_confirm_at = now() + make_interval(days => fee_cfg.auto_confirm_days),
         updated_at = now()
   WHERE id = _order_id AND status = 'pending_payment'
  RETURNING * INTO o;

  IF o.id IS NULL THEN
    RETURN NULL; -- already processed or not found; webhook handlers must be idempotent
  END IF;

  INSERT INTO public.order_shipments (order_id, sender_user_id, recipient_user_id, status)
  VALUES (o.id, o.seller_user_id, o.buyer_user_id, 'pending')
  ON CONFLICT (order_id) DO NOTHING;

  INSERT INTO public.notifications (user_id, type, title, message, data, action_url)
  VALUES
    (o.buyer_user_id, 'order_paid', 'Payment confirmed', 'Your payment is held until you confirm delivery.', jsonb_build_object('order_id', o.id), '/orders/' || o.id),
    (o.seller_user_id, 'order_paid', 'You made a sale', 'A buyer has paid for your listing. Ship it to get paid.', jsonb_build_object('order_id', o.id), '/orders/' || o.id);

  RETURN o;
END;
$function$;

CREATE OR REPLACE FUNCTION public.mark_order_payment_failed(_order_id uuid)
RETURNS public.orders
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
DECLARE
  o public.orders;
BEGIN
  UPDATE public.orders
     SET status = 'cancelled', cancelled_at = now(), updated_at = now()
   WHERE id = _order_id AND status = 'pending_payment'
  RETURNING * INTO o;

  IF o.id IS NULL THEN
    RETURN NULL;
  END IF;

  UPDATE public.marketplace_listings
     SET status = 'active', updated_at = now()
   WHERE id = o.listing_id AND status = 'pending';

  RETURN o;
END;
$function$;

-- Called only after the edge function has confirmed the Stripe Transfer to
-- the seller succeeded — never flips status before the seller is actually paid.
CREATE OR REPLACE FUNCTION public.complete_order(_order_id uuid, _stripe_transfer_id text)
RETURNS public.orders
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
DECLARE
  o public.orders;
BEGIN
  SELECT * INTO o FROM public.orders WHERE id = _order_id FOR UPDATE;
  IF o.id IS NULL THEN RAISE EXCEPTION 'Order not found'; END IF;
  IF o.status <> 'shipped' THEN
    RAISE EXCEPTION 'Order must be shipped and not disputed to complete';
  END IF;

  UPDATE public.user_cards
     SET user_id = o.buyer_user_id, for_trade = false, for_sale = false, updated_at = now()
   WHERE id = o.user_card_id;

  UPDATE public.card_images
     SET user_id = o.buyer_user_id
   WHERE user_card_id = o.user_card_id;

  INSERT INTO public.order_ownership_transfers (order_id, user_card_id, from_user_id, to_user_id)
  VALUES (o.id, o.user_card_id, o.seller_user_id, o.buyer_user_id)
  ON CONFLICT (order_id, user_card_id) DO NOTHING;

  UPDATE public.orders
     SET status = 'completed', completed_at = now(),
         stripe_transfer_id = _stripe_transfer_id, updated_at = now()
   WHERE id = _order_id
  RETURNING * INTO o;

  UPDATE public.marketplace_listings
     SET status = 'completed', updated_at = now()
   WHERE id = o.listing_id AND status IN ('pending', 'active');

  UPDATE public.profiles
     SET total_trades = total_trades + 1,
         successful_trades = successful_trades + 1,
         updated_at = now()
   WHERE user_id IN (o.buyer_user_id, o.seller_user_id);

  INSERT INTO public.notifications (user_id, type, title, message, data, action_url)
  VALUES
    (o.buyer_user_id, 'order_completed', 'Order complete', 'Delivery confirmed and the card is now yours.', jsonb_build_object('order_id', o.id), '/orders/' || o.id),
    (o.seller_user_id, 'order_completed', 'Payout sent', 'Your payout has been sent.', jsonb_build_object('order_id', o.id), '/orders/' || o.id);

  RETURN o;
END;
$function$;

REVOKE ALL ON FUNCTION public.mark_order_paid(uuid, text) FROM PUBLIC;
REVOKE ALL ON FUNCTION public.mark_order_payment_failed(uuid) FROM PUBLIC;
REVOKE ALL ON FUNCTION public.complete_order(uuid, text) FROM PUBLIC;

GRANT EXECUTE ON FUNCTION public.mark_order_paid(uuid, text) TO service_role;
GRANT EXECUTE ON FUNCTION public.mark_order_payment_failed(uuid) TO service_role;
GRANT EXECUTE ON FUNCTION public.complete_order(uuid, text) TO service_role;
