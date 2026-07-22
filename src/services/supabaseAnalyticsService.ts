import { supabase } from '@/integrations/supabase/client';

export interface UserActivity {
  id: string;
  user_id: string;
  activity_type:
    | 'login' | 'logout' | 'card_view' | 'card_add'
    | 'trade_propose' | 'trade_accept' | 'trade_decline'
    | 'listing_create' | 'listing_view' | 'search'
    | 'profile_update' | 'collection_export';
  activity_data: any;
  ip_address?: string;
  user_agent?: string;
  created_at: string;
}

export interface SearchHistory {
  id: string;
  user_id?: string;
  search_query: string;
  search_type: 'cards' | 'sets' | 'users' | 'marketplace';
  results_count: number;
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

export interface TrendingCard {
  card_name: string;
  search_count: number;
  view_count: number;
}

export const getActivityIcon = (activityType: UserActivity['activity_type']): string => {
  switch (activityType) {
    case 'card_view':
    case 'card_add':
      return '🃏';
    case 'trade_propose':
    case 'trade_accept':
    case 'trade_decline':
      return '🔄';
    case 'listing_create':
    case 'listing_view':
      return '🏪';
    case 'search':
      return '🔍';
    case 'profile_update':
      return '👤';
    default:
      return '📊';
  }
};

export const getActivityDescription = (activity: Pick<UserActivity, 'activity_type' | 'activity_data'>): string => {
  const data = activity.activity_data || {};

  switch (activity.activity_type) {
    case 'card_view':
      return `Viewed ${data.card_name || 'a card'}`;
    case 'card_add':
      return `Added ${data.quantity || 1}x ${data.card_name || 'card'} to collection`;
    case 'trade_propose':
      return 'Proposed a trade';
    case 'trade_accept':
      return 'Accepted a trade';
    case 'trade_decline':
      return 'Declined a trade';
    case 'listing_create':
      return `Listed ${data.card_name || 'a card'} for ${data.listing_type || 'trade'}`;
    case 'listing_view':
      return `Viewed listing for ${data.card_name || 'a card'}`;
    case 'search':
      return `Searched for "${data.query || 'cards'}"`;
    case 'profile_update':
      return 'Updated profile';
    case 'collection_export':
      return 'Exported collection data';
    default:
      return activity.activity_type.replace('_', ' ');
  }
};

export const logUserActivity = async (
  activityType: UserActivity['activity_type'],
  activityData: any = {}
): Promise<void> => {
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return;

  const { error } = await supabase
    .from('user_activity')
    .insert({ user_id: user.id, activity_type: activityType, activity_data: activityData });

  if (error) console.error('Error logging activity:', error);
};

export const trackSearch = async (
  query: string,
  type: SearchHistory['search_type'] = 'cards',
  resultsCount: number = 0
): Promise<void> => {
  const { data: { user } } = await supabase.auth.getUser();

  const { error } = await supabase
    .from('search_history')
    .insert({
      user_id: user?.id ?? null,
      search_query: query,
      search_type: type,
      results_count: resultsCount,
    });

  if (error) console.error('Error recording search:', error);
};

export const getUserStats = async (userId: string): Promise<UserStats> => {
  const [{ data: profile }, { count: totalCards }, { count: totalListings }] = await Promise.all([
    supabase
      .from('profiles')
      .select('total_trades, successful_trades, reputation_score, created_at')
      .eq('user_id', userId)
      .maybeSingle(),
    supabase.from('user_cards').select('id', { count: 'exact', head: true }).eq('user_id', userId),
    supabase
      .from('marketplace_listings')
      .select('id', { count: 'exact', head: true })
      .eq('user_id', userId)
      .eq('status', 'active'),
  ]);

  return {
    total_cards: totalCards ?? 0,
    total_trades: profile?.total_trades ?? 0,
    completed_trades: profile?.successful_trades ?? 0,
    total_listings: totalListings ?? 0,
    reputation_score: profile?.reputation_score ?? 0,
    join_date: profile?.created_at ?? new Date().toISOString(),
  };
};

export const getTrendingCards = async (days: number = 7, limit: number = 10): Promise<TrendingCard[]> => {
  const { data, error } = await supabase.rpc('get_trending_cards', { _days: days, _limit: limit });
  if (error) {
    console.error('Error fetching trending cards:', error);
    return [];
  }
  return (data ?? []).map((row) => ({
    card_name: row.card_name,
    search_count: row.search_count,
    view_count: row.view_count,
  }));
};

export const getUserActivity = async (userId: string, limit: number = 50): Promise<UserActivity[]> => {
  const { data, error } = await supabase
    .from('user_activity')
    .select('*')
    .eq('user_id', userId)
    .order('created_at', { ascending: false })
    .limit(limit);

  if (error) {
    console.error('Error fetching user activity:', error);
    return [];
  }
  return (data ?? []) as UserActivity[];
};

export const getPopularSearches = async (
  type: SearchHistory['search_type'] = 'cards',
  limit: number = 10,
  days: number = 7
): Promise<Array<{ search_query: string; count: number }>> => {
  const { data, error } = await supabase.rpc('get_popular_searches', {
    _search_type: type,
    _days: days,
    _limit: limit,
  });
  if (error) {
    console.error('Error fetching popular searches:', error);
    return [];
  }
  return (data ?? []).map((row) => ({ search_query: row.search_query, count: row.count }));
};
