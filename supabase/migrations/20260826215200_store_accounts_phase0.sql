-- CollectX for Business — Phase 0 foundations.
-- Store identity + application funnel + a per-account fee hook. No store exists
-- yet; this is the primitive layer every later phase leans on.
--
-- A "store" is defined by an ACTIVE row in store_profiles (not an app_role
-- value) — avoids the ALTER TYPE ADD VALUE-in-transaction hazard and keeps the
-- definition data-driven. is_active_store() mirrors has_role() for RLS.

-- ============================================================================
-- 1. store_applications — the funnel. Anyone signed in can apply once.
-- ============================================================================
CREATE TABLE public.store_applications (
  id              uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id         uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  business_name   text NOT NULL,
  registration_no text,
  country         text NOT NULL,
  website         text,
  volume_estimate text,
  message         text,
  status          text NOT NULL DEFAULT 'submitted'
                    CHECK (status IN ('submitted', 'approved', 'rejected', 'needs_info')),
  review_note     text,
  reviewed_by     uuid REFERENCES auth.users(id),
  reviewed_at     timestamptz,
  created_at      timestamptz NOT NULL DEFAULT now(),
  updated_at      timestamptz NOT NULL DEFAULT now()
);

-- One open application per user.
CREATE UNIQUE INDEX store_applications_one_open_per_user
  ON public.store_applications (user_id)
  WHERE status IN ('submitted', 'needs_info');

CREATE INDEX store_applications_status_idx ON public.store_applications (status, created_at DESC);

ALTER TABLE public.store_applications ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Applicants see their own application"
  ON public.store_applications FOR SELECT
  USING (auth.uid() = user_id OR public.has_role(auth.uid(), 'admin'));

CREATE POLICY "Signed-in users can apply for themselves"
  ON public.store_applications FOR INSERT
  WITH CHECK (auth.uid() = user_id AND status = 'submitted');

-- Applicants may edit their own only while still open (e.g. answer needs_info);
-- status transitions are done by the admin review RPC (service role).
CREATE POLICY "Applicants edit their own while open"
  ON public.store_applications FOR UPDATE
  USING (auth.uid() = user_id AND status IN ('submitted', 'needs_info'))
  WITH CHECK (auth.uid() = user_id AND status IN ('submitted', 'needs_info'));

CREATE TRIGGER update_store_applications_updated_at
  BEFORE UPDATE ON public.store_applications
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

GRANT SELECT, INSERT, UPDATE ON public.store_applications TO authenticated;
GRANT ALL ON public.store_applications TO service_role;

-- ============================================================================
-- 2. store_profiles — the store identity. Created (pending) on approval.
-- ============================================================================
CREATE TABLE public.store_profiles (
  user_id           uuid PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  slug              text UNIQUE NOT NULL,
  name              text NOT NULL,
  bio               text,
  logo_url          text,
  banner_url        text,
  website           text,
  location          jsonb,          -- {city, country, lat, lng}
  policies          jsonb,          -- {shipping: [...], returns: "..."}
  status            text NOT NULL DEFAULT 'pending'
                      CHECK (status IN ('pending', 'active', 'suspended')),
  verified_at       timestamptz,
  commission_bps    int NOT NULL DEFAULT 800,   -- 8%; founder cohort set to 300
  subscription_tier text NOT NULL DEFAULT 'none'
                      CHECK (subscription_tier IN ('none', 'starter', 'growth', 'pro')),
  application_id    uuid REFERENCES public.store_applications(id),
  created_at        timestamptz NOT NULL DEFAULT now(),
  updated_at        timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX store_profiles_status_idx ON public.store_profiles (status);

ALTER TABLE public.store_profiles ENABLE ROW LEVEL SECURITY;

-- Active storefronts are public; the owner and admins see their own at any status.
CREATE POLICY "Active store profiles are public"
  ON public.store_profiles FOR SELECT
  USING (status = 'active' OR auth.uid() = user_id OR public.has_role(auth.uid(), 'admin'));

-- Owner may edit presentational fields; status / commission / tier are
-- service-role only (set by the approve RPC and, later, billing).
CREATE POLICY "Store owner edits own storefront"
  ON public.store_profiles FOR UPDATE
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

CREATE TRIGGER update_store_profiles_updated_at
  BEFORE UPDATE ON public.store_profiles
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

GRANT SELECT, UPDATE ON public.store_profiles TO authenticated;
GRANT ALL ON public.store_profiles TO service_role;

-- Guard: a store owner must not be able to flip their own status/commission via
-- the UPDATE policy above. Enforce with a trigger that freezes those columns
-- unless the caller is service_role.
CREATE OR REPLACE FUNCTION public.store_profiles_guard()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF current_setting('role', true) IS DISTINCT FROM 'service_role'
     AND NOT public.has_role(auth.uid(), 'admin') THEN
    NEW.status            := OLD.status;
    NEW.commission_bps     := OLD.commission_bps;
    NEW.subscription_tier  := OLD.subscription_tier;
    NEW.verified_at        := OLD.verified_at;
    NEW.slug               := OLD.slug;
    NEW.user_id            := OLD.user_id;
  END IF;
  RETURN NEW;
END;
$$;

CREATE TRIGGER store_profiles_guard_trg
  BEFORE UPDATE ON public.store_profiles
  FOR EACH ROW EXECUTE FUNCTION public.store_profiles_guard();

-- ============================================================================
-- 3. is_active_store() — the RLS/gating helper (mirrors has_role()).
-- ============================================================================
CREATE OR REPLACE FUNCTION public.is_active_store(_user_id uuid)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.store_profiles
     WHERE user_id = _user_id AND status = 'active'
  )
