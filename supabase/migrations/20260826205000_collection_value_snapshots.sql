-- Daily portfolio-value snapshots, so the collection page can show value over
-- time. Written client-side (one upsert per day per user when they view their
-- collection) — low-stakes, user-owned data, so unlike the grading/marketplace
-- tables the owner gets direct insert/update here.

CREATE TABLE IF NOT EXISTS public.collection_value_snapshots (
  user_id        uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  day            date NOT NULL DEFAULT (now() AT TIME ZONE 'utc')::date,
  total_gbp      numeric(12,2) NOT NULL DEFAULT 0,
  raw_market_gbp numeric(12,2) NOT NULL DEFAULT 0,
  units          integer NOT NULL DEFAULT 0,
  graded_units   integer NOT NULL DEFAULT 0,
  updated_at     timestamptz NOT NULL DEFAULT now(),
  PRIMARY KEY (user_id, day)
);

CREATE INDEX IF NOT EXISTS collection_value_snapshots_user_day_idx
  ON public.collection_value_snapshots (user_id, day DESC);

ALTER TABLE public.collection_value_snapshots ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users read own value snapshots"
  ON public.collection_value_snapshots FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users insert own value snapshots"
  ON public.collection_value_snapshots FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users update own value snapshots"
  ON public.collection_value_snapshots FOR UPDATE
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

GRANT SELECT, INSERT, UPDATE ON public.collection_value_snapshots TO authenticated;
GRANT ALL ON public.collection_value_snapshots TO service_role;
