-- Catalogue launch-readiness hardening (version recorded by Supabase).
--
-- The catalogue is application-managed reference data. Browser clients may
-- read it, but import state and sync audit records remain server-only.

CREATE TABLE public.catalogue_sync_runs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  source text NOT NULL,
  source_revision text NOT NULL,
  language_code text NOT NULL DEFAULT 'en',
  status text NOT NULL CHECK (status IN ('running', 'completed', 'failed')),
  set_count integer NOT NULL DEFAULT 0 CHECK (set_count >= 0),
  card_count integer NOT NULL DEFAULT 0 CHECK (card_count >= 0),
  started_at timestamptz NOT NULL DEFAULT now(),
  completed_at timestamptz,
  details jsonb NOT NULL DEFAULT '{}'::jsonb,
  CONSTRAINT catalogue_sync_completion_check CHECK (
    (status = 'running' AND completed_at IS NULL)
    OR (status IN ('completed', 'failed') AND completed_at IS NOT NULL)
  )
);

ALTER TABLE public.catalogue_sync_runs ENABLE ROW LEVEL SECURITY;

REVOKE ALL ON public.catalogue_sync_runs FROM PUBLIC, anon, authenticated;
GRANT ALL ON public.catalogue_sync_runs TO service_role;

-- Freshness/error details are operational metadata rather than public
-- catalogue content. The admin-only importer uses the service role.
DROP POLICY IF EXISTS "Set imports are public" ON public.set_imports;
REVOKE SELECT ON public.set_imports FROM anon, authenticated;

-- Avoid evaluating auth.uid() once per row on the hottest catalogue-adjacent
-- collection policies. These definitions preserve the existing access model.
DROP POLICY IF EXISTS "Users can view their own cards" ON public.user_cards;
DROP POLICY IF EXISTS "Anyone can view cards for trade or sale" ON public.user_cards;

CREATE POLICY "Users can view owned or tradable cards"
  ON public.user_cards FOR SELECT
  TO anon, authenticated
  USING (
    for_trade = true
    OR for_sale = true
    OR (SELECT auth.uid()) = user_id
  );

DROP POLICY IF EXISTS "Users can insert their own cards" ON public.user_cards;
CREATE POLICY "Users can insert their own cards"
  ON public.user_cards FOR INSERT
  TO authenticated
  WITH CHECK ((SELECT auth.uid()) = user_id);

DROP POLICY IF EXISTS "Users can update their own cards" ON public.user_cards;
CREATE POLICY "Users can update their own cards"
  ON public.user_cards FOR UPDATE
  TO authenticated
  USING (
    (SELECT auth.uid()) = user_id
    AND NOT public.user_card_locked_in_live_trade(id)
  )
  WITH CHECK (
    (SELECT auth.uid()) = user_id
    AND NOT public.user_card_locked_in_live_trade(id)
  );

DROP POLICY IF EXISTS "Users can delete their own cards" ON public.user_cards;
CREATE POLICY "Users can delete their own cards"
  ON public.user_cards FOR DELETE
  TO authenticated
  USING (
    (SELECT auth.uid()) = user_id
    AND NOT public.user_card_locked_in_live_trade(id)
  );
