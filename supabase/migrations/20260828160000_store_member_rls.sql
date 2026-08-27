-- ────────────────────────────────────────────────────────────────────────────
-- CollectX for Business — wire store_members roles into RLS.
--
-- Until now every store surface was owner-only (auth.uid() = store_id), so a
-- `lister` or `shipper` added to store_members couldn't do anything. This adds
-- role predicates and rewrites the store-listing policies + the store-order
-- fulfilment RPCs to honour them.
--
--   owner   — everything (also the implicit owner where user_id = store_id)
--   lister  — inventory, price rules, buylist rules, promotion visibility
--   shipper — store-order addresses + shipments
--
-- Promotion *purchases* and the team roster / subscription stay owner-only
-- (they spend the store's money or change who can act).
-- ────────────────────────────────────────────────────────────────────────────

-- Which store the caller acts for: their own, else the one they're a member of.
CREATE OR REPLACE FUNCTION public.acting_store_id()
RETURNS uuid
LANGUAGE sql STABLE SECURITY DEFINER SET search_path TO 'public'
AS $$
  SELECT COALESCE(
    (SELECT user_id FROM public.store_profiles WHERE user_id = auth.uid()),
    (SELECT store_id FROM public.store_members
      WHERE user_id = auth.uid()
      ORDER BY created_at
      LIMIT 1)
  )
$$;

CREATE OR REPLACE FUNCTION public.can_manage_store_listings(_store_id uuid)
RETURNS boolean
LANGUAGE sql STABLE SECURITY DEFINER SET search_path TO 'public'
AS $$
  SELECT public.store_member_role(_store_id, auth.uid()) IN ('owner', 'lister')
$$;

CREATE OR REPLACE FUNCTION public.can_fulfil_store_orders(_store_id uuid)
RETURNS boolean
LANGUAGE sql STABLE SECURITY DEFINER SET search_path TO 'public'
AS $$
  SELECT public.store_member_role(_store_id, auth.uid()) IN ('owner', 'shipper')
$$;

REVOKE ALL ON FUNCTION public.acting_store_id() FROM PUBLIC;
REVOKE ALL ON FUNCTION public.can_manage_store_listings(uuid) FROM PUBLIC;
REVOKE ALL ON FUNCTION public.can_fulfil_store_orders(uuid) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.acting_store_id() TO authenticated;
GRANT EXECUTE ON FUNCTION public.can_manage_store_listings(uuid) TO authenticated;
GRANT EXECUTE ON FUNCTION public.can_fulfil_store_orders(uuid) TO authenticated;

-- ── RLS: listing surfaces ──────────────────────────────────────────────────
DROP POLICY IF EXISTS "Store owner manages own inventory" ON public.store_inventory;
CREATE POLICY "Store team manages inventory"
  ON public.store_inventory
  USING (public.can_manage_store_listings(store_id))
  WITH CHECK (public.can_manage_store_listings(store_id));

DROP POLICY IF EXISTS "Store owner manages own price rules" ON public.store_price_rules;
CREATE POLICY "Store team manages price rules"
  ON public.store_price_rules
  USING (public.can_manage_store_listings(store_id))
  WITH CHECK (public.can_manage_store_listings(store_id));

DROP POLICY IF EXISTS "Store owner manages own buylist" ON public.store_buylist;
CREATE POLICY "Store team manages buylist"
  ON public.store_buylist
  USING (public.can_manage_store_listings(store_id))
  WITH CHECK (public.can_manage_store_listings(store_id));

DROP POLICY IF EXISTS "Store owner views own promotions" ON public.store_promotions;
CREATE POLICY "Store team views promotions"
  ON public.store_promotions FOR SELECT
  USING (public.can_manage_store_listings(store_id));

-- ── RPCs: price rule seeding acts for the resolved store ────────────────────
CREATE OR REPLACE FUNCTION public.ensure_default_price_rule()
RETURNS public.store_price_rules
LANGUAGE plpgsql SECURITY DEFINER SET search_path TO 'public'
AS $$
DECLARE
  sid uuid := public.acting_store_id();
  r public.store_price_rules;
BEGIN
  IF auth.uid() IS NULL THEN RAISE EXCEPTION 'not authenticated'; END IF;
  IF sid IS NULL OR NOT public.can_manage_store_listings(sid) THEN
    RAISE EXCEPTION 'no store profile';
  END IF;

  SELECT * INTO r FROM public.store_price_rules WHERE store_id = sid AND is_default;
  IF r.id IS NULL THEN
    INSERT INTO public.store_price_rules (store_id, name, is_default)
    VALUES (sid, 'Default', true)
    RETURNING * INTO r;
  END IF;
  RETURN r;
END;
$$;

-- ── RPCs: store-order fulfilment honours the shipper role ───────────────────
CREATE OR REPLACE FUNCTION public.mark_store_order_shipped("_order_id" uuid, "_tracking" text, "_carrier" text)
RETURNS public.store_order_shipments
LANGUAGE plpgsql SECURITY DEFINER SET search_path TO 'public'
AS $$
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
$$;

CREATE OR REPLACE FUNCTION public.submit_store_order_address("_order_id" uuid, "_address" jsonb)
RETURNS public.store_order_addresses
LANGUAGE plpgsql SECURITY DEFINER SET search_path TO 'public'
AS $$
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
  IF caller <> o.buyer_user_id AND NOT public.can_fulfil_store_orders(o.store_id) THEN
    RAISE EXCEPTION 'Not a participant';
  END IF;
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
$$;

CREATE OR REPLACE FUNCTION public.get_store_order_destination_address("_order_id" uuid)
RETURNS jsonb
LANGUAGE plpgsql STABLE SECURITY DEFINER SET search_path TO 'public'
AS $$
DECLARE
  caller uuid := auth.uid();
  dest jsonb;
BEGIN
  IF caller IS NULL THEN RETURN NULL; END IF;
  SELECT oa.address INTO dest
    FROM public.store_orders o
    JOIN public.store_order_addresses oa
      ON oa.order_id = o.id AND oa.user_id = o.buyer_user_id
   WHERE o.id = _order_id AND public.can_fulfil_store_orders(o.store_id);
  RETURN dest;
END;
$$;

CREATE OR REPLACE FUNCTION public.get_store_order_shipment("_order_id" uuid)
RETURNS TABLE("id" uuid, "sender_user_id" uuid, "recipient_user_id" uuid, "status" text, "tracking_number" text, "carrier" text, "shipped_at" timestamp with time zone, "delivered_at" timestamp with time zone)
LANGUAGE sql STABLE SECURITY DEFINER SET search_path TO 'public'
AS $$
  SELECT s.id, s.sender_user_id, s.recipient_user_id, s.status,
         s.tracking_number,
         (s.metadata->>'carrier')::text AS carrier,
         s.shipped_at, s.delivered_at
    FROM public.store_order_shipments s
    JOIN public.store_orders o ON o.id = s.order_id
   WHERE s.order_id = _order_id
     AND (auth.uid() = o.buyer_user_id OR public.can_fulfil_store_orders(o.store_id));
$$;
