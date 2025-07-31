import { supabase } from '@/integrations/supabase/client';
import type { Database } from '@/integrations/supabase/types';

type DbUserActivity = Database['public']['Tables']['user_activity']['Row'];
type DbSearchHistory = Database['public']['Tables']['search_history']['Row'];
type DbUserPreferences = Database['public']['Tables']['user_preferences']['Row'];
type DbAnalyticsSummary = Database['public']['Tables']['analytics_summary']['Row'];

export interface UserActivity {
  id: string;
  user_id: string;
  activity_type: 'login' | 'logout' | 'card_view' | 'card_add' | 'trade_propose' | 'trade_accept' | 'trade_decline' | 'listing_create' | 'listing_view' | 'search' | 'profile_update' | 'collection_export';
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
  collection_privacy: 'public' | 'friends' | 'private';
  auto_accept_trades: boolean;
  email_frequency: 'never' | 'daily' | 'weekly' | 'monthly';
  theme_preference: 'light' | 'dark' | 'system';
  language_preference: string;
  timezone: string;
  created_at: string;
  updated_at: string;
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

// Activity tracking functions
export const logUserActivity = async (
  activityType: UserActivity['activity_type'],
  activityData?: any,
  ipAddress?: string,
  userAgent?: string
): Promise<string | null> => {
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return null;

  try {
    const { data: activityId, error } = await supabase.rpc('log_user_activity', {
      p_user_id: user.id,
      p_activity_type: activityType,
      p_activity_data: activityData || {},
      p_ip_address: ipAddress,
      p_user_agent: userAgent
    });

    if (error) throw error;
    return activityId;
  } catch (error) {
    console.error('Error logging user activity:', error);
    return null;
  }
};

// Search tracking functions
export const logSearch = async (
  searchQuery: string,
  searchType: SearchHistory['search_type'] = 'cards',
  resultsCount: number = 0,
  filtersApplied?: any,
  clickedResultId?: string,
  sessionId?: string
): Promise<void> => {
  const { data: { user } } = await supabase.auth.getUser();

  try {
    const { error } = await supabase
      .from('search_history')
      .insert([{
        user_id: user?.id,
        search_query: searchQuery,
        search_type: searchType,
        results_count: resultsCount,
        filters_applied: filtersApplied || {},
        clicked_result_id: clickedResultId,
        session_id: sessionId
      }]);

    if (error) throw error;
  } catch (error) {
    console.error('Error logging search:', error);
  }
};

// User preferences functions
export const getUserPreferences = async (): Promise<UserPreferences | null> => {
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return null;

  const { data, error } = await supabase
    .from('user_preferences')
    .select('*')
    .eq('user_id', user.id)
    .single();

  if (error && error.code !== 'PGRST116') throw error; // Ignore "not found" error
  return data as UserPreferences;
};

export const updateUserPreferences = async (
  preferences: Partial<Omit<UserPreferences, 'id' | 'user_id' | 'created_at' | 'updated_at'>>
): Promise<UserPreferences> => {
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) throw new Error('User not authenticated');

  const { data, error } = await supabase
    .from('user_preferences')
    .upsert([{
      user_id: user.id,
      ...preferences
    }])
    .select()
    .single();

  if (error) throw error;
  return data as UserPreferences;
};

// Analytics functions
export const getUserStats = async (userId?: string): Promise<UserStats | null> => {
  const { data: { user } } = await supabase.auth.getUser();
  const targetUserId = userId || user?.id;
  
  if (!targetUserId) return null;

  try {
    const { data, error } = await supabase.rpc('get_user_stats', {
      target_user_id: targetUserId
    });

    if (error) throw error;
    return data?.[0] as UserStats || null;
  } catch (error) {
    console.error('Error getting user stats:', error);
    return null;
  }
};

export const getTrendingCards = async (daysBack: number = 7): Promise<TrendingCard[]> => {
  try {
    const { data, error } = await supabase.rpc('get_trending_cards', {
      days_back: daysBack
    });

    if (error) throw error;
    return (data || []) as TrendingCard[];
  } catch (error) {
    console.error('Error getting trending cards:', error);
    return [];
  }
};

// Get user activity history
export const getUserActivity = async (limit: number = 50): Promise<UserActivity[]> => {
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return [];

  const { data, error } = await supabase
    .from('user_activity')
    .select('*')
    .eq('user_id', user.id)
    .order('created_at', { ascending: false })
    .limit(limit);

  if (error) throw error;
  return (data || []) as UserActivity[];
};

// Get search history
export const getSearchHistory = async (limit: number = 50): Promise<SearchHistory[]> => {
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return [];

  const { data, error } = await supabase
    .from('search_history')
    .select('*')
    .eq('user_id', user.id)
    .order('created_at', { ascending: false })
    .limit(limit);

  if (error) throw error;
  return (data || []) as SearchHistory[];
};

