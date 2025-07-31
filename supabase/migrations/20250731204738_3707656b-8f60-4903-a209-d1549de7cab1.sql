-- Create user_activity table for tracking user actions
CREATE TABLE public.user_activity (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL,
  activity_type TEXT NOT NULL CHECK (activity_type IN ('login', 'logout', 'card_view', 'card_add', 'trade_propose', 'trade_accept', 'trade_decline', 'listing_create', 'listing_view', 'search', 'profile_update', 'collection_export')),
  activity_data JSONB DEFAULT '{}'::jsonb,
  ip_address INET,
  user_agent TEXT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Create search_history table for tracking searches and recommendations
CREATE TABLE public.search_history (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID,
  search_query TEXT NOT NULL,
  search_type TEXT NOT NULL DEFAULT 'cards' CHECK (search_type IN ('cards', 'sets', 'users', 'marketplace')),
  results_count INTEGER DEFAULT 0,
  filters_applied JSONB DEFAULT '{}'::jsonb,
  clicked_result_id TEXT,
  session_id TEXT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Create user_preferences table for personalization
CREATE TABLE public.user_preferences (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL UNIQUE,
  favorite_sets TEXT[] DEFAULT '{}',
  favorite_types TEXT[] DEFAULT '{}',
  preferred_condition TEXT DEFAULT 'near_mint',
  collection_privacy TEXT DEFAULT 'public' CHECK (collection_privacy IN ('public', 'friends', 'private')),
  auto_accept_trades BOOLEAN DEFAULT false,
  email_frequency TEXT DEFAULT 'weekly' CHECK (email_frequency IN ('never', 'daily', 'weekly', 'monthly')),
  theme_preference TEXT DEFAULT 'system' CHECK (theme_preference IN ('light', 'dark', 'system')),
  language_preference TEXT DEFAULT 'en',
  timezone TEXT DEFAULT 'UTC',
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Create analytics_summary table for aggregated data
CREATE TABLE public.analytics_summary (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  summary_date DATE NOT NULL,
  summary_type TEXT NOT NULL CHECK (summary_type IN ('daily', 'weekly', 'monthly')),
  total_users INTEGER DEFAULT 0,
  active_users INTEGER DEFAULT 0,
  new_users INTEGER DEFAULT 0,
  total_trades INTEGER DEFAULT 0,
  completed_trades INTEGER DEFAULT 0,
  total_listings INTEGER DEFAULT 0,
  total_cards_added INTEGER DEFAULT 0,
  total_searches INTEGER DEFAULT 0,
  metrics JSONB DEFAULT '{}'::jsonb,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  UNIQUE(summary_date, summary_type)
);

-- Create user_reports table for reporting issues
CREATE TABLE public.user_reports (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  reporter_user_id UUID NOT NULL,
  reported_user_id UUID,
  reported_content_type TEXT CHECK (reported_content_type IN ('user', 'listing', 'trade', 'message')),
  reported_content_id TEXT,
  report_reason TEXT NOT NULL CHECK (report_reason IN ('spam', 'inappropriate', 'fake', 'harassment', 'fraud', 'other')),
  description TEXT,
  status TEXT DEFAULT 'pending' CHECK (status IN ('pending', 'investigating', 'resolved', 'dismissed')),
  admin_notes TEXT,
  resolved_at TIMESTAMP WITH TIME ZONE,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS on all tables
ALTER TABLE public.user_activity ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.search_history ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.user_preferences ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.analytics_summary ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.user_reports ENABLE ROW LEVEL SECURITY;

-- RLS Policies for user_activity
CREATE POLICY "Users can view their own activity" 
ON public.user_activity 
FOR SELECT 
USING (auth.uid() = user_id);

CREATE POLICY "System can create activity logs" 
ON public.user_activity 
FOR INSERT 
WITH CHECK (true);

-- RLS Policies for search_history
CREATE POLICY "Users can view their own search history" 
ON public.search_history 
FOR SELECT 
USING (auth.uid() = user_id OR user_id IS NULL);

CREATE POLICY "System can create search history" 
ON public.search_history 
FOR INSERT 
WITH CHECK (auth.uid() = user_id OR user_id IS NULL);

-- RLS Policies for user_preferences
CREATE POLICY "Users can view their own preferences" 
ON public.user_preferences 
FOR SELECT 
USING (auth.uid() = user_id);

CREATE POLICY "Users can create their own preferences" 
ON public.user_preferences 
FOR INSERT 
WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own preferences" 
ON public.user_preferences 
FOR UPDATE 
USING (auth.uid() = user_id);

-- RLS Policies for analytics_summary (read-only for authenticated users)
CREATE POLICY "Authenticated users can view analytics" 
ON public.analytics_summary 
FOR SELECT 
TO authenticated
USING (true);

-- RLS Policies for user_reports
CREATE POLICY "Users can view their own reports" 
ON public.user_reports 
FOR SELECT 
USING (auth.uid() = reporter_user_id);

CREATE POLICY "Users can create reports" 
ON public.user_reports 
FOR INSERT 
WITH CHECK (auth.uid() = reporter_user_id);

-- Create indexes for performance
CREATE INDEX idx_user_activity_user_id ON public.user_activity(user_id);
CREATE INDEX idx_user_activity_type ON public.user_activity(activity_type);
CREATE INDEX idx_user_activity_created_at ON public.user_activity(created_at);
CREATE INDEX idx_search_history_user_id ON public.search_history(user_id);
CREATE INDEX idx_search_history_query ON public.search_history(search_query);
CREATE INDEX idx_search_history_created_at ON public.search_history(created_at);
CREATE INDEX idx_user_preferences_user_id ON public.user_preferences(user_id);
CREATE INDEX idx_analytics_summary_date ON public.analytics_summary(summary_date);
CREATE INDEX idx_analytics_summary_type ON public.analytics_summary(summary_type);
CREATE INDEX idx_user_reports_status ON public.user_reports(status);
CREATE INDEX idx_user_reports_created_at ON public.user_reports(created_at);

-- Create trigger for updating user_preferences updated_at
CREATE TRIGGER update_user_preferences_updated_at
  BEFORE UPDATE ON public.user_preferences
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

-- Create function to log user activity
CREATE OR REPLACE FUNCTION public.log_user_activity(
  p_user_id UUID,
  p_activity_type TEXT,
  p_activity_data JSONB DEFAULT '{}'::jsonb,
  p_ip_address INET DEFAULT NULL,
  p_user_agent TEXT DEFAULT NULL
)
RETURNS UUID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
DECLARE
  activity_id UUID;
BEGIN
  INSERT INTO public.user_activity (user_id, activity_type, activity_data, ip_address, user_agent)
  VALUES (p_user_id, p_activity_type, p_activity_data, p_ip_address, p_user_agent)
  RETURNING id INTO activity_id;
  
  RETURN activity_id;
END;
$$;

-- Create function to get user statistics
CREATE OR REPLACE FUNCTION public.get_user_stats(target_user_id UUID)
RETURNS TABLE (
  total_cards INTEGER,
  total_trades INTEGER,
  completed_trades INTEGER,
  total_listings INTEGER,
  reputation_score INTEGER,
  join_date DATE
) 
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
BEGIN
  RETURN QUERY
  SELECT 
    COALESCE((SELECT COUNT(*)::INTEGER FROM public.user_cards WHERE user_id = target_user_id), 0) as total_cards,
    COALESCE((SELECT COUNT(*)::INTEGER FROM public.trades WHERE initiator_user_id = target_user_id OR recipient_user_id = target_user_id), 0) as total_trades,
    COALESCE((SELECT COUNT(*)::INTEGER FROM public.trades WHERE (initiator_user_id = target_user_id OR recipient_user_id = target_user_id) AND status = 'completed'), 0) as completed_trades,
    COALESCE((SELECT COUNT(*)::INTEGER FROM public.marketplace_listings WHERE user_id = target_user_id), 0) as total_listings,
    COALESCE((SELECT reputation_score FROM public.profiles WHERE user_id = target_user_id), 0) as reputation_score,
    COALESCE((SELECT created_at::DATE FROM public.profiles WHERE user_id = target_user_id), CURRENT_DATE) as join_date;
END;
$$;

-- Create function to get trending cards (most searched/viewed)
CREATE OR REPLACE FUNCTION public.get_trending_cards(days_back INTEGER DEFAULT 7)
RETURNS TABLE (
  card_name TEXT,
  search_count BIGINT,
  view_count BIGINT
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
BEGIN
  RETURN QUERY
  WITH search_trends AS (
    SELECT 
      search_query as card_name,
      COUNT(*) as search_count
    FROM public.search_history 
    WHERE created_at >= NOW() - INTERVAL '%s days' AND search_type = 'cards'
    GROUP BY search_query
  ),
  activity_trends AS (
    SELECT 
      activity_data->>'card_name' as card_name,
      COUNT(*) as view_count
    FROM public.user_activity 
    WHERE activity_type = 'card_view' 
      AND created_at >= NOW() - INTERVAL '%s days'
      AND activity_data->>'card_name' IS NOT NULL
    GROUP BY activity_data->>'card_name'
  )
  SELECT 
    COALESCE(s.card_name, a.card_name) as card_name,
    COALESCE(s.search_count, 0) as search_count,
    COALESCE(a.view_count, 0) as view_count
  FROM search_trends s
  FULL OUTER JOIN activity_trends a ON s.card_name = a.card_name
  ORDER BY (COALESCE(s.search_count, 0) + COALESCE(a.view_count, 0)) DESC
  LIMIT 50;
END;
$$;

-- Enable realtime for analytics tables
ALTER TABLE public.user_activity REPLICA IDENTITY FULL;
ALTER TABLE public.search_history REPLICA IDENTITY FULL;