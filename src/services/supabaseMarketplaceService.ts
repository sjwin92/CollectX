import { supabase as supabaseTyped } from '@/integrations/supabase/client';
import { ExtendedCardItemWithDB } from './supabaseCollectionService';
const supabase = supabaseTyped as any;

export interface MarketplaceListing {
  id: string;
  user_id: string;
  user_card_id: string;
  card_id: string;
  card_name: string;
  set_id: string;
  set_name: string;
  card_number?: string;
  rarity?: string;
  image_url?: string;
  image_url_small?: string;
  condition: string;
  is_graded: boolean;
  grade_company?: string;
  grade_score?: number;
  quantity: number;
  listing_type: 'trade';
  asking_price: null;
  trade_preferences?: string;
  description?: string;
  featured: boolean;
  status: 'active' | 'pending' | 'completed' | 'cancelled' | 'expired';
  expires_at?: string;
  views_count: number;
  interested_count: number;
  created_at: string;
  updated_at: string;
}

export interface MarketplaceInterest {
  id: string;
  listing_id: string;
  user_id: string;
  interest_type: 'trade';
  message?: string;
  created_at: string;
}

export interface MarketplaceFavorite {
  id: string;
  listing_id: string;
  user_id: string;
  created_at: string;
}

export const createMarketplaceListing = async (
  card: ExtendedCardItemWithDB,
  listingData: {
    listing_type?: 'trade';
    trade_preferences?: string;
    description?: string;
    expires_at?: string;
  }
): Promise<MarketplaceListing> => {
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) throw new Error('User not authenticated');
  if (!card.dbId) {
    throw new Error('This card must exist in your collection (marked for trade) before you can list it.');
  }

  const { data, error } = await supabase.rpc('create_marketplace_listing', {
    _user_card_id: card.dbId,
    _trade_preferences: listingData.trade_preferences ?? null,
    _description: listingData.description ?? null,
    _expires_at: listingData.expires_at || null,
  });

  if (error) throw error;
  return data as MarketplaceListing;
};

// Get marketplace listings with filters
export const getMarketplaceListings = async (filters?: {
  search?: string;
  set_id?: string;
  condition?: string;
  featured_only?: boolean;
  limit?: number;
  offset?: number;
}): Promise<MarketplaceListing[]> => {
  let query = supabase
    .from('marketplace_listings')
    .select('*')
    .eq('status', 'active')
    .order('created_at', { ascending: false });

  if (filters?.search) {
    query = query.or(`card_name.ilike.%${filters.search}%,description.ilike.%${filters.search}%`);
  }

  if (filters?.set_id) {
    query = query.eq('set_id', filters.set_id);
  }

  if (filters?.condition) {
    query = query.eq('condition', filters.condition);
  }

  if (filters?.featured_only) {
    query = query.eq('featured', true);
  }

  if (filters?.limit) {
    query = query.limit(filters.limit);
  }

  if (filters?.offset) {
    query = query.range(filters.offset, filters.offset + (filters.limit || 20) - 1);
  }

  const { data, error } = await query;

  if (error) throw error;
  return (data || []) as MarketplaceListing[];
};

// Get user's marketplace listings
export const getUserMarketplaceListings = async (): Promise<MarketplaceListing[]> => {
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return [];

  const { data, error } = await supabase
    .from('marketplace_listings')
    .select('*')
    .eq('user_id', user.id)
    .order('created_at', { ascending: false });

  if (error) throw error;
  return (data || []) as MarketplaceListing[];
};

// Get specific listing by ID
export const getMarketplaceListingById = async (listingId: string): Promise<MarketplaceListing | null> => {
  const { data, error } = await supabase
    .from('marketplace_listings')
    .select('*')
    .eq('id', listingId)
    .maybeSingle();

  if (error) throw error;
  return (data as MarketplaceListing | null) ?? null;
};

