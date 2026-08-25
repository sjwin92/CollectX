-- Persist scan photos: the grading model is starting out as an LLM "teacher"
-- (see grade-card edge function), and every scan's images + resulting grade
-- are the training set for an eventual in-house model. Without the photos
-- there's nothing to train on later, so unlike most user content this is
-- deliberately kept (disclosed in the privacy policy as model-improvement use).

ALTER TABLE public.card_grading_scans
  ADD COLUMN front_image_path text,
  ADD COLUMN back_image_path text;

INSERT INTO storage.buckets (id, name, public)
VALUES ('card-grading-scans', 'card-grading-scans', false);

-- Private bucket: only the owning user can read their own scan photos back
-- (e.g. for a future scan-history view). Writes happen only via the
-- grade-card edge function's service-role client, never directly from the
-- client, so there are no client INSERT/UPDATE/DELETE policies here.
CREATE POLICY "Users can view own grading scan images"
ON storage.objects FOR SELECT
USING (bucket_id = 'card-grading-scans' AND auth.uid()::text = (storage.foldername(name))[1]);
