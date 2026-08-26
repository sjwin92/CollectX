-- CollectX for Business — Phase 2c: promoted listings.
--
-- Revenue line #3 (per docs/collectx-for-business.html): a store pays a flat
-- fee to feature a SKU or pin its storefront in the marketplace. This is a
-- PLATFORM charge — no Stripe Connect transfer, no seller commission, pure
-- platform revenue. Commission on the eventual sale is unchanged.
--
-- Same discipline as orders / store_orders: no client INSERT/UPDATE, every
-- transition via a SECURITY DEFINER RPC, money-confirmed transitions are
-- service_role only (called from the Stripe webhook).

-- ============================================================================
-- 1. promotion_price_config — singleton, tunable without a redeploy
-- ============================================================================
CREATE TABLE public.promotion_price_config (
  id int PRIMARY KEY DEFAULT 1 CHECK (id = 1),
  sku_feature_gbp   numeric(12,2) NOT NULL DEFAULT 2.99,
  storefront_pin_gbp numeric(12,2) NOT NULL DEFAULT 9.99,
  duration_days     int NOT NULL DEFAULT 7 CHECK (duration_days BETWEEN 1 AND 90),
  currency          text NOT NULL DEFAULT 'gbp',
  updated_at        timestamptz NOT NULL DEFAULT now()
);

INSERT INTO public.promotion_price_config (id) VALUES (1) ON CONFLICT DO NOTHING;

ALTER TABLE public.promotion_price_config ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone can read promotion pricing"
  ON public.promotion_price_config FOR SELECT USING (true);

CREATE POLICY "No direct writes to promotion_price_config"
  ON public.promotion_price_config FOR ALL USING (false) WITH CHECK (false);

-- ============================================================================
-- 2. store_promotions
-- ============================================================================
CREATE TABLE public.store_promotions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  store_id uuid NOT NULL REFERENCES public.store_profiles(user_id) ON DELETE CASCADE,
  -- NULL inventory_id == a storefront pin (boosts all of the store's SKUs).
  inventory_id uuid REFERENCES public.store_inventory(id) ON DELETE CASCADE,
  kind text NOT NULL CHECK (kind IN ('sku_feature', 'storefront_pin')),
  status text NOT NULL DEFAULT 'pending_payment'
    CHECK (status IN ('pending_payment', 'active', 'cancelled', 'expired')),
  amount_gbp numeric(12,2) NOT NULL,
  currency text NOT NULL DEFAULT 'gbp',
  starts_at timestamptz,
  ends_at timestamptz,
  stripe_checkout_session_id text UNIQUE,
  stripe_payment_intent_id text UNIQUE,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  CHECK ((kind = 'sku_feature' AND inventory_id IS NOT NULL)
      OR (kind = 'storefront_pin' AND inventory_id IS NULL))
);

CREATE INDEX store_promotions_store_idx ON public.store_promotions (store_id);
CREATE INDEX store_promotions_live_sku_idx ON public.store_promotions (inventory_id)
  WHERE status = 'active' AND inventory_id IS NOT NULL;
CREATE INDEX store_promotions_expiry_idx ON public.store_promotions (ends_at) WHERE status = 'active';
-- One live promotion per target (per SKU, or per storefront). Partial unique.
CREATE UNIQUE INDEX store_promotions_one_live_sku
  ON public.store_promotions (inventory_id)
  WHERE status IN ('pending_payment', 'active') AND inventory_id IS NOT NULL;
CREATE UNIQUE INDEX store_promotions_one_live_pin
  ON public.store_promotions (store_id)
  WHERE status IN ('pending_payment', 'active') AND kind = 'storefront_pin';

ALTER TABLE public.store_promotions ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Store owner views own promotions"
  ON public.store_promotions FOR SELECT
  USING (auth.uid() = store_id);

-- The marketplace reads this (as anon) to badge featured SKUs and boost
-- pinned storefronts — only currently-running promotions are visible.
CREATE POLICY "Live promotions are public"
  ON public.store_promotions FOR SELECT
  USING (status = 'active' AND ends_at > now());

CREATE POLICY "No direct inserts to store_promotions"
  ON public.store_promotions FOR INSERT WITH CHECK (false);

CREATE POLICY "No direct updates to store_promotions"
  ON public.store_promotions FOR UPDATE USING (false);

CREATE TRIGGER update_store_promotions_updated_at
  BEFORE UPDATE ON public.store_promotions
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

GRANT SELECT ON public.store_promotions TO anon, authenticated;
GRANT ALL ON public.store_promotions TO service_role;

-- ============================================================================
-- 3. create_store_promotion — service-role only. Called by the
-- create-promotion-checkout edge function after it authenticates the store
-- owner. Validates + inserts a pending_payment promotion, priced from config.
-- ============================================================================
CREATE OR REPLACE FUNCTION public.create_store_promotion(
  _store_id uuid,
  _inventory_id uuid,
  _kind text
)
RETURNS public.store_promotions
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
DECLARE
  sp public.store_profiles;
  inv public.store_inventory;
  cfg public.promotion_price_config;
  amt numeric(12,2);
  p public.store_promotions;
