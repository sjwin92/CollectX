import { supabase } from '@/integrations/supabase/client';
import { ExtendedCardItemProps } from '@/types/cardTypes';
import { PokemonCard } from '@/services/pokemonTcgApi';

export interface SupabaseUserCard {
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
  tcg_player_url?: string;
  quantity: number;
  condition: string;
  is_graded: boolean;
  grade_company?: string;
  grade_score?: number;
  grade_population?: number;
  for_trade: boolean;
  trade_value?: number;
  product_type: string;
  sealed_product_type?: string;
  release_date?: string;
  created_at: string;
  updated_at: string;
}

// Extended type to include database fields
export interface ExtendedCardItemWithDB extends ExtendedCardItemProps {
  dbId?: string;
  createdAt?: string;
  updatedAt?: string;
}

// Convert Supabase user card to ExtendedCardItemProps
export const convertSupabaseCardToExtended = (supabaseCard: SupabaseUserCard): ExtendedCardItemWithDB => {
  return {
    id: supabaseCard.card_id,
    name: supabaseCard.card_name,
    imageUrl: supabaseCard.image_url_small || '',
    rarity: supabaseCard.rarity || '',
    condition: supabaseCard.condition,
    estimatedValue: supabaseCard.trade_value?.toString() || '0',
    graded: supabaseCard.is_graded,
    gradingCompany: supabaseCard.grade_company as any,
    gradeScore: supabaseCard.grade_score?.toString(),
    forTrade: supabaseCard.for_trade,
    forSale: false,
    set: {
      id: supabaseCard.set_id,
      name: supabaseCard.set_name
    },
    number: supabaseCard.card_number || '',
    productType: supabaseCard.product_type as any,
    quantity: supabaseCard.quantity,
    isSealed: supabaseCard.product_type === 'sealed',
    
    // Database fields for tracking
    dbId: supabaseCard.id,
    createdAt: supabaseCard.created_at,
    updatedAt: supabaseCard.updated_at
  };
};

// Add card to collection
export const addCardToCollection = async (newCard: ExtendedCardItemProps): Promise<void> => {
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) throw new Error('User not authenticated');

  const supabaseCard = {
    user_id: user.id,
    card_id: newCard.id,
    card_name: newCard.name,
    set_id: newCard.set?.id || '',
    set_name: newCard.set?.name || '',
    card_number: newCard.number,
    rarity: newCard.rarity,
    image_url: newCard.imageUrl,
    image_url_small: newCard.imageUrl,
    
    quantity: newCard.quantity || 1,
    condition: newCard.condition || 'near_mint',
    is_graded: newCard.graded || false,
    grade_company: newCard.gradingCompany,
    grade_score: newCard.gradeScore ? parseFloat(newCard.gradeScore) : null,
    for_trade: newCard.forTrade || false,
    trade_value: newCard.estimatedValue ? parseFloat(newCard.estimatedValue) : null,
    product_type: newCard.productType || 'card'
  };

  // Check if card already exists with same attributes
  const { data: existingCard } = await supabase
    .from('user_cards')
    .select('*')
    .eq('user_id', user.id)
    .eq('card_id', newCard.id)
    .eq('condition', newCard.condition || 'near_mint')
    .eq('is_graded', newCard.graded || false)
    .eq('grade_company', newCard.gradingCompany || null)
    .eq('product_type', newCard.productType || 'card')
    .maybeSingle();

  if (existingCard) {
    // Update quantity if card exists
    const { error } = await supabase
      .from('user_cards')
      .update({ 
        quantity: existingCard.quantity + (newCard.quantity || 1),
        for_trade: newCard.forTrade || existingCard.for_trade
      })
      .eq('id', existingCard.id);

    if (error) throw error;
  } else {
    // Insert new card
    const { error } = await supabase
      .from('user_cards')
      .insert([supabaseCard]);

    if (error) throw error;
  }
};