$$;

REVOKE EXECUTE ON FUNCTION public.is_active_store(uuid) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.is_active_store(uuid) TO authenticated, service_role;

-- ============================================================================
-- 4. account_fee_overrides — the hook the whole money model runs on.
-- create-checkout-session reads this for the seller, then falls back to
-- marketplace_fee_config. NULL column = "use the global default".
-- ============================================================================
CREATE TABLE public.account_fee_overrides (
  user_id                  uuid PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  seller_fee_bps           int CHECK (seller_fee_bps IS NULL OR seller_fee_bps BETWEEN 0 AND 5000),
  buyer_protection_fee_bps int CHECK (buyer_protection_fee_bps IS NULL OR buyer_protection_fee_bps BETWEEN 0 AND 5000),
  note                     text,
  updated_at               timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.account_fee_overrides ENABLE ROW LEVEL SECURITY;

-- Readable by the affected user (so the UI can show "your store rate: 3%") and
-- admins. No client writes — set only by service role / admin RPCs.
CREATE POLICY "Users read their own fee override"
  ON public.account_fee_overrides FOR SELECT
  USING (auth.uid() = user_id OR public.has_role(auth.uid(), 'admin'));

CREATE POLICY "No client writes to fee overrides"
  ON public.account_fee_overrides FOR ALL
  USING (false) WITH CHECK (false);

GRANT SELECT ON public.account_fee_overrides TO authenticated;
GRANT ALL ON public.account_fee_overrides TO service_role;

-- ============================================================================
-- 5. review_store_application() — admin-only. Approve creates the (pending)
-- store_profiles row + the founder-rate fee override in one transaction.
-- ============================================================================
CREATE OR REPLACE FUNCTION public.review_store_application(
  _application_id uuid,
  _decision       text,           -- 'approved' | 'rejected' | 'needs_info'
  _note           text DEFAULT NULL,
  _slug           text DEFAULT NULL,
  _commission_bps int  DEFAULT 800
)
RETURNS public.store_applications
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  app     public.store_applications;
  s_slug  text;
BEGIN
  IF NOT public.has_role(auth.uid(), 'admin') THEN
    RAISE EXCEPTION 'admin only';
  END IF;
  IF _decision NOT IN ('approved', 'rejected', 'needs_info') THEN
    RAISE EXCEPTION 'decision must be approved | rejected | needs_info';
  END IF;

  SELECT * INTO app FROM public.store_applications WHERE id = _application_id FOR UPDATE;
  IF app.id IS NULL THEN RAISE EXCEPTION 'application not found'; END IF;

  UPDATE public.store_applications
     SET status      = _decision,
         review_note = _note,
         reviewed_by = auth.uid(),
         reviewed_at = now(),
         updated_at  = now()
   WHERE id = _application_id
  RETURNING * INTO app;

  IF _decision = 'approved' THEN
    s_slug := COALESCE(
      NULLIF(regexp_replace(lower(coalesce(_slug, app.business_name)), '[^a-z0-9]+', '-', 'g'), ''),
      'store-' || left(replace(app.id::text, '-', ''), 8)
    );
    s_slug := trim(both '-' from s_slug);

    INSERT INTO public.store_profiles (user_id, slug, name, website, status, commission_bps, application_id)
    VALUES (app.user_id, s_slug, app.business_name, app.website, 'pending', _commission_bps, app.id)
    ON CONFLICT (user_id) DO UPDATE
      SET status = 'pending', name = EXCLUDED.name, commission_bps = EXCLUDED.commission_bps, updated_at = now();

    INSERT INTO public.account_fee_overrides (user_id, seller_fee_bps, note)
    VALUES (app.user_id, _commission_bps, 'store seller commission (set on approval)')
    ON CONFLICT (user_id) DO UPDATE
      SET seller_fee_bps = EXCLUDED.seller_fee_bps, note = EXCLUDED.note, updated_at = now();

    INSERT INTO public.notifications (user_id, type, title, message, data, action_url)
    VALUES (app.user_id, 'store_approved', 'Your store is approved',
            'Finish setting up your storefront to start selling.',
            jsonb_build_object('application_id', app.id), '/store/setup');
  ELSE
    INSERT INTO public.notifications (user_id, type, title, message, data, action_url)
    VALUES (app.user_id, 'store_' || _decision,
            CASE _decision WHEN 'rejected' THEN 'Store application not approved'
                           ELSE 'We need a bit more information' END,
            COALESCE(_note, 'See your application for details.'),
            jsonb_build_object('application_id', app.id), '/store/apply');
  END IF;

  RETURN app;
END;
$$;

REVOKE ALL ON FUNCTION public.review_store_application(uuid, text, text, text, int) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.review_store_application(uuid, text, text, text, int) TO authenticated;

-- activate_store(): owner flips their storefront pending -> active once set up.
CREATE OR REPLACE FUNCTION public.activate_store()
RETURNS public.store_profiles
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE sp public.store_profiles;
BEGIN
  SELECT * INTO sp FROM public.store_profiles WHERE user_id = auth.uid() FOR UPDATE;
  IF sp.user_id IS NULL THEN RAISE EXCEPTION 'no store profile'; END IF;
  IF sp.status = 'suspended' THEN RAISE EXCEPTION 'store is suspended'; END IF;

  UPDATE public.store_profiles
     SET status = 'active', verified_at = COALESCE(verified_at, now()), updated_at = now()
   WHERE user_id = auth.uid()
  RETURNING * INTO sp;
  RETURN sp;
END;
$$;

REVOKE ALL ON FUNCTION public.activate_store() FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.activate_store() TO authenticated;
