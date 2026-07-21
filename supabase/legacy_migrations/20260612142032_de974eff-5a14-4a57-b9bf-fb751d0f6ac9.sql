
-- 1. New columns on nav_metrics
ALTER TABLE public.nav_metrics
  ADD COLUMN IF NOT EXISTS from_route text,
  ADD COLUMN IF NOT EXISTS nav_type text,
  ADD COLUMN IF NOT EXISTS connection_type text,
  ADD COLUMN IF NOT EXISTS downlink_mbps numeric,
  ADD COLUMN IF NOT EXISTS save_data boolean,
  ADD COLUMN IF NOT EXISTS is_authenticated boolean,
  ADD COLUMN IF NOT EXISTS referrer_host text,
  ADD COLUMN IF NOT EXISTS web_vitals_lcp_ms numeric,
  ADD COLUMN IF NOT EXISTS web_vitals_inp_ms numeric,
  ADD COLUMN IF NOT EXISTS web_vitals_cls numeric,
  ADD COLUMN IF NOT EXISTS region text;

-- Replace any prior duration check with a sane bounded one
DO $$
DECLARE c text;
BEGIN
  FOR c IN
    SELECT conname FROM pg_constraint
    WHERE conrelid = 'public.nav_metrics'::regclass
      AND contype = 'c'
      AND pg_get_constraintdef(oid) ILIKE '%duration_ms%'
  LOOP
    EXECUTE format('ALTER TABLE public.nav_metrics DROP CONSTRAINT %I', c);
  END LOOP;
END $$;

ALTER TABLE public.nav_metrics
  ADD CONSTRAINT nav_metrics_duration_range
  CHECK (duration_ms >= 0 AND duration_ms <= 60000);

CREATE INDEX IF NOT EXISTS nav_metrics_route_prefetched_created_idx
  ON public.nav_metrics (route, prefetched, created_at DESC);

-- 2. Roles
DO $$ BEGIN
  CREATE TYPE public.app_role AS ENUM ('admin', 'moderator', 'user');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

CREATE TABLE IF NOT EXISTS public.user_roles (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  role public.app_role NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (user_id, role)
);

GRANT SELECT ON public.user_roles TO authenticated;
GRANT ALL ON public.user_roles TO service_role;

ALTER TABLE public.user_roles ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users can view their own roles" ON public.user_roles;
CREATE POLICY "Users can view their own roles"
  ON public.user_roles FOR SELECT
  TO authenticated
  USING (auth.uid() = user_id);

CREATE OR REPLACE FUNCTION public.has_role(_user_id uuid, _role public.app_role)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.user_roles
    WHERE user_id = _user_id AND role = _role
  )
$$;

-- 3. Admin can read nav_metrics
DROP POLICY IF EXISTS "Admins can read nav_metrics" ON public.nav_metrics;
CREATE POLICY "Admins can read nav_metrics"
  ON public.nav_metrics FOR SELECT
  TO authenticated
  USING (public.has_role(auth.uid(), 'admin'));

GRANT SELECT ON public.nav_metrics TO authenticated;

-- 4. Aggregated summary function (admin-only)
CREATE OR REPLACE FUNCTION public.get_nav_metrics_summary(_days int DEFAULT 7)
RETURNS jsonb
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  result jsonb;
BEGIN
  IF NOT public.has_role(auth.uid(), 'admin') THEN
    RAISE EXCEPTION 'forbidden';
  END IF;

  WITH base AS (
    SELECT *
    FROM public.nav_metrics
    WHERE created_at > now() - make_interval(days => _days)
  ),
  by_route AS (
    SELECT route, prefetched,
           count(*)::int AS count,
           round(avg(duration_ms))::int AS avg_ms,
           round(percentile_cont(0.5) WITHIN GROUP (ORDER BY duration_ms))::int AS p50_ms,
           round(percentile_cont(0.95) WITHIN GROUP (ORDER BY duration_ms))::int AS p95_ms
    FROM base
    GROUP BY route, prefetched
  ),
  by_version AS (
    SELECT coalesce(app_version, 'unknown') AS app_version,
           count(*)::int AS count,
           round(percentile_cont(0.95) WITHIN GROUP (ORDER BY duration_ms))::int AS p95_ms
    FROM base
    GROUP BY 1
  ),
  by_os AS (
    SELECT coalesce(os_name, 'unknown') AS os_name,
           count(*)::int AS count,
           round(avg(duration_ms))::int AS avg_ms,
           round(percentile_cont(0.95) WITHIN GROUP (ORDER BY duration_ms))::int AS p95_ms
    FROM base
    GROUP BY 1
  ),
  by_conn AS (
    SELECT coalesce(connection_type, 'unknown') AS connection_type,
           count(*)::int AS count,
           round(percentile_cont(0.95) WITHIN GROUP (ORDER BY duration_ms))::int AS p95_ms
    FROM base
    GROUP BY 1
  ),
  by_transition AS (
    SELECT coalesce(from_route, '(initial)') AS from_route,
           route,
           count(*)::int AS count,
           round(percentile_cont(0.95) WITHIN GROUP (ORDER BY duration_ms))::int AS p95_ms
    FROM base
    GROUP BY 1, 2
    ORDER BY p95_ms DESC NULLS LAST
    LIMIT 20
  )
  SELECT jsonb_build_object(
    'total', (SELECT count(*) FROM base),
    'days', _days,
    'by_route', coalesce((SELECT jsonb_agg(by_route) FROM by_route), '[]'::jsonb),
    'by_version', coalesce((SELECT jsonb_agg(by_version) FROM by_version), '[]'::jsonb),
    'by_os', coalesce((SELECT jsonb_agg(by_os) FROM by_os), '[]'::jsonb),
    'by_connection', coalesce((SELECT jsonb_agg(by_conn) FROM by_conn), '[]'::jsonb),
    'worst_transitions', coalesce((SELECT jsonb_agg(by_transition) FROM by_transition), '[]'::jsonb)
  ) INTO result;

  RETURN result;
END;
$$;

GRANT EXECUTE ON FUNCTION public.get_nav_metrics_summary(int) TO authenticated;
