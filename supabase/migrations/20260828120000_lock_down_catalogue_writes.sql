-- ────────────────────────────────────────────────────────────────────────────
-- RLS audit follow-up — shared-catalogue write lockdown.
--
-- Several early migrations created blanket write policies of the form
--   CREATE POLICY "Authenticated users can manage X"
--     ON public.X FOR ALL USING (auth.role() = 'authenticated');
-- on the GLOBAL reference tables pokemon_cards / pokemon_sets / set_images
-- (and equivalents on card_images). With Supabase's default table grants that
-- let ANY signed-in user INSERT / UPDATE / DELETE any row — e.g. wipe the
-- ~20k-row card catalogue for everyone, or rewrite tcgplayer_prices to distort
-- portfolio values and the marketplace's "market price" display.
--
-- Production already had these dropped out-of-band (confirmed via
-- `supabase db dump`), so this is a no-op there. It is restated here so a
-- `supabase db reset` / fresh replay can't silently reintroduce the hole, and
-- for the audit trail — matching the convention in 20260722090000.
--
-- With the permissive policies gone and no write policy left, RLS default-denies
-- all client writes. These tables are written only by service-role edge
-- functions (import-set-cards, import-sets, refresh-card-prices*,
-- seed-database), which bypass RLS. Clients keep SELECT via the existing
-- "… are public" policies. card_images keeps its own-row user policies.
-- ────────────────────────────────────────────────────────────────────────────

DROP POLICY IF EXISTS "Authenticated users can manage pokemon sets"  ON public.pokemon_sets;
DROP POLICY IF EXISTS "Authenticated users can manage pokemon cards" ON public.pokemon_cards;
DROP POLICY IF EXISTS "Authenticated users can manage set images"    ON public.set_images;
DROP POLICY IF EXISTS "Authenticated users can manage card images"   ON public.card_images;
DROP POLICY IF EXISTS "Authenticated users can update card images"   ON public.card_images;
