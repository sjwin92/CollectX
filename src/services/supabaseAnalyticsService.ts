// Analytics service stub — underlying tables are not yet provisioned.
// All methods are no-ops so the app compiles and runs without errors.

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
  filters_applied: any;
  clicked_result_id?: string;
  session_id?: string;
  created_at: string;
}

export interface UserPreferences {
  id: string;
  user_id: string;
  favorite_sets: string[];
  favorite_types: string[];
  preferred_condition: string;
  collection_privacy: string;
  trade_preferences: any;
  notification_settings: any;
  display_settings: any;
  search_filters: any;
  created_at: string;
  updated_at: string;
}

export interface AnalyticsSummary {
  id: string;
  user_id: string;
  date: string;
  metrics: any;
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

export const logUserActivity = async (
  _activityType: UserActivity['activity_type'],
  _activityData: any = {}
): Promise<void> => {};

export const recordSearch = async (
  _query: string,
  _type: SearchHistory['search_type'],
  _resultsCount: number,
  _filters: any = {},
  _clickedResultId?: string
): Promise<void> => {};

export const trackSearch = async (
  _query: string,
  _type: SearchHistory['search_type'] = 'cards',
  _resultsCount: number = 0,
  _filters: any = {}
): Promise<void> => {};

export const getUserPreferences = async (): Promise<UserPreferences | null> => null;

export const updateUserPreferences = async (
  _updates: Partial<UserPreferences>
): Promise<UserPreferences | null> => null;

export const getUserStats = async (): Promise<UserStats> => ({
  total_cards: 0,
  total_trades: 0,
  completed_trades: 0,
  total_listings: 0,
  reputation_score: 0,
  join_date: new Date().toISOString(),
});

export const getTrendingCards = async (_limit: number = 10): Promise<TrendingCard[]> => [];

export const getUserActivity = async (_limit: number = 50): Promise<UserActivity[]> => [];

export const getSearchHistory = async (_limit: number = 20): Promise<SearchHistory[]> => [];

export const getPopularSearches = async (
  _type: SearchHistory['search_type'] = 'cards',
  _limit: number = 10,
  _days: number = 7
): Promise<Array<{ search_query: string; count: number }>> => [];