// Analytics summary functions
export const getAnalyticsSummary = async (
  summaryType: 'daily' | 'weekly' | 'monthly' = 'daily',
  limit: number = 30
): Promise<DbAnalyticsSummary[]> => {
  const { data, error } = await supabase
    .from('analytics_summary')
    .select('*')
    .eq('summary_type', summaryType)
    .order('summary_date', { ascending: false })
    .limit(limit);

  if (error) throw error;
  return (data || []) as DbAnalyticsSummary[];
};

// Reporting functions
export const createUserReport = async (
  reportedUserId?: string,
  reportedContentType?: 'user' | 'listing' | 'trade' | 'message',
  reportedContentId?: string,
  reportReason: 'spam' | 'inappropriate' | 'fake' | 'harassment' | 'fraud' | 'other' = 'other',
  description?: string
): Promise<void> => {
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) throw new Error('User not authenticated');

  const { error } = await supabase
    .from('user_reports')
    .insert([{
      reporter_user_id: user.id,
      reported_user_id: reportedUserId,
      reported_content_type: reportedContentType,
      reported_content_id: reportedContentId,
      report_reason: reportReason,
      description
    }]);

  if (error) throw error;
};

// Convenience functions for common activities
export const trackCardView = async (cardId: string, cardName: string) => {
  return logUserActivity('card_view', { card_id: cardId, card_name: cardName });
};

export const trackCardAdd = async (cardId: string, cardName: string, quantity: number = 1) => {
  return logUserActivity('card_add', { card_id: cardId, card_name: cardName, quantity });
};

export const trackTradeProposal = async (tradeId: string, recipientUserId: string) => {
  return logUserActivity('trade_propose', { trade_id: tradeId, recipient_user_id: recipientUserId });
};

export const trackListingCreate = async (listingId: string, cardName: string, listingType: string) => {
  return logUserActivity('listing_create', { listing_id: listingId, card_name: cardName, listing_type: listingType });
};

export const trackListingView = async (listingId: string, cardName: string) => {
  return logUserActivity('listing_view', { listing_id: listingId, card_name: cardName });
};

export const trackSearch = async (query: string, type: SearchHistory['search_type'], resultsCount: number, filters?: any) => {
  // Log activity
  await logUserActivity('search', { query, type, results_count: resultsCount, filters });
  
  // Log search history
  await logSearch(query, type, resultsCount, filters);
};

// Get popular searches
export const getPopularSearches = async (
  searchType: SearchHistory['search_type'] = 'cards',
  limit: number = 10,
  daysBack: number = 7
): Promise<{ search_query: string; count: number }[]> => {
  const startDate = new Date();
  startDate.setDate(startDate.getDate() - daysBack);

  const { data, error } = await supabase
    .from('search_history')
    .select('search_query')
    .eq('search_type', searchType)
    .gte('created_at', startDate.toISOString())
    .order('created_at', { ascending: false });

  if (error) throw error;

  // Count occurrences
  const searchCounts: { [key: string]: number } = {};
  (data || []).forEach(item => {
    const query = item.search_query.toLowerCase();
    searchCounts[query] = (searchCounts[query] || 0) + 1;
  });

  // Sort by count and return top results
  return Object.entries(searchCounts)
    .sort(([, a], [, b]) => b - a)
    .slice(0, limit)
    .map(([search_query, count]) => ({ search_query, count }));
};

// Export function for user data
export const exportUserData = async (): Promise<any> => {
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) throw new Error('User not authenticated');

  // Track the export activity
  await logUserActivity('collection_export');

  // Gather all user data
  const [
    profile,
    collection,
    trades,
    listings,
    notifications,
    preferences,
    activity,
    searchHistory
  ] = await Promise.all([
    supabase.from('profiles').select('*').eq('user_id', user.id).single(),
    supabase.from('user_cards').select('*').eq('user_id', user.id),
    supabase.from('trades').select('*').or(`initiator_user_id.eq.${user.id},recipient_user_id.eq.${user.id}`),
    supabase.from('marketplace_listings').select('*').eq('user_id', user.id),
    supabase.from('notifications').select('*').eq('user_id', user.id),
    getUserPreferences(),
    getUserActivity(1000),
    getSearchHistory(1000)
  ]);

  return {
    user: {
      id: user.id,
      email: user.email,
      created_at: user.created_at
    },
    profile: profile.data,
    collection: collection.data || [],
    trades: trades.data || [],
    listings: listings.data || [],
    notifications: notifications.data || [],
    preferences,
    activity,
    searchHistory,
    exported_at: new Date().toISOString()
  };
};