
-- ────────────────────────────────────────────────────────────────────────────
-- set_imports had RLS enabled but no policies at all, so the client could
-- never read the freshness timestamp used by useSetCards.ts. That made every
-- set-cards view treat the mirror as permanently stale and re-trigger
-- import-set-cards on every single page load, even when data was already
-- fresh — wasteful, and an unnecessary exposure to upstream Pokemon TCG API
-- flakiness. Freshness metadata (set_id/last_imported_at/card_count) isn't
-- sensitive — same public-read posture as pokemon_sets/pokemon_cards.
-- ────────────────────────────────────────────────────────────────────────────

DROP POLICY IF EXISTS "Set import freshness is public" ON public.set_imports;
CREATE POLICY "Set import freshness is public"
  ON public.set_imports FOR SELECT
  USING (true);
