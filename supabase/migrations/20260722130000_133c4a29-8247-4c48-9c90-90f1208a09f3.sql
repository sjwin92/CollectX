
-- ────────────────────────────────────────────────────────────────────────────
-- RLS policies are meaningless without the underlying table-level GRANT —
-- a role needs both. A broad audit of has_table_privilege() across all
-- public tables found two missing entirely:
--
-- 1. set_imports: SELECT was never granted to anon/authenticated at all
--    (separate from the "Set import freshness is public" policy added in
--    20260722120000, which alone wasn't enough). This is the direct
--    root cause of card-loading friction: useSetCards.ts's freshness check
--    always failed to read set_imports, treating every set as permanently
--    stale and re-triggering a full re-import on every single view.
--
-- 2. collection_boxes: created in 20260722110000 with a working RLS policy,
--    but no explicit GRANT was ever issued — every operation on it currently
--    fails with "permission denied for table collection_boxes" regardless of
--    the policy. The whole Collection Boxes feature has been non-functional
--    since it shipped. Fixing before this ships any further.
-- ────────────────────────────────────────────────────────────────────────────

GRANT SELECT ON public.set_imports TO anon, authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.collection_boxes TO authenticated;
