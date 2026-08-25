-- AI card grading (Ximilar-powered): pre-grade estimate for centering/corners/
-- edges/surface, mapped to a rough PSA-style 1-10 grade. A limited number of
-- scans are free per user; further scans consume purchased credits bought via
-- Stripe (see create-scan-credit-checkout + stripe-webhook).

ALTER TABLE public.profiles
  ADD COLUMN purchased_scan_credits integer NOT NULL DEFAULT 0;

CREATE TABLE public.card_grading_scans (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  user_card_id uuid REFERENCES public.user_cards(id) ON DELETE SET NULL,
  card_name text,
  overall_grade numeric(3,1),
  condition_label text,
  centering_grade numeric(3,1),
  corners_grade numeric(3,1),
  edges_grade numeric(3,1),
  surface_grade numeric(3,1),
  centering_ratio_lr text,
  centering_ratio_tb text,
  raw_result jsonb,
  was_free boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX card_grading_scans_user_idx ON public.card_grading_scans(user_id, created_at DESC);

ALTER TABLE public.card_grading_scans ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own scans"
  ON public.card_grading_scans FOR SELECT
  USING (auth.uid() = user_id);

-- No client INSERT/UPDATE/DELETE: scans are recorded only by the grade-card
-- edge function (service role), since it's the only thing that can verify a
-- scan was actually paid for (free-quota count or purchased credit) and
-- actually happened against Ximilar.
CREATE POLICY "No direct inserts to card_grading_scans"
  ON public.card_grading_scans FOR INSERT
  WITH CHECK (false);

GRANT SELECT ON public.card_grading_scans TO authenticated;
GRANT ALL ON public.card_grading_scans TO service_role;
