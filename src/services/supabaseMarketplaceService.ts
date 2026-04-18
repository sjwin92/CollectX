import { supabase as supabaseTyped } from '@/integrations/supabase/client';
import { ExtendedCardItemWithDB } from './supabaseCollectionService';
const supabase = supabaseTyped as any;

export interface MarketplaceListing {
  id: string;
  user_id: string;
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
  listing_type: 'trade' | 'sale' | 'both';
  asking_price?: number;
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
  interest_type: 'trade' | 'buy';
  message?: string;
  created_at: string;
}

export interface MarketplaceFavorite {
  id: string;
  listing_id: string;
  user_id: string;
  created_at: string;
}

// Create a marketplace listing
export const createMarketplaceListing = async (
  card: ExtendedCardItemWithDB,
  listingData: {
    listing_type: 'trade' | 'sale' | 'both';
    asking_price?: number;
    trade_preferences?: string;
    description?: string;
    expires_at?: string;
  }
): Promise<MarketplaceListing> => {
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) throw new Error('User not authenticated');

  const { data, error } = await supabase
    .from('marketplace_listings')
    .insert([{
      user_id: user.id,
      card_id: card.id,
      card_name: card.name,
      set_id: card.set?.id || '',
      set_name: card.set?.name || '',
      card_number: card.number,
      rarity: card.rarity,
      image_url: card.imageUrl,
      image_url_small: card.imageUrl,
      condition: card.condition || 'near_mint',
      is_graded: card.graded || false,
      grade_company: card.gradingCompany,
      grade_score: card.gradeScore ? parseFloat(card.gradeScore) : null,
      quantity: card.quantity || 1,
      listing_type: listingData.listing_type,
      asking_price: listingData.asking_price,
      trade_preferences: listingData.trade_preferences,
      description: listingData.description,
      expires_at: listingData.expires_at
    }])
    .select()
    .single();

  if (error) throw error;
  return data as MarketplaceListing;
};

// Get marketplace listings with filters
export const getMarketplaceListings = async (filters?: {
  listing_type?: 'trade' | 'sale' | 'both';
  search?: string;
  set_id?: string;
  condition?: string;
  min_price?: number;
  max_price?: number;
  featured_only?: boolean;
  limit?: number;
  offset?: number;
}): Promise<MarketplaceListing[]> => {
  let query = supabase
    .from('marketplace_listings')
    .select('*')
    .eq('status', 'active')
    .order('created_at', { ascending: false });

  if (filters?.listing_type) {
    query = query.or(`listing_type.eq.${filters.listing_type},listing_type.eq.both`);
  }

  if (filters?.search) {
    query = query.or(`card_name.ilike.%${filters.search}%,description.ilike.%${filters.search}%`);
  }

  if (filters?.set_id) {
    query = query.eq('set_id', filters.set_id);
  }

  if (filters?.condition) {
    query = query.eq('condition', filters.condition);
  }

  if (filters?.min_price && filters?.max_price) {
    query = query.gte('asking_price', filters.min_price).lte('asking_price', filters.max_price);
  } else if (filters?.min_price) {
    query = query.gte('asking_price', filters.min_price);
  } else if (filters?.max_price) {
    query = query.lte('asking_price', filters.max_price);
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
    .single();

  if (error) return null;
  return data as MarketplaceListing;
};

// Update listing
export const updateMarketplaceListing = async (
  listingId: string,
  updates: Partial<MarketplaceListing>
): Promise<void> => {
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) throw new Error('User not authenticated');

  const { error } = await supabase
    .from('marketplace_listings')
    .update(updates)
    .eq('id', listingId)
    .eq('user_id', user.id);

  if (error) throw error;
};

// Delete listing
export const deleteMarketplaceListing = async (listingId: string): Promise<void> => {
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) throw new Error('User not authenticated');

  const { error } = await supabase
    .from('marketplace_listings')
    .delete()
    .eq('id', listingId)
    .eq('user_id', user.id);

  if (error) throw error;
};

// Express interest in a listing
export const expressInterest = async (
  listingId: string,
  interestType: 'trade' | 'buy',
  message?: string
): Promise<MarketplaceInterest> => {
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) throw new Error('User not authenticated');

  const { data, error } = await supabase
    .from('marketplace_interests')
    .insert([{
      listing_id: listingId,
      user_id: user.id,
      interest_type: interestType,
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
  filters: { listing_type?: string },
  onUpdate: (payload: any) => void
) => {
  let filterString = 'status=eq.active';
  if (filters.listing_type) {
    filterString += ` AND (listing_type=eq.${filters.listing_type} OR listing_type=eq.both)`;
  }

  const channel = supabase
    .channel('marketplace-updates')
    .on(
      'postgres_changes',
      {
        event: '*',
        schema: 'public',
        table: 'marketplace_listings',
        filter: filterString
      },
      onUpdate
    )
    .subscribe();

  return () => supabase.removeChannel(channel);
};