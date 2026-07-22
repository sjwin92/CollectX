// Analytics service. getUserStats is backed by real data from existing
// tables. Trending-card / activity-feed / popular-search style features are
// intentionally not implemented (and not shown in the dashboard) — they'd
// need dedicated tables that don't exist yet, and a permanently-empty tab is
// worse UX than not having the tab at all. trackSearch stays a harmless no-op
// instrumentation hook (not rendered anywhere, so it can't show fake data).
import { supabase } from '@/integrations/supabase/client';

export interface SearchHistory {
  id: string;
  user_id?: string;
  search_query: string;
  search_type: 'cards' | 'sets' | 'users' | 'marketplace';
  results_count: number;
  filters_applied: Record<string, unknown>;
  clicked_result_id?: string;
  session_id?: string;
  created_at: string;
}

export interface UserStats {
  total_cards: number;
  total_trades: number;
  completed_trades: number;
  total_listings: number;
  reputation_score: number;
  join_date: string;
}

export const trackSearch = async (
  _query: string,
  _type: SearchHistory['search_type'] = 'cards',
  _resultsCount: number = 0,
  _filters: Record<string, unknown> = {}
): Promise<void> => {};

export const getUserStats = async (): Promise<UserStats | null> => {
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return null;

  const [{ data: profile }, { count: cardCount }, { data: cardRows }, { count: listingCount }] = await Promise.all([
    supabase
      .from('profiles')
      .select('total_trades, successful_trades, reputation_score, created_at')
      .eq('user_id', user.id)
      .maybeSingle(),
    supabase
      .from('user_cards')
      .select('id', { count: 'exact', head: true })
      .eq('user_id', user.id),
    supabase
      .from('user_cards')
      .select('quantity')
      .eq('user_id', user.id),
    supabase
      .from('marketplace_listings')
      .select('id', { count: 'exact', head: true })
      .eq('user_id', user.id)
      .eq('status', 'active'),
  ]);

  const totalCards = (cardRows || []).reduce((sum, row) => sum + (row.quantity || 1), 0) || cardCount || 0;

  return {
    total_cards: totalCards,
    total_trades: profile?.total_trades ?? 0,
    completed_trades: profile?.successful_trades ?? 0,
    total_listings: listingCount || 0,
    reputation_score: profile?.reputation_score ?? 0,
    join_date: profile?.created_at ?? new Date().toISOString(),
  };
};