BEGIN
  IF _kind NOT IN ('sku_feature', 'storefront_pin') THEN
    RAISE EXCEPTION 'Unknown promotion type';
  END IF;

  SELECT * INTO sp FROM public.store_profiles WHERE user_id = _store_id;
  IF sp.user_id IS NULL OR sp.status <> 'active' THEN
    RAISE EXCEPTION 'Your store must be live to promote listings';
  END IF;

  SELECT * INTO cfg FROM public.promotion_price_config WHERE id = 1;

  IF _kind = 'sku_feature' THEN
    IF _inventory_id IS NULL THEN RAISE EXCEPTION 'Pick a card to feature'; END IF;
    SELECT * INTO inv FROM public.store_inventory WHERE id = _inventory_id;
    IF inv.id IS NULL OR inv.store_id <> _store_id THEN
      RAISE EXCEPTION 'That SKU is not in your inventory';
    END IF;
    IF NOT inv.listed OR inv.price_gbp IS NULL THEN
      RAISE EXCEPTION 'List and price the card before featuring it';
    END IF;
    amt := cfg.sku_feature_gbp;
  ELSE
    _inventory_id := NULL;
    amt := cfg.storefront_pin_gbp;
  END IF;

  -- The partial unique indexes also guard this, but a clean message is nicer.
  IF EXISTS (
    SELECT 1 FROM public.store_promotions
     WHERE status IN ('pending_payment', 'active')
       AND ( (_kind = 'sku_feature' AND inventory_id = _inventory_id)
          OR (_kind = 'storefront_pin' AND store_id = _store_id AND kind = 'storefront_pin') )
  ) THEN
    RAISE EXCEPTION 'This is already promoted (or a checkout is pending)';
  END IF;

  INSERT INTO public.store_promotions (store_id, inventory_id, kind, amount_gbp, currency)
  VALUES (_store_id, _inventory_id, _kind, amt, cfg.currency)
  RETURNING * INTO p;
  RETURN p;
END;
$function$;

CREATE OR REPLACE FUNCTION public.activate_store_promotion(_promotion_id uuid, _stripe_payment_intent_id text)
RETURNS public.store_promotions
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
DECLARE
  cfg public.promotion_price_config;
  p public.store_promotions;
BEGIN
  SELECT * INTO cfg FROM public.promotion_price_config WHERE id = 1;

  UPDATE public.store_promotions
     SET status = 'active',
         starts_at = now(),
         ends_at = now() + make_interval(days => cfg.duration_days),
         stripe_payment_intent_id = _stripe_payment_intent_id,
         updated_at = now()
   WHERE id = _promotion_id AND status = 'pending_payment'
  RETURNING * INTO p;

  IF p.id IS NULL THEN
    RETURN NULL;  -- already processed / not found — webhook must be idempotent
  END IF;

  INSERT INTO public.notifications (user_id, type, title, message, data, action_url)
  VALUES (p.store_id, 'store_promotion_active',
          CASE WHEN p.kind = 'storefront_pin' THEN 'Storefront pinned' ELSE 'Listing featured' END,
          'Your promotion is live until ' || to_char(p.ends_at, 'DD Mon') || '.',
          jsonb_build_object('promotion_id', p.id),
          CASE WHEN p.kind = 'storefront_pin' THEN '/store/setup' ELSE '/store/inventory' END);

  RETURN p;
END;
$function$;

CREATE OR REPLACE FUNCTION public.fail_store_promotion(_promotion_id uuid)
RETURNS public.store_promotions
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
DECLARE p public.store_promotions;
BEGIN
  UPDATE public.store_promotions
     SET status = 'cancelled', updated_at = now()
   WHERE id = _promotion_id AND status = 'pending_payment'
  RETURNING * INTO p;
  RETURN p;  -- NULL when already handled
END;
$function$;

-- Housekeeping: flip lapsed promotions to 'expired'. Marketplace queries also
-- filter on ends_at, so this is cosmetic + keeps the partial unique indexes
-- from blocking a re-promote after expiry. Run from pg_cron below.
CREATE OR REPLACE FUNCTION public.expire_store_promotions()
RETURNS integer
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
DECLARE n integer;
BEGIN
  UPDATE public.store_promotions
     SET status = 'expired', updated_at = now()
   WHERE status = 'active' AND ends_at <= now();
  GET DIAGNOSTICS n = ROW_COUNT;
  RETURN n;
END;
$function$;

REVOKE ALL ON FUNCTION public.create_store_promotion(uuid, uuid, text) FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION public.activate_store_promotion(uuid, text) FROM PUBLIC;
REVOKE ALL ON FUNCTION public.fail_store_promotion(uuid) FROM PUBLIC;
REVOKE ALL ON FUNCTION public.expire_store_promotions() FROM PUBLIC, anon, authenticated;

GRANT EXECUTE ON FUNCTION public.create_store_promotion(uuid, uuid, text) TO service_role;
GRANT EXECUTE ON FUNCTION public.activate_store_promotion(uuid, text) TO service_role;
GRANT EXECUTE ON FUNCTION public.fail_store_promotion(uuid) TO service_role;
GRANT EXECUTE ON FUNCTION public.expire_store_promotions() TO service_role;

-- ============================================================================
-- 4. pg_cron — expire lapsed promotions every 30 minutes. Pure SQL, no HTTP
-- and no shared secret needed (unlike auto-confirm-orders).
-- ============================================================================
CREATE EXTENSION IF NOT EXISTS pg_cron WITH SCHEMA extensions;

SELECT cron.schedule(
  'expire-store-promotions',
  '*/30 * * * *',
  $$ SELECT public.expire_store_promotions(); $$
);
