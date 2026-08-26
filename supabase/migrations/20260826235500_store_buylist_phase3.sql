-- CollectX for Business — Phase 3: the buylist.
--
-- Revenue line #4 (per docs/collectx-for-business.html): a store publishes
-- standing buy offers ("I'll pay 60% of TCGplayer market for any NM single in
-- set sv3pt5, min £1"). A collector sells a card FROM their collection INTO
-- that offer through CollectX. The platform takes a small spread (~2%) on the
-- collector's payout. This is the loop nothing else runs — and it feeds
-- store_inventory, which feeds Phase 2 GMV.
--
-- Escrow, roles reversed vs store_orders:
--   * the STORE is the payer + recipient (pays the quote into platform escrow
--     via Checkout, submits the ship-to address, confirms receipt);
--   * the COLLECTOR is the payee + shipper (ships the card, gets
--     quote - spread transferred to their connected account on confirm).
-- On completion the card leaves the collector's user_cards and lands as a
-- store_inventory SKU (cost basis = the quote).
--
-- Same discipline: no client INSERT/UPDATE on the order table, transitions via
-- SECURITY DEFINER RPCs, money-confirmed transitions are service_role only.

-- ============================================================================
-- 1. buylist_config — singleton, tunable spread
-- ============================================================================
CREATE TABLE public.buylist_config (
  id int PRIMARY KEY DEFAULT 1 CHECK (id = 1),
  spread_bps int NOT NULL DEFAULT 200 CHECK (spread_bps BETWEEN 0 AND 5000),  -- 200 = 2%
  currency text NOT NULL DEFAULT 'gbp',
  auto_confirm_days int NOT NULL DEFAULT 7,
  updated_at timestamptz NOT NULL DEFAULT now()
);
INSERT INTO public.buylist_config (id) VALUES (1) ON CONFLICT DO NOTHING;

ALTER TABLE public.buylist_config ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Anyone can read buylist config"
  ON public.buylist_config FOR SELECT USING (true);
CREATE POLICY "No direct writes to buylist_config"
  ON public.buylist_config FOR ALL USING (false) WITH CHECK (false);

-- ============================================================================
-- 2. store_buylist — a store's standing buy offers
-- ============================================================================
CREATE TABLE public.store_buylist (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  store_id uuid NOT NULL REFERENCES public.store_profiles(user_id) ON DELETE CASCADE,
  label text,
  -- Scope: a NULL facet means "any". A non-NULL facet must match exactly
  -- (rarity/condition case-insensitively).
  set_id text,
  card_id text,
  rarity text,
  condition text,
  is_graded boolean,               -- NULL = graded or raw
  pct_of_market int NOT NULL DEFAULT 60 CHECK (pct_of_market BETWEEN 1 AND 100),
  min_gbp numeric(12,2) NOT NULL DEFAULT 0.50 CHECK (min_gbp >= 0),
  max_gbp numeric(12,2) CHECK (max_gbp IS NULL OR max_gbp >= 0),
  daily_cap_gbp numeric(12,2) CHECK (daily_cap_gbp IS NULL OR daily_cap_gbp >= 0),
  active boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX store_buylist_store_idx ON public.store_buylist (store_id);
CREATE INDEX store_buylist_active_idx ON public.store_buylist (active) WHERE active;

ALTER TABLE public.store_buylist ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Store owner manages own buylist"
  ON public.store_buylist FOR ALL
  USING (auth.uid() = store_id)
  WITH CHECK (auth.uid() = store_id);

-- Collectors discover who is buying — only active offers, and only for a
-- live store.
CREATE POLICY "Active buylist offers are public"
  ON public.store_buylist FOR SELECT
  USING (active AND public.is_active_store(store_id));

CREATE TRIGGER update_store_buylist_updated_at
  BEFORE UPDATE ON public.store_buylist
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

GRANT SELECT ON public.store_buylist TO anon, authenticated;
GRANT INSERT, UPDATE, DELETE ON public.store_buylist TO authenticated;
GRANT ALL ON public.store_buylist TO service_role;

-- ============================================================================
-- 3. buylist_orders + shipping + audit
-- ============================================================================
CREATE TABLE public.buylist_orders (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  buylist_id uuid REFERENCES public.store_buylist(id) ON DELETE SET NULL,
  store_id uuid NOT NULL REFERENCES public.store_profiles(user_id),
  seller_user_id uuid NOT NULL REFERENCES auth.users(id),   -- the collector
  user_card_id uuid REFERENCES public.user_cards(id) ON DELETE SET NULL,
  status text NOT NULL DEFAULT 'pending_payment'
    CHECK (status IN ('pending_payment', 'paid_held', 'shipped', 'completed', 'cancelled', 'disputed')),
  market_gbp numeric(12,2) NOT NULL,
  quote_amount numeric(12,2) NOT NULL,          -- what the store pays into escrow
  platform_fee_amount numeric(12,2) NOT NULL DEFAULT 0,  -- the buylist spread
  seller_payout_amount numeric(12,2) NOT NULL,  -- quote - spread → the collector
  currency text NOT NULL DEFAULT 'gbp',
  stripe_payment_intent_id text UNIQUE,
  stripe_transfer_id text,
  stripe_checkout_session_id text UNIQUE,
  dispute_reason text,
  auto_confirm_at timestamptz,
  shipped_at timestamptz,
  completed_at timestamptz,
  cancelled_at timestamptz,
  -- card snapshot (from the collector's user_cards row at offer time)
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
  CHECK (seller_user_id <> store_id)
);

CREATE INDEX buylist_orders_seller_idx ON public.buylist_orders (seller_user_id);
CREATE INDEX buylist_orders_store_idx ON public.buylist_orders (store_id);
CREATE INDEX buylist_orders_auto_confirm_idx ON public.buylist_orders (auto_confirm_at) WHERE status = 'shipped';
-- A given collection card can only be in one live buylist order at a time.
CREATE UNIQUE INDEX buylist_orders_one_live_per_card
  ON public.buylist_orders (user_card_id)
  WHERE status IN ('pending_payment', 'paid_held', 'shipped') AND user_card_id IS NOT NULL;

ALTER TABLE public.buylist_orders ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Participants can view own buylist orders"
  ON public.buylist_orders FOR SELECT
  USING (auth.uid() IN (seller_user_id, store_id));

CREATE POLICY "No direct inserts to buylist_orders"
  ON public.buylist_orders FOR INSERT WITH CHECK (false);
CREATE POLICY "No direct updates to buylist_orders"
  ON public.buylist_orders FOR UPDATE USING (false);

CREATE TRIGGER update_buylist_orders_updated_at
  BEFORE UPDATE ON public.buylist_orders
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

GRANT SELECT ON public.buylist_orders TO authenticated;
GRANT ALL ON public.buylist_orders TO service_role;

CREATE TABLE public.buylist_order_addresses (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  order_id uuid NOT NULL REFERENCES public.buylist_orders(id) ON DELETE CASCADE,
  user_id uuid NOT NULL,
  address jsonb NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (order_id, user_id)
);
ALTER TABLE public.buylist_order_addresses ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Owner can view own buylist order address"
  ON public.buylist_order_addresses FOR SELECT USING (auth.uid() = user_id);
CREATE TRIGGER update_buylist_order_addresses_updated_at
  BEFORE UPDATE ON public.buylist_order_addresses
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
GRANT SELECT ON public.buylist_order_addresses TO authenticated;
GRANT ALL ON public.buylist_order_addresses TO service_role;

CREATE TABLE public.buylist_order_shipments (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  order_id uuid NOT NULL UNIQUE REFERENCES public.buylist_orders(id) ON DELETE CASCADE,
  sender_user_id uuid NOT NULL,       -- the collector
  recipient_user_id uuid NOT NULL,    -- the store
  tracking_number text,
  status text NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'shipped', 'delivered')),
  shipped_at timestamptz,
  delivered_at timestamptz,
  metadata jsonb NOT NULL DEFAULT '{}'::jsonb,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
ALTER TABLE public.buylist_order_shipments ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Sender can view own buylist order shipment"
  ON public.buylist_order_shipments FOR SELECT USING (auth.uid() = sender_user_id);
CREATE TRIGGER update_buylist_order_shipments_updated_at
  BEFORE UPDATE ON public.buylist_order_shipments
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
GRANT SELECT ON public.buylist_order_shipments TO authenticated;
GRANT ALL ON public.buylist_order_shipments TO service_role;

CREATE TABLE public.buylist_ownership_transfers (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  order_id uuid NOT NULL REFERENCES public.buylist_orders(id) ON DELETE CASCADE,
  user_card_id uuid,
  from_user_id uuid NOT NULL,
  to_store_id uuid NOT NULL,
  transferred_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (order_id)
);
ALTER TABLE public.buylist_ownership_transfers ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Participants can view own buylist transfers"
  ON public.buylist_ownership_transfers FOR SELECT
  USING (auth.uid() IN (from_user_id, to_store_id));
GRANT SELECT ON public.buylist_ownership_transfers TO authenticated;
GRANT ALL ON public.buylist_ownership_transfers TO service_role;

-- ============================================================================
-- 4. create_buylist_order — service-role only. Called by the
-- create-buylist-order edge function, which authenticates the collector and
-- computes the live GBP market price server-side.
-- ============================================================================
CREATE OR REPLACE FUNCTION public.create_buylist_order(
  _buylist_id uuid,
  _user_card_id uuid,
  _seller_user_id uuid,
  _market_gbp numeric
)
RETURNS public.buylist_orders
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
DECLARE
  bl public.store_buylist;
  uc public.user_cards;
  cfg public.buylist_config;
  quote numeric(12,2);
  fee numeric(12,2);
  payout numeric(12,2);
  spent_today numeric(12,2);
  o public.buylist_orders;
BEGIN
  IF _seller_user_id IS NULL THEN RAISE EXCEPTION 'seller required'; END IF;
  IF _market_gbp IS NULL OR _market_gbp <= 0 THEN
    RAISE EXCEPTION 'No market price for this card yet — cannot quote';
  END IF;

  SELECT * INTO bl FROM public.store_buylist WHERE id = _buylist_id FOR UPDATE;
  IF bl.id IS NULL OR NOT bl.active THEN RAISE EXCEPTION 'That buy offer is no longer active'; END IF;

  IF NOT public.is_active_store(bl.store_id) THEN
    RAISE EXCEPTION 'That store is not open right now';
  END IF;

  SELECT * INTO uc FROM public.user_cards WHERE id = _user_card_id;
  IF uc.id IS NULL THEN RAISE EXCEPTION 'Card not found in your collection'; END IF;
  IF uc.user_id <> _seller_user_id THEN RAISE EXCEPTION 'That card is not yours'; END IF;
  IF COALESCE(uc.quantity, 0) < 1 THEN RAISE EXCEPTION 'You have none of that card'; END IF;
  IF COALESCE(uc.product_type, 'single') <> 'single' THEN RAISE EXCEPTION 'Sealed product cannot be sold to a buylist'; END IF;
  IF _seller_user_id = bl.store_id THEN RAISE EXCEPTION 'You cannot sell to your own store'; END IF;

  -- Scope match
  IF bl.set_id IS NOT NULL AND lower(bl.set_id) <> lower(COALESCE(uc.set_id, '')) THEN
    RAISE EXCEPTION 'This card is out of scope for that offer';
  END IF;
  IF bl.card_id IS NOT NULL AND bl.card_id <> uc.card_id THEN
    RAISE EXCEPTION 'This card is out of scope for that offer';
  END IF;
  IF bl.rarity IS NOT NULL AND lower(bl.rarity) <> lower(COALESCE(uc.rarity, '')) THEN
    RAISE EXCEPTION 'This rarity is out of scope for that offer';
  END IF;
  IF bl.condition IS NOT NULL AND lower(bl.condition) <> lower(COALESCE(uc.condition, 'near_mint')) THEN
    RAISE EXCEPTION 'This condition is out of scope for that offer';
  END IF;
  IF bl.is_graded IS NOT NULL AND bl.is_graded <> COALESCE(uc.is_graded, false) THEN
    RAISE EXCEPTION 'This card is out of scope for that offer';
  END IF;

  IF NOT EXISTS (SELECT 1 FROM public.seller_stripe_accounts WHERE user_id = _seller_user_id) THEN
    RAISE EXCEPTION 'Connect a payout account before selling to a store';
  END IF;

  SELECT * INTO cfg FROM public.buylist_config WHERE id = 1;

  quote := round(_market_gbp * bl.pct_of_market / 100.0, 2);
  quote := GREATEST(quote, bl.min_gbp);
  IF bl.max_gbp IS NOT NULL THEN quote := LEAST(quote, bl.max_gbp); END IF;
  IF quote <= 0 THEN RAISE EXCEPTION 'Quote works out to zero'; END IF;

  IF bl.daily_cap_gbp IS NOT NULL THEN
    SELECT COALESCE(sum(quote_amount), 0) INTO spent_today
      FROM public.buylist_orders
     WHERE buylist_id = bl.id
       AND created_at >= date_trunc('day', now())
       AND status IN ('pending_payment', 'paid_held', 'shipped', 'completed');
    IF spent_today + quote > bl.daily_cap_gbp THEN
      RAISE EXCEPTION 'This offer has hit its daily limit — try again tomorrow';
    END IF;
  END IF;

  fee := round(quote * cfg.spread_bps / 10000.0, 2);
  payout := round(quote - fee, 2);

  INSERT INTO public.buylist_orders (
    buylist_id, store_id, seller_user_id, user_card_id,
    market_gbp, quote_amount, platform_fee_amount, seller_payout_amount, currency,
    card_id, card_name, image_url, set_id, set_name, card_number, rarity,
    condition, is_graded, grade_company, grade_score
  ) VALUES (
    bl.id, bl.store_id, _seller_user_id, uc.id,
    _market_gbp, quote, fee, payout, 'gbp',
    uc.card_id, uc.card_name, uc.card_image, uc.set_id, uc.set_name, uc.card_number, uc.rarity,
    COALESCE(uc.condition, 'near_mint'), COALESCE(uc.is_graded, false), uc.grading_company,
    CASE WHEN uc.grade_score IS NULL OR uc.grade_score = '' THEN NULL
         ELSE NULLIF(regexp_replace(uc.grade_score, '[^0-9.]', '', 'g'), '')::numeric END
  )
  RETURNING * INTO o;

  INSERT INTO public.notifications (user_id, type, title, message, data, action_url)
  VALUES (bl.store_id, 'buylist_offer', 'New sell offer',
          'A collector offered you ' || o.card_name || ' for £' || to_char(o.quote_amount, 'FM999999990.00') || '. Pay to accept.',
          jsonb_build_object('buylist_order_id', o.id), '/buylist-orders/' || o.id);

  RETURN o;
END;
$function$;

-- ============================================================================
-- 5. User-facing RPCs (authenticated)
-- ============================================================================
CREATE OR REPLACE FUNCTION public.submit_buylist_order_address(_order_id uuid, _address jsonb)
RETURNS public.buylist_order_addresses
LANGUAGE plpgsql SECURITY DEFINER SET search_path TO 'public'
AS $function$
DECLARE
  caller uuid := auth.uid();
  o public.buylist_orders;
  full_name text; line1 text; city text; postal_code text; country text;
  row_out public.buylist_order_addresses;
BEGIN
  IF caller IS NULL THEN RAISE EXCEPTION 'Not authenticated'; END IF;
  IF _address IS NULL OR jsonb_typeof(_address) <> 'object' THEN RAISE EXCEPTION 'Address required'; END IF;

  SELECT * INTO o FROM public.buylist_orders WHERE id = _order_id;
  IF o.id IS NULL THEN RAISE EXCEPTION 'Order not found'; END IF;
  -- The STORE (recipient) submits the ship-to address.
  IF caller <> o.store_id THEN RAISE EXCEPTION 'Only the store sets the delivery address'; END IF;
  IF o.status = 'shipped' THEN RAISE EXCEPTION 'Address is locked: this order has already shipped'; END IF;
  IF o.status <> 'paid_held' THEN RAISE EXCEPTION 'Pay for the order before setting an address'; END IF;

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

  INSERT INTO public.buylist_order_addresses (order_id, user_id, address)
    VALUES (_order_id, caller, _address)
  ON CONFLICT (order_id, user_id) DO UPDATE SET address = EXCLUDED.address, updated_at = now()
  RETURNING * INTO row_out;
  RETURN row_out;
END;
$function$;

CREATE OR REPLACE FUNCTION public.get_buylist_order_destination_address(_order_id uuid)
RETURNS jsonb
LANGUAGE plpgsql STABLE SECURITY DEFINER SET search_path TO 'public'
AS $function$
DECLARE caller uuid := auth.uid(); dest jsonb;
BEGIN
  IF caller IS NULL THEN RETURN NULL; END IF;
  -- The COLLECTOR (sender) reads the store's ship-to address.
  SELECT oa.address INTO dest
    FROM public.buylist_orders o
    JOIN public.buylist_order_addresses oa ON oa.order_id = o.id AND oa.user_id = o.store_id
   WHERE o.id = _order_id AND o.seller_user_id = caller;
  RETURN dest;
END;
$function$;

CREATE OR REPLACE FUNCTION public.mark_buylist_order_shipped(_order_id uuid, _tracking text, _carrier text)
RETURNS public.buylist_order_shipments
LANGUAGE plpgsql SECURITY DEFINER SET search_path TO 'public'
AS $function$
DECLARE
  caller uuid := auth.uid();
  o public.buylist_orders;
  ship public.buylist_order_shipments;
  dest_ready boolean;
  t_track text; t_carrier text;
BEGIN
  IF caller IS NULL THEN RAISE EXCEPTION 'Not authenticated'; END IF;
  t_track := trim(coalesce(_tracking, '')); t_carrier := trim(coalesce(_carrier, ''));
  IF t_track = '' THEN RAISE EXCEPTION 'Tracking number required'; END IF;
  IF t_carrier = '' THEN RAISE EXCEPTION 'Carrier required'; END IF;
  IF length(t_track) > 100 THEN RAISE EXCEPTION 'Tracking number is too long'; END IF;
  IF length(t_carrier) > 80 THEN RAISE EXCEPTION 'Carrier name is too long'; END IF;

  SELECT * INTO o FROM public.buylist_orders WHERE id = _order_id FOR UPDATE;
  IF o.id IS NULL THEN RAISE EXCEPTION 'Order not found'; END IF;
  IF caller <> o.seller_user_id THEN RAISE EXCEPTION 'Only the collector marks this shipped'; END IF;
  IF o.status <> 'paid_held' THEN RAISE EXCEPTION 'The store must pay before you ship'; END IF;

  SELECT EXISTS (
    SELECT 1 FROM public.buylist_order_addresses WHERE order_id = _order_id AND user_id = o.store_id
  ) INTO dest_ready;
  IF NOT dest_ready THEN RAISE EXCEPTION 'Waiting for the store to provide a delivery address'; END IF;

  UPDATE public.buylist_order_shipments
     SET tracking_number = t_track, status = 'shipped',
         shipped_at = COALESCE(shipped_at, now()),
         metadata = COALESCE(metadata, '{}'::jsonb) || jsonb_build_object('carrier', t_carrier),
         updated_at = now()
   WHERE order_id = _order_id AND status = 'pending'
  RETURNING * INTO ship;
  IF ship.id IS NULL THEN RAISE EXCEPTION 'Shipment is not pending or already recorded'; END IF;

  UPDATE public.buylist_orders
     SET status = 'shipped', shipped_at = now(), updated_at = now()
   WHERE id = _order_id AND status = 'paid_held';

  INSERT INTO public.notifications (user_id, type, title, message, data, action_url)
  VALUES (o.store_id, 'buylist_order_shipped', 'A buylist card is on its way',
          'The collector marked ' || o.card_name || ' as shipped.',
          jsonb_build_object('buylist_order_id', o.id), '/buylist-orders/' || o.id);

  RETURN ship;
END;
$function$;

CREATE OR REPLACE FUNCTION public.get_buylist_order_shipment(_order_id uuid)
RETURNS TABLE(id uuid, sender_user_id uuid, recipient_user_id uuid, status text,
              tracking_number text, carrier text, shipped_at timestamptz, delivered_at timestamptz)
LANGUAGE sql STABLE SECURITY DEFINER SET search_path TO 'public'
AS $function$
  SELECT s.id, s.sender_user_id, s.recipient_user_id, s.status,
         s.tracking_number, (s.metadata->>'carrier')::text AS carrier,
         s.shipped_at, s.delivered_at
    FROM public.buylist_order_shipments s
    JOIN public.buylist_orders o ON o.id = s.order_id
   WHERE s.order_id = _order_id AND auth.uid() IN (o.seller_user_id, o.store_id);
$function$;

CREATE OR REPLACE FUNCTION public.open_buylist_order_dispute(_order_id uuid, _reason text)
RETURNS public.buylist_orders
LANGUAGE plpgsql SECURITY DEFINER SET search_path TO 'public'
AS $function$
DECLARE caller uuid := auth.uid(); o public.buylist_orders;
BEGIN
  IF caller IS NULL THEN RAISE EXCEPTION 'Not authenticated'; END IF;
  SELECT * INTO o FROM public.buylist_orders WHERE id = _order_id FOR UPDATE;
  IF o.id IS NULL THEN RAISE EXCEPTION 'Order not found'; END IF;
  IF caller NOT IN (o.seller_user_id, o.store_id) THEN RAISE EXCEPTION 'Not a participant'; END IF;
  IF o.status NOT IN ('paid_held', 'shipped') THEN RAISE EXCEPTION 'Order cannot be disputed in its current state'; END IF;

  UPDATE public.buylist_orders
     SET status = 'disputed', dispute_reason = left(coalesce(_reason, ''), 2000), updated_at = now()
   WHERE id = _order_id
  RETURNING * INTO o;

  INSERT INTO public.notifications (user_id, type, title, message, data, action_url)
  VALUES (CASE WHEN caller = o.seller_user_id THEN o.store_id ELSE o.seller_user_id END,
          'buylist_order_disputed', 'A dispute was opened',
          'A dispute was opened on a buylist order. It is paused pending manual review.',
          jsonb_build_object('buylist_order_id', o.id), '/buylist-orders/' || o.id);
  RETURN o;
END;
$function$;

CREATE OR REPLACE FUNCTION public.cancel_buylist_order(_order_id uuid)
RETURNS public.buylist_orders
LANGUAGE plpgsql SECURITY DEFINER SET search_path TO 'public'
AS $function$
DECLARE caller uuid := auth.uid(); o public.buylist_orders;
BEGIN
  IF caller IS NULL THEN RAISE EXCEPTION 'Not authenticated'; END IF;
  SELECT * INTO o FROM public.buylist_orders WHERE id = _order_id FOR UPDATE;
  IF o.id IS NULL THEN RAISE EXCEPTION 'Order not found'; END IF;
  IF caller NOT IN (o.seller_user_id, o.store_id) THEN RAISE EXCEPTION 'Not a participant'; END IF;
  IF o.status <> 'pending_payment' THEN RAISE EXCEPTION 'Can only be cancelled before the store pays'; END IF;

  UPDATE public.buylist_orders
     SET status = 'cancelled', cancelled_at = now(), updated_at = now()
   WHERE id = _order_id
  RETURNING * INTO o;
  RETURN o;
END;
$function$;

REVOKE ALL ON FUNCTION public.create_buylist_order(uuid, uuid, uuid, numeric) FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION public.submit_buylist_order_address(uuid, jsonb) FROM PUBLIC;
REVOKE ALL ON FUNCTION public.get_buylist_order_destination_address(uuid) FROM PUBLIC;
REVOKE ALL ON FUNCTION public.mark_buylist_order_shipped(uuid, text, text) FROM PUBLIC;
REVOKE ALL ON FUNCTION public.get_buylist_order_shipment(uuid) FROM PUBLIC;
REVOKE ALL ON FUNCTION public.open_buylist_order_dispute(uuid, text) FROM PUBLIC;
REVOKE ALL ON FUNCTION public.cancel_buylist_order(uuid) FROM PUBLIC;

GRANT EXECUTE ON FUNCTION public.create_buylist_order(uuid, uuid, uuid, numeric) TO service_role;
GRANT EXECUTE ON FUNCTION public.submit_buylist_order_address(uuid, jsonb) TO authenticated;
GRANT EXECUTE ON FUNCTION public.get_buylist_order_destination_address(uuid) TO authenticated;
GRANT EXECUTE ON FUNCTION public.mark_buylist_order_shipped(uuid, text, text) TO authenticated;
GRANT EXECUTE ON FUNCTION public.get_buylist_order_shipment(uuid) TO authenticated;
GRANT EXECUTE ON FUNCTION public.open_buylist_order_dispute(uuid, text) TO authenticated;
GRANT EXECUTE ON FUNCTION public.cancel_buylist_order(uuid) TO authenticated;

-- ============================================================================
-- 6. Service-role RPCs — money-confirmed transitions
-- ============================================================================
CREATE OR REPLACE FUNCTION public.mark_buylist_order_paid(_order_id uuid, _stripe_payment_intent_id text)
RETURNS public.buylist_orders
LANGUAGE plpgsql SECURITY DEFINER SET search_path TO 'public'
AS $function$
DECLARE o public.buylist_orders; cfg public.buylist_config;
BEGIN
  SELECT * INTO cfg FROM public.buylist_config WHERE id = 1;

  UPDATE public.buylist_orders
     SET status = 'paid_held',
         stripe_payment_intent_id = _stripe_payment_intent_id,
         auto_confirm_at = now() + make_interval(days => cfg.auto_confirm_days),
         updated_at = now()
   WHERE id = _order_id AND status = 'pending_payment'
  RETURNING * INTO o;

  IF o.id IS NULL THEN RETURN NULL; END IF;

  INSERT INTO public.buylist_order_shipments (order_id, sender_user_id, recipient_user_id, status)
  VALUES (o.id, o.seller_user_id, o.store_id, 'pending')
  ON CONFLICT (order_id) DO NOTHING;

  INSERT INTO public.notifications (user_id, type, title, message, data, action_url)
  VALUES
    (o.seller_user_id, 'buylist_order_paid', 'Your sale is funded', 'The store paid — send the card to get your payout.', jsonb_build_object('buylist_order_id', o.id), '/buylist-orders/' || o.id),
    (o.store_id, 'buylist_order_paid', 'Buylist order funded', 'Add a delivery address so the collector can ship.', jsonb_build_object('buylist_order_id', o.id), '/buylist-orders/' || o.id);

  RETURN o;
END;
$function$;

CREATE OR REPLACE FUNCTION public.mark_buylist_order_payment_failed(_order_id uuid)
RETURNS public.buylist_orders
LANGUAGE plpgsql SECURITY DEFINER SET search_path TO 'public'
AS $function$
DECLARE o public.buylist_orders;
BEGIN
  UPDATE public.buylist_orders
     SET status = 'cancelled', cancelled_at = now(), updated_at = now()
   WHERE id = _order_id AND status = 'pending_payment'
  RETURNING * INTO o;
  RETURN o;  -- NULL when already handled
END;
$function$;

-- Called only after the Stripe Transfer to the collector succeeded.
-- THE LOOP: the card leaves the collector's collection and becomes a
-- store_inventory SKU (cost basis = the quote).
CREATE OR REPLACE FUNCTION public.complete_buylist_order(_order_id uuid, _stripe_transfer_id text)
RETURNS public.buylist_orders
LANGUAGE plpgsql SECURITY DEFINER SET search_path TO 'public'
AS $function$
DECLARE
  o public.buylist_orders;
  uc public.user_cards;
BEGIN
  SELECT * INTO o FROM public.buylist_orders WHERE id = _order_id FOR UPDATE;
  IF o.id IS NULL THEN RAISE EXCEPTION 'Order not found'; END IF;
  IF o.status <> 'shipped' THEN RAISE EXCEPTION 'Order must be shipped and not disputed to complete'; END IF;

  -- Remove one unit from the collector's collection.
  IF o.user_card_id IS NOT NULL THEN
    SELECT * INTO uc FROM public.user_cards WHERE id = o.user_card_id FOR UPDATE;
    IF uc.id IS NOT NULL THEN
      IF COALESCE(uc.quantity, 1) > 1 THEN
        UPDATE public.user_cards SET quantity = quantity - 1, updated_at = now() WHERE id = uc.id;
      ELSE
        DELETE FROM public.card_images WHERE user_card_id = uc.id;
        DELETE FROM public.user_cards WHERE id = uc.id;
      END IF;
    END IF;
  END IF;

  -- Add it to the store's inventory (or bump the matching SKU).
  INSERT INTO public.store_inventory (
    store_id, card_id, card_name, set_id, set_name, card_number, rarity, image_url,
    condition, is_graded, grade_company, grade_score, quantity, cost_gbp, listed
  ) VALUES (
    o.store_id, COALESCE(o.card_id, 'unknown'), COALESCE(o.card_name, 'Card'), o.set_id, o.set_name, o.card_number, o.rarity, o.image_url,
    COALESCE(o.condition, 'near_mint'), COALESCE(o.is_graded, false), o.grade_company, o.grade_score, 1, o.quote_amount, true
  )
  ON CONFLICT (store_id, card_id, condition, is_graded, grade_company, grade_score) DO UPDATE
    SET quantity = store_inventory.quantity + 1,
        cost_gbp = EXCLUDED.cost_gbp,
        updated_at = now();

  INSERT INTO public.buylist_ownership_transfers (order_id, user_card_id, from_user_id, to_store_id)
  VALUES (o.id, o.user_card_id, o.seller_user_id, o.store_id)
  ON CONFLICT (order_id) DO NOTHING;

  UPDATE public.buylist_orders
     SET status = 'completed', completed_at = now(),
         stripe_transfer_id = _stripe_transfer_id, updated_at = now()
   WHERE id = _order_id
  RETURNING * INTO o;

  UPDATE public.profiles
     SET total_trades = total_trades + 1, successful_trades = successful_trades + 1, updated_at = now()
   WHERE user_id IN (o.seller_user_id, o.store_id);

  INSERT INTO public.notifications (user_id, type, title, message, data, action_url)
  VALUES
    (o.seller_user_id, 'buylist_order_completed', 'Payout sent', 'The store confirmed receipt — your payout is on the way.', jsonb_build_object('buylist_order_id', o.id), '/buylist-orders/' || o.id),
    (o.store_id, 'buylist_order_completed', 'Card received', 'The card was added to your inventory.', jsonb_build_object('buylist_order_id', o.id), '/buylist-orders/' || o.id);

  RETURN o;
END;
$function$;

REVOKE ALL ON FUNCTION public.mark_buylist_order_paid(uuid, text) FROM PUBLIC;
REVOKE ALL ON FUNCTION public.mark_buylist_order_payment_failed(uuid) FROM PUBLIC;
REVOKE ALL ON FUNCTION public.complete_buylist_order(uuid, text) FROM PUBLIC;

GRANT EXECUTE ON FUNCTION public.mark_buylist_order_paid(uuid, text) TO service_role;
GRANT EXECUTE ON FUNCTION public.mark_buylist_order_payment_failed(uuid) TO service_role;
GRANT EXECUTE ON FUNCTION public.complete_buylist_order(uuid, text) TO service_role;
