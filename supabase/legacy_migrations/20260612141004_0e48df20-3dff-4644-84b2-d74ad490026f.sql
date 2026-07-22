CREATE TABLE public.nav_metrics (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  session_id text NOT NULL,
  route text NOT NULL,
  prefetched boolean NOT NULL,
  duration_ms integer NOT NULL CHECK (duration_ms >= 0 AND duration_ms < 600000),
  user_agent text,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX nav_metrics_route_idx ON public.nav_metrics (route);
CREATE INDEX nav_metrics_created_at_idx ON public.nav_metrics (created_at DESC);

GRANT INSERT ON public.nav_metrics TO anon, authenticated;
GRANT ALL ON public.nav_metrics TO service_role;

ALTER TABLE public.nav_metrics ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone can insert nav metrics"
  ON public.nav_metrics
  FOR INSERT
  TO anon, authenticated
  WITH CHECK (true);