// Get user's collection
export const getCollection = async (): Promise<ExtendedCardItemWithDB[]> => {
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return [];

  const { data, error } = await supabase
    .from('user_cards')
    .select('*')
    .eq('user_id', user.id)
    .order('created_at', { ascending: false });

  if (error) throw error;

  return (data || []).map(convertSupabaseCardToExtended);
};

// Get tradable cards
export const getTradableCards = async (): Promise<ExtendedCardItemWithDB[]> => {
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return [];

  const { data, error } = await supabase
    .from('user_cards')
    .select('*')
    .eq('user_id', user.id)
    .eq('for_trade', true)
    .order('created_at', { ascending: false });

  if (error) throw error;

  return (data || []).map(convertSupabaseCardToExtended);
};

// Check if card is in collection
export const isCardInCollection = async (cardId: string): Promise<boolean> => {
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return false;

  const { data, error } = await supabase
    .from('user_cards')
    .select('id')
    .eq('user_id', user.id)
    .eq('card_id', cardId)
    .limit(1);

  if (error) return false;
  return (data?.length || 0) > 0;
};

// Remove card from collection
export const removeCardFromCollection = async (dbId: string): Promise<void> => {
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) throw new Error('User not authenticated');

  const { error } = await supabase
    .from('user_cards')
    .delete()
    .eq('id', dbId)
    .eq('user_id', user.id);

  if (error) throw error;
};

// Update card in collection
export const updateCardInCollection = async (
  dbId: string, 
  updates: Partial<ExtendedCardItemProps>
): Promise<void> => {
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) throw new Error('User not authenticated');

  const supabaseUpdates: any = {};
  
  if (updates.quantity !== undefined) supabaseUpdates.quantity = updates.quantity;
  if (updates.condition !== undefined) supabaseUpdates.condition = updates.condition;
  if (updates.graded !== undefined) supabaseUpdates.is_graded = updates.graded;
  if (updates.gradingCompany !== undefined) supabaseUpdates.grade_company = updates.gradingCompany;
  if (updates.gradeScore !== undefined) supabaseUpdates.grade_score = updates.gradeScore ? parseFloat(updates.gradeScore) : null;
  if (updates.forTrade !== undefined) supabaseUpdates.for_trade = updates.forTrade;

  const { error } = await supabase
    .from('user_cards')
    .update(supabaseUpdates)
    .eq('id', dbId)
    .eq('user_id', user.id);

  if (error) throw error;
};

// Clear all collections (for debugging)
export const clearCollections = async (): Promise<void> => {
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) throw new Error('User not authenticated');

  const { error } = await supabase
    .from('user_cards')
    .delete()
    .eq('user_id', user.id);

  if (error) throw error;
};

// Migrate data from localStorage to Supabase
export const migrateLocalStorageToSupabase = async (): Promise<void> => {
  try {
    // Get existing localStorage data
    const localCollection = localStorage.getItem('myCollection');
    if (!localCollection) return;

    const cards = JSON.parse(localCollection) as ExtendedCardItemProps[];
    if (cards.length === 0) return;

    // Add each card to Supabase
    for (const card of cards) {
      try {
        await addCardToCollection(card);
      } catch (error) {
        console.error('Error migrating card:', card.name, error);
      }
    }

    // Clear localStorage after successful migration
    localStorage.removeItem('myCollection');
    localStorage.removeItem('tradableCards');
    
    console.log('Successfully migrated', cards.length, 'cards to Supabase');
  } catch (error) {
    console.error('Error migrating localStorage to Supabase:', error);
  }
};

// Legacy functions for backwards compatibility
export const safelyParseCollection = () => [];
export const cardExistsInCollection = () => false;
export const notifyCollectionChange = () => {};
export const getCardUniqueKey = (card: ExtendedCardItemProps) => card.id;
export const addCardToTradable = () => {};
export const debugCollections = () => ({ collection: [], tradable: [] });