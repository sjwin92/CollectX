-- Collector-community research: an AI pre-grade shown as a single bare
-- number reads as untrustworthy ("a marketing lie") — the tools collectors
-- actually rate well show a confidence level alongside the estimate. Add a
-- column for it rather than burying it in raw_result.
ALTER TABLE public.card_grading_scans
  ADD COLUMN confidence numeric(4,1);
