-- Real activity + search logging, backing the Analytics dashboard's
-- Recent Activity / Trending Cards / Popular Searches tabs, which previously
-- had no tables behind them at all (the service was a hardcoded no-op stub).

-- ============ USER ACTIVITY ============
CREATE TABLE public.user_activity (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  activity_type TEXT NOT NULL,
  activity_data JSONB NOT NULL DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_user_activity_user_created ON public.user_activity(user_id, created_at DESC);

ALTER TABLE public.user_activity ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view their own activity"
ON public.user_activity
FOR SELECT
USING (auth.uid() = user_id);

CREATE POLICY "Users can log their own activity"
ON public.user_activity
FOR INSERT
WITH CHECK (auth.uid() = user_id);

-- ============ SEARCH HISTORY ============
-- Write-only from the client (like nav_metrics): individual rows are never
-- read back directly, only aggregated through the SECURITY DEFINER RPCs below.
CREATE TABLE public.search_history (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  search_query TEXT NOT NULL,
  search_type TEXT NOT NULL DEFAULT 'cards',
  results_count INTEGER NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_search_history_type_created ON public.search_history(search_type, created_at DESC);

GRANT INSERT ON public.search_history TO anon, authenticated;
GRANT ALL ON public.search_history TO service_role;

ALTER TABLE public.search_history ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone can log a search"
ON public.search_history
FOR INSERT
TO anon, authenticated
WITH CHECK (user_id IS NULL OR auth.uid() = user_id);

-- ============ AGGREGATE READ RPCs ============

CREATE OR REPLACE FUNCTION public.get_popular_searches(_search_type TEXT DEFAULT 'cards', _days INT DEFAULT 7, _limit INT DEFAULT 10)
RETURNS TABLE(search_query TEXT, count BIGINT)
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT search_query, count(*) AS count
    FROM public.search_history
   WHERE search_type = _search_type
     AND created_at > now() - make_interval(days => _days)
   GROUP BY search_query
   ORDER BY count DESC
   LIMIT _limit;
$$;

CREATE OR REPLACE FUNCTION public.get_trending_cards(_days INT DEFAULT 7, _limit INT DEFAULT 10)
RETURNS TABLE(card_name TEXT, search_count BIGINT, view_count BIGINT)
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  WITH searches AS (
    SELECT search_query AS card_name, count(*) AS search_count
      FROM public.search_history
     WHERE search_type = 'cards'
       AND created_at > now() - make_interval(days => _days)
     GROUP BY search_query
  ),
  views AS (
    SELECT activity_data->>'card_name' AS card_name, count(*) AS view_count
      FROM public.user_activity
     WHERE activity_type = 'card_view'
       AND created_at > now() - make_interval(days => _days)
       AND activity_data->>'card_name' IS NOT NULL
     GROUP BY activity_data->>'card_name'
  )
  SELECT
    coalesce(s.card_name, v.card_name) AS card_name,
    coalesce(s.search_count, 0) AS search_count,
    coalesce(v.view_count, 0) AS view_count
    FROM searches s
    FULL OUTER JOIN views v ON s.card_name = v.card_name
   ORDER BY (coalesce(s.search_count, 0) + coalesce(v.view_count, 0)) DESC
   LIMIT _limit;
$$;

REVOKE ALL ON FUNCTION public.get_popular_searches(text, int, int) FROM PUBLIC, anon;
REVOKE ALL ON FUNCTION public.get_trending_cards(int, int) FROM PUBLIC, anon;

GRANT EXECUTE ON FUNCTION public.get_popular_searches(text, int, int) TO authenticated;
GRANT EXECUTE ON FUNCTION public.get_trending_cards(int, int) TO authenticated;
