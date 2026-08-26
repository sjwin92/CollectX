-- CollectX for Business — Phase 4: the subscription.
--
-- Revenue line #5 (per docs/collectx-for-business.html): "pay 8% per sale, or
-- £49/mo and pay 3%." A store subscribes to a monthly plan; while active, the
-- plan's rate replaces the per-sale seller commission (via the same
-- account_fee_overrides hook every checkout already reads). High-volume stores
-- self-select into the subscription; the platform trades variable take for
-- predictable MRR.
--
-- Also: store_members — owner / lister / shipper seats under one store_id.
-- (The roster + a role helper ship here; wiring member roles into every store
-- surface's RLS is a follow-up — see the handover.)

-- ============================================================================
-- 1. business_plans — the tier catalogue (one row per tier, tunable)
-- ============================================================================
CREATE TABLE public.business_plans (
  id            text PRIMARY KEY CHECK (id IN ('starter', 'growth', 'pro')),
  name          text NOT NULL,
  price_gbp     numeric(12,2) NOT NULL CHECK (price_gbp >= 0),
  seller_fee_bps int NOT NULL CHECK (seller_fee_bps BETWEEN 0 AND 2000),
  blurb         text,
  sort          int NOT NULL DEFAULT 0,
  active        boolean NOT NULL DEFAULT true,
  updated_at    timestamptz NOT NULL DEFAULT now()
);

INSERT INTO public.business_plans (id, name, price_gbp, seller_fee_bps, blurb, sort) VALUES
  ('starter', 'Starter', 19.00, 600, 'Repricer + analytics. Seller commission drops to 6%.', 1),
  ('growth',  'Growth',  49.00, 300, 'Everything in Starter + team seats. Commission drops to 3%.', 2),
  ('pro',     'Pro',     99.00,   0, 'Zero seller commission + priority support and featured slots.', 3)
ON CONFLICT (id) DO NOTHING;

ALTER TABLE public.business_plans ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Anyone can read business plans"
  ON public.business_plans FOR SELECT USING (true);
CREATE POLICY "No direct writes to business_plans"
  ON public.business_plans FOR ALL USING (false) WITH CHECK (false);
GRANT SELECT ON public.business_plans TO anon, authenticated;

-- ============================================================================
-- 2. store_subscriptions — one per store
-- ============================================================================
CREATE TABLE public.store_subscriptions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  store_id uuid NOT NULL UNIQUE REFERENCES public.store_profiles(user_id) ON DELETE CASCADE,
  plan_id text NOT NULL REFERENCES public.business_plans(id),
  status text NOT NULL DEFAULT 'incomplete'
    CHECK (status IN ('incomplete', 'active', 'past_due', 'canceled')),
  seller_fee_bps int NOT NULL,        -- snapshot of the plan rate at subscribe time
  price_gbp numeric(12,2) NOT NULL,   -- snapshot
  stripe_customer_id text,
  stripe_subscription_id text UNIQUE,
  current_period_end timestamptz,
  cancel_at_period_end boolean NOT NULL DEFAULT false,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX store_subscriptions_status_idx ON public.store_subscriptions (status);

ALTER TABLE public.store_subscriptions ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Store owner views own subscription"
  ON public.store_subscriptions FOR SELECT
  USING (auth.uid() = store_id);
CREATE POLICY "No direct inserts to store_subscriptions"
  ON public.store_subscriptions FOR INSERT WITH CHECK (false);
CREATE POLICY "No direct updates to store_subscriptions"
  ON public.store_subscriptions FOR UPDATE USING (false);

CREATE TRIGGER update_store_subscriptions_updated_at
  BEFORE UPDATE ON public.store_subscriptions
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

GRANT SELECT ON public.store_subscriptions TO authenticated;
GRANT ALL ON public.store_subscriptions TO service_role;

-- ============================================================================
-- 3. store_members — owner / lister / shipper seats
-- ============================================================================
CREATE TABLE public.store_members (
  store_id uuid NOT NULL REFERENCES public.store_profiles(user_id) ON DELETE CASCADE,
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  role text NOT NULL CHECK (role IN ('owner', 'lister', 'shipper')),
  created_at timestamptz NOT NULL DEFAULT now(),
  PRIMARY KEY (store_id, user_id),
  CHECK (user_id <> store_id)   -- the owner is implicit, never a member row
);

CREATE INDEX store_members_user_idx ON public.store_members (user_id);

ALTER TABLE public.store_members ENABLE ROW LEVEL SECURITY;

-- The store owner manages the whole roster; a member can see their own row.
CREATE POLICY "Store owner manages roster"
  ON public.store_members FOR ALL
  USING (auth.uid() = store_id)
  WITH CHECK (auth.uid() = store_id);
CREATE POLICY "Members see own membership"
  ON public.store_members FOR SELECT
  USING (auth.uid() = user_id);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.store_members TO authenticated;
GRANT ALL ON public.store_members TO service_role;

-- Role of a user at a store: 'owner' if they are the store, else their
-- store_members role, else NULL. Available for a future RLS pass that lets
-- members act on inventory / buylist / orders.
CREATE OR REPLACE FUNCTION public.store_member_role(_store_id uuid, _user_id uuid)
RETURNS text
LANGUAGE sql
STABLE SECURITY DEFINER
SET search_path = public
AS $$
  SELECT CASE
    WHEN _user_id = _store_id THEN 'owner'
    ELSE (SELECT role FROM public.store_members WHERE store_id = _store_id AND user_id = _user_id)
  END
$$;
REVOKE ALL ON FUNCTION public.store_member_role(uuid, uuid) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.store_member_role(uuid, uuid) TO authenticated, service_role;

-- ============================================================================
-- 4. Subscription lifecycle — service-role only, called from stripe-webhook.
-- They flip store_profiles.subscription_tier + the account_fee_overrides
-- commission, which the store_profiles_guard trigger only allows for the
-- service_role caller.
-- ============================================================================

-- While a plan is active the effective seller commission is the BETTER of the
-- store's standing rate (store_profiles.commission_bps — founder 300 / std 800)
-- and the plan rate.
CREATE OR REPLACE FUNCTION public.activate_business_subscription(
  _store_id uuid,
  _plan_id text,
  _stripe_customer_id text,
  _stripe_subscription_id text,
  _current_period_end timestamptz
)
RETURNS public.store_subscriptions
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
DECLARE
  pl public.business_plans;
  sp public.store_profiles;
  effective_bps int;
  s public.store_subscriptions;
BEGIN
  SELECT * INTO pl FROM public.business_plans WHERE id = _plan_id AND active;
  IF pl.id IS NULL THEN RAISE EXCEPTION 'Unknown plan %', _plan_id; END IF;

  SELECT * INTO sp FROM public.store_profiles WHERE user_id = _store_id;
  IF sp.user_id IS NULL THEN RAISE EXCEPTION 'No store profile'; END IF;

  effective_bps := LEAST(sp.commission_bps, pl.seller_fee_bps);

  INSERT INTO public.store_subscriptions (
    store_id, plan_id, status, seller_fee_bps, price_gbp,
    stripe_customer_id, stripe_subscription_id, current_period_end
  ) VALUES (
    _store_id, pl.id, 'active', pl.seller_fee_bps, pl.price_gbp,
    _stripe_customer_id, _stripe_subscription_id, _current_period_end
  )
  ON CONFLICT (store_id) DO UPDATE SET
    plan_id = EXCLUDED.plan_id,
    status = 'active',
    seller_fee_bps = EXCLUDED.seller_fee_bps,
    price_gbp = EXCLUDED.price_gbp,
    stripe_customer_id = COALESCE(EXCLUDED.stripe_customer_id, store_subscriptions.stripe_customer_id),
    stripe_subscription_id = COALESCE(EXCLUDED.stripe_subscription_id, store_subscriptions.stripe_subscription_id),
    current_period_end = COALESCE(EXCLUDED.current_period_end, store_subscriptions.current_period_end),
    cancel_at_period_end = false,
    updated_at = now()
  RETURNING * INTO s;

  UPDATE public.store_profiles
     SET subscription_tier = pl.id, updated_at = now()
   WHERE user_id = _store_id;

  INSERT INTO public.account_fee_overrides (user_id, seller_fee_bps, note)
  VALUES (_store_id, effective_bps, 'business subscription: ' || pl.id)
  ON CONFLICT (user_id) DO UPDATE SET
    seller_fee_bps = EXCLUDED.seller_fee_bps,
    note = EXCLUDED.note,
    updated_at = now();

  INSERT INTO public.notifications (user_id, type, title, message, data, action_url)
  VALUES (_store_id, 'business_subscription_active', 'You''re on ' || pl.name,
          'Your seller commission is now ' || to_char(effective_bps / 100.0, 'FM990.0') || '%.',
          jsonb_build_object('plan_id', pl.id), '/store/plan');

  RETURN s;
END;
$function$;

-- Reset to the store's standing per-sale commission.
CREATE OR REPLACE FUNCTION public.deactivate_business_subscription(_store_id uuid)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
DECLARE sp public.store_profiles;
BEGIN
  SELECT * INTO sp FROM public.store_profiles WHERE user_id = _store_id;
  IF sp.user_id IS NULL THEN RETURN; END IF;

  UPDATE public.store_subscriptions
     SET status = 'canceled', cancel_at_period_end = false, updated_at = now()
   WHERE store_id = _store_id;

  UPDATE public.store_profiles
     SET subscription_tier = 'none', updated_at = now()
   WHERE user_id = _store_id;

  UPDATE public.account_fee_overrides
     SET seller_fee_bps = sp.commission_bps,
         note = 'store seller commission (subscription ended)',
         updated_at = now()
   WHERE user_id = _store_id;

  INSERT INTO public.notifications (user_id, type, title, message, data, action_url)
  VALUES (_store_id, 'business_subscription_ended', 'Subscription ended',
          'Your seller commission is back to ' || to_char(sp.commission_bps / 100.0, 'FM990.0') || '%.',
          '{}'::jsonb, '/store/plan');
END;
$function$;

-- Ongoing sync from Stripe subscription events (matched by stripe id).
CREATE OR REPLACE FUNCTION public.sync_business_subscription(
  _stripe_subscription_id text,
  _status text,
  _current_period_end timestamptz,
  _cancel_at_period_end boolean
)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
DECLARE s public.store_subscriptions;
BEGIN
  SELECT * INTO s FROM public.store_subscriptions WHERE stripe_subscription_id = _stripe_subscription_id;
  IF s.id IS NULL THEN RETURN; END IF;

  IF _status IN ('canceled', 'incomplete_expired', 'unpaid') THEN
    PERFORM public.deactivate_business_subscription(s.store_id);
    RETURN;
  END IF;

  UPDATE public.store_subscriptions
     SET status = CASE
                    WHEN _status = 'past_due' THEN 'past_due'
                    WHEN _status IN ('active', 'trialing') THEN 'active'
                    ELSE s.status
                  END,
         current_period_end = COALESCE(_current_period_end, s.current_period_end),
         cancel_at_period_end = COALESCE(_cancel_at_period_end, s.cancel_at_period_end),
         updated_at = now()
   WHERE id = s.id;
END;
$function$;

REVOKE ALL ON FUNCTION public.activate_business_subscription(uuid, text, text, text, timestamptz) FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION public.deactivate_business_subscription(uuid) FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION public.sync_business_subscription(text, text, timestamptz, boolean) FROM PUBLIC, anon, authenticated;

GRANT EXECUTE ON FUNCTION public.activate_business_subscription(uuid, text, text, text, timestamptz) TO service_role;
GRANT EXECUTE ON FUNCTION public.deactivate_business_subscription(uuid) TO service_role;
GRANT EXECUTE ON FUNCTION public.sync_business_subscription(text, text, timestamptz, boolean) TO service_role;