// Update listing
export const updateMarketplaceListing = async (
  listingId: string,
  updates: Pick<MarketplaceListing, 'trade_preferences' | 'description' | 'expires_at'>
): Promise<void> => {
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) throw new Error('User not authenticated');

  const { error } = await supabase.rpc('update_marketplace_listing', {
    _listing_id: listingId,
    _trade_preferences: updates.trade_preferences ?? null,
    _description: updates.description ?? null,
    _expires_at: updates.expires_at || null,
  });

  if (error) throw error;
};

// Listings are soft-cancelled so accepted-trade references remain auditable.
export const deleteMarketplaceListing = async (listingId: string): Promise<void> => {
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) throw new Error('User not authenticated');

  const { error } = await supabase.rpc('cancel_marketplace_listing', {
    _listing_id: listingId,
  });

  if (error) throw error;
};

// Express interest in a listing
export const expressInterest = async (
  listingId: string,
  message?: string
): Promise<MarketplaceInterest> => {
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) throw new Error('User not authenticated');

  const { data, error } = await supabase
    .from('marketplace_interests')
    .insert([{
      listing_id: listingId,
      user_id: user.id,
      interest_type: 'trade',
      message
    }])
    .select()
    .single();

  if (error) throw error;
  return data as MarketplaceInterest;
};

// Get interests for a listing
export const getListingInterests = async (listingId: string): Promise<MarketplaceInterest[]> => {
  const { data, error } = await supabase
    .from('marketplace_interests')
    .select('*')
    .eq('listing_id', listingId)
    .order('created_at', { ascending: false });

  if (error) throw error;
  return (data || []) as MarketplaceInterest[];
};

// Add to favorites
export const addToFavorites = async (listingId: string): Promise<MarketplaceFavorite> => {
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) throw new Error('User not authenticated');

  const { data, error } = await supabase
    .from('marketplace_favorites')
    .insert([{
      listing_id: listingId,
      user_id: user.id
    }])
    .select()
    .single();

  if (error) throw error;
  return data as MarketplaceFavorite;
};

// Remove from favorites
export const removeFromFavorites = async (listingId: string): Promise<void> => {
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) throw new Error('User not authenticated');

  const { error } = await supabase
    .from('marketplace_favorites')
    .delete()
    .eq('listing_id', listingId)
    .eq('user_id', user.id);

  if (error) throw error;
};

// Get user's favorites
export const getUserFavorites = async (): Promise<MarketplaceFavorite[]> => {
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return [];

  const { data, error } = await supabase
    .from('marketplace_favorites')
    .select('*')
    .eq('user_id', user.id)
    .order('created_at', { ascending: false });

  if (error) throw error;
  return (data || []) as MarketplaceFavorite[];
};

// Check if listing is favorited by user
export const isListingFavorited = async (listingId: string): Promise<boolean> => {
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return false;

  const { data, error } = await supabase
    .from('marketplace_favorites')
    .select('id')
    .eq('listing_id', listingId)
    .eq('user_id', user.id)
    .limit(1);

  if (error) return false;
  return (data?.length || 0) > 0;
};

// Increment view count
export const incrementListingViews = async (listingId: string): Promise<void> => {
  const { error } = await supabase.rpc('increment_listing_views', {
    listing_id: listingId
  });

  if (error) console.error('Error incrementing views:', error);
};

// Subscribe to listing updates
export const subscribeToListingUpdates = (
  listingId: string,
  onUpdate: (payload: any) => void
) => {
  const channel = supabase
    .channel(`listing-${listingId}`)
    .on(
      'postgres_changes',
      {
        event: '*',
        schema: 'public',
        table: 'marketplace_listings',
        filter: `id=eq.${listingId}`
      },
      onUpdate
    )
    .subscribe();

  return () => supabase.removeChannel(channel);
};

// Subscribe to marketplace updates
export const subscribeToMarketplaceUpdates = (
  onUpdate: (payload: any) => void
) => {
  const channel = supabase
    .channel('marketplace-updates')
    .on(
      'postgres_changes',
      {
        event: '*',
        schema: 'public',
        table: 'marketplace_listings',
        filter: 'status=eq.active'
      },
      onUpdate
    )
    .subscribe();

  return () => supabase.removeChannel(channel);
};
