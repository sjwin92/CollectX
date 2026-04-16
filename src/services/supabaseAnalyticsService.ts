// Analytics service stub — the underlying tables (user_activity, search_history,
// user_preferences, analytics_summary) and RPC functions are not provisioned in
// this Cloud database. All methods are no-ops so the rest of the app compiles.
// Reintroduce real implementations once the analytics tables/migrations exist.

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

export const logUserActivity = async (
  _activityType: UserActivity['activity_type'],
  _activityData: any = {}
): Promise<void> => {
  // no-op
};

export const recordSearch = async (
  _query: string,
  _type: SearchHistory['search_type'],
  _resultsCount: number,
  _filters: any = {},
  _clickedResultId?: string
): Promise<void> => {
  // no-op
};

export const getUserPreferences = async (): Promise<UserPreferences | null> => null;

export const updateUserPreferences = async (
  _updates: Partial<UserPreferences>
): Promise<UserPreferences | null> => null;

export interface UserStats {
  totalCards: number;
  totalTrades: number;
  totalValue: number;
  recentActivity: number;
}

export interface TrendingCard {
  id: string;
  name: string;
  searchCount: number;
  imageUrl?: string;
}

export const getUserStats = async (): Promise<UserStats> => ({
  totalCards: 0,
  totalTrades: 0,
  totalValue: 0,
  recentActivity: 0,
});

export const getTrendingCards = async (_limit: number = 10): Promise<TrendingCard[]> => [];

export const getUserActivity = async (_limit: number = 50): Promise<UserActivity[]> => [];

export const getSearchHistory = async (_limit: number = 20): Promise<SearchHistory[]> => [];

export const getPopularSearches = async (
  _type?: string,
  _limit: number = 10,
  _days: number = 7
): Promise<SearchHistory[]> => [];
