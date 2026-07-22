import { supabase } from '@/integrations/supabase/client';
import type { Tables, TablesInsert, TablesUpdate } from '@/integrations/supabase/types';
import { ExtendedCardItemProps } from '@/types/cardTypes';
import { UploadedCardImage } from '@/services/cardImageUploadService';
import { logUserActivity } from '@/services/supabaseAnalyticsService';

export type SupabaseUserCard = Tables<'user_cards'>;
type SupabaseUserCardInsert = TablesInsert<'user_cards'>;
type SupabaseUserCardUpdate = TablesUpdate<'user_cards'>;

// Extended type to include database fields
export interface ExtendedCardItemWithDB extends ExtendedCardItemProps {
  dbId?: string;
  createdAt?: string;
  updatedAt?: string;
  conditionImages?: UploadedCardImage[];
}

const toDatabaseProductType = (
  productType?: ExtendedCardItemProps['productType']
): SupabaseUserCardInsert['product_type'] => {
  if (!productType || productType === 'card') return 'single';
  return 'sealed';
};

const toUiProductType = (
  productType: SupabaseUserCard['product_type']
): ExtendedCardItemWithDB['productType'] => {
  return productType === 'sealed' ? 'other' : 'card';
};

const parseOptionalNumber = (value?: string): number | null => {
  if (!value) return null;
  const parsed = Number.parseFloat(value);
  return Number.isFinite(parsed) ? parsed : null;
};

// Convert Supabase user card to ExtendedCardItemProps
export const convertSupabaseCardToExtended = (
  supabaseCard: SupabaseUserCard
): ExtendedCardItemWithDB => {
  return {
    id: supabaseCard.card_id,
    name: supabaseCard.card_name || '',
    imageUrl: supabaseCard.card_image || '',
    rarity: supabaseCard.rarity || '',
    condition: supabaseCard.condition || 'near_mint',
    estimatedValue: supabaseCard.trade_value?.toString() || '0',
    graded: supabaseCard.is_graded,
    gradingCompany: supabaseCard.grading_company || undefined,
    gradeScore: supabaseCard.grade_score || undefined,
    forTrade: supabaseCard.for_trade,
    forSale: supabaseCard.for_sale,
    set: {
      id: supabaseCard.set_id || '',
      name: supabaseCard.set_name || '',
    },
    number: supabaseCard.card_number || '',
    productType: toUiProductType(supabaseCard.product_type),
    quantity: supabaseCard.quantity,
    isSealed: supabaseCard.product_type === 'sealed',

    dbId: supabaseCard.id,
    createdAt: supabaseCard.created_at,
    updatedAt: supabaseCard.updated_at,
  };
};

// Add card to collection
export const addCardToCollection = async (newCard: ExtendedCardItemProps): Promise<string> => {
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) throw new Error('User not authenticated');

  const productType = toDatabaseProductType(newCard.productType);

  const supabaseCard: SupabaseUserCardInsert = {
    user_id: user.id,
    card_id: newCard.id,
    card_name: newCard.name,
    set_id: newCard.set?.id || null,
    set_name: newCard.set?.name || null,
    card_number: newCard.number || null,
    rarity: newCard.rarity || null,
    card_image: newCard.imageUrl || null,
    quantity: newCard.quantity || 1,
    condition: newCard.condition || 'near_mint',
    is_graded: newCard.graded || false,
    grading_company: newCard.gradingCompany || null,
    grade_score: newCard.gradeScore || null,
    for_trade: newCard.forTrade || false,
    for_sale: newCard.forSale || false,
    trade_value: parseOptionalNumber(newCard.estimatedValue),
    product_type: productType,
  };

  const { data: existingCard, error: existingCardError } = await supabase
    .from('user_cards')
    .select('*')
    .eq('user_id', user.id)
    .eq('card_id', newCard.id)
    .eq('condition', newCard.condition || 'near_mint')
    .eq('is_graded', newCard.graded || false)
    .eq('grading_company', newCard.gradingCompany || null)
    .eq('product_type', productType)
    .maybeSingle();

  if (existingCardError) throw existingCardError;

  let userCardId: string;

  if (existingCard) {
    const updates: SupabaseUserCardUpdate = {
      quantity: existingCard.quantity + (newCard.quantity || 1),
      for_trade: newCard.forTrade || existingCard.for_trade,
      for_sale: newCard.forSale || existingCard.for_sale,
    };

    const { error } = await supabase
      .from('user_cards')
      .update(updates)
      .eq('id', existingCard.id);

    if (error) throw error;
    userCardId = existingCard.id;
  } else {
    const { data: insertedCard, error } = await supabase
      .from('user_cards')
      .insert([supabaseCard])
      .select('id')
      .single();

    if (error) throw error;
    userCardId = insertedCard.id;
  }

  if (newCard.conditionImages && newCard.conditionImages.length > 0) {
    const imageIds = newCard.conditionImages.map((img) => img.id);
    await supabase
      .from('card_images')
      .update({ user_card_id: userCardId })
      .in('id', imageIds)
      .eq('user_id', user.id);
  }

  logUserActivity('card_add', { card_name: newCard.name, quantity: newCard.quantity || 1 });

  return userCardId;
};

// Get user's collection
export const getCollection = async (): Promise<ExtendedCardItemWithDB[]> => {
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return [];

  const { data, error } = await supabase
    .from('user_cards')
    .select('*')
    .eq('user_id', user.id)
    .order('created_at', { ascending: false });

  if (error) throw error;

  return (data || []).map((card) => convertSupabaseCardToExtended(card));
};

// Get tradable cards
export const getTradableCards = async (): Promise<ExtendedCardItemWithDB[]> => {
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return [];

  const { data, error } = await supabase
    .from('user_cards')
    .select('*')
    .eq('user_id', user.id)
    .eq('for_trade', true)
    .order('created_at', { ascending: false });

  if (error) throw error;

  return (data || []).map((card) => convertSupabaseCardToExtended(card));
};

// Check if card is in collection
export const isCardInCollection = async (cardId: string): Promise<boolean> => {
  const {
    data: { user },
  } = await supabase.auth.getUser();
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
  const {
    data: { user },
  } = await supabase.auth.getUser();
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
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) throw new Error('User not authenticated');

  const supabaseUpdates: SupabaseUserCardUpdate = {};

  if (updates.quantity !== undefined) supabaseUpdates.quantity = updates.quantity;
  if (updates.condition !== undefined) supabaseUpdates.condition = updates.condition;
  if (updates.graded !== undefined) supabaseUpdates.is_graded = updates.graded;
  if (updates.gradingCompany !== undefined) supabaseUpdates.grading_company = updates.gradingCompany || null;
  if (updates.gradeScore !== undefined) supabaseUpdates.grade_score = updates.gradeScore || null;
  if (updates.forTrade !== undefined) supabaseUpdates.for_trade = updates.forTrade;
  if (updates.forSale !== undefined) supabaseUpdates.for_sale = updates.forSale;
  if (updates.estimatedValue !== undefined) supabaseUpdates.trade_value = parseOptionalNumber(updates.estimatedValue);

  const { error } = await supabase
    .from('user_cards')
    .update(supabaseUpdates)
    .eq('id', dbId)
    .eq('user_id', user.id);

  if (error) throw error;
};

// Clear all collections (for debugging)
export const clearCollections = async (): Promise<void> => {
  const {
    data: { user },
  } = await supabase.auth.getUser();
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
    const localCollection = localStorage.getItem('myCollection');
    if (!localCollection) return;

    const cards = JSON.parse(localCollection) as ExtendedCardItemProps[];
    if (cards.length === 0) return;

    for (const card of cards) {
      try {
        await addCardToCollection(card);
      } catch (error) {
        console.error('Error migrating card:', card.name, error);
      }
    }

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
