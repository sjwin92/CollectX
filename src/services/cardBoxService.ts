import { supabase } from '@/integrations/supabase/client';
import type { Tables, TablesInsert, TablesUpdate } from '@/integrations/supabase/types';

type CardBoxRow = Tables<'card_boxes'>;
type CardBoxInsert = TablesInsert<'card_boxes'>;
type CardBoxUpdate = TablesUpdate<'card_boxes'>;

export interface CardBox {
  id: string;
  name: string;
  description: string | null;
  icon: string;
  color: string;
  createdAt: string;
  updatedAt: string;
  cardCount: number;
  totalValue: number;
}

export interface CardBoxItem {
  itemId: string;
  userCardId: string;
  cardName: string;
  cardImage: string | null;
  quantity: number;
  tradeValue: number | null;
  setName: string | null;
  rarity: string | null;
  addedAt: string;
}

export interface PickableCard {
  id: string;
  cardName: string;
  cardImage: string | null;
  quantity: number;
  tradeValue: number | null;
  setName: string | null;
}

async function getCurrentUserId(): Promise<string> {
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) throw new Error('User not authenticated');
  return user.id;
}

const toCardBox = (
  row: CardBoxRow & {
    card_box_items?: { user_cards: { quantity: number; trade_value: number | null } | null }[] | null;
  }
): CardBox => {
  const items = row.card_box_items ?? [];
  const cardCount = items.reduce((sum, item) => sum + (item.user_cards?.quantity ?? 0), 0);
  const totalValue = items.reduce(
    (sum, item) => sum + (item.user_cards?.trade_value ?? 0) * (item.user_cards?.quantity ?? 0),
    0
  );

  return {
    id: row.id,
    name: row.name,
    description: row.description,
    icon: row.icon,
    color: row.color,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
    cardCount,
    totalValue,
  };
};

// List the current user's boxes, with card count / total value computed from their real cards.
export const listBoxes = async (): Promise<CardBox[]> => {
  const userId = await getCurrentUserId();

  const { data, error } = await supabase
    .from('card_boxes')
    .select('*, card_box_items(user_cards(quantity, trade_value))')
    .eq('user_id', userId)
    .order('created_at', { ascending: false });

  if (error) throw error;

  return (data || []).map(toCardBox);
};

export const createBox = async (params: {
  name: string;
  description?: string;
  icon?: string;
  color?: string;
}): Promise<CardBox> => {
  const userId = await getCurrentUserId();

  const insert: CardBoxInsert = {
    user_id: userId,
    name: params.name.trim(),
    description: params.description?.trim() || null,
    icon: params.icon || 'Box',
    color: params.color || 'blue',
  };

  const { data, error } = await supabase
    .from('card_boxes')
    .insert(insert)
    .select('*')
    .single();

  if (error) throw error;

  return toCardBox(data);
};

export const updateBox = async (
  boxId: string,
  updates: { name?: string; description?: string | null; icon?: string; color?: string }
): Promise<void> => {
  const userId = await getCurrentUserId();

  const dbUpdates: CardBoxUpdate = {};
  if (updates.name !== undefined) dbUpdates.name = updates.name.trim();
  if (updates.description !== undefined) dbUpdates.description = updates.description?.trim() || null;
  if (updates.icon !== undefined) dbUpdates.icon = updates.icon;
  if (updates.color !== undefined) dbUpdates.color = updates.color;

  const { error } = await supabase
    .from('card_boxes')
    .update(dbUpdates)
    .eq('id', boxId)
    .eq('user_id', userId);

  if (error) throw error;
};

export const deleteBox = async (boxId: string): Promise<void> => {
  const userId = await getCurrentUserId();

  const { error } = await supabase
    .from('card_boxes')
    .delete()
    .eq('id', boxId)
    .eq('user_id', userId);

  if (error) throw error;
};

// Full contents of a single box, for the detail view.
export const getBoxItems = async (boxId: string): Promise<CardBoxItem[]> => {
  const { data, error } = await supabase
    .from('card_box_items')
    .select('id, added_at, user_card_id, user_cards(card_name, card_image, quantity, trade_value, set_name, rarity)')
    .eq('box_id', boxId)
    .order('added_at', { ascending: false });

  if (error) throw error;

  return (data || [])
    .filter((item) => item.user_cards)
    .map((item) => ({
      itemId: item.id,
      userCardId: item.user_card_id,
      cardName: item.user_cards!.card_name || 'Unknown card',
      cardImage: item.user_cards!.card_image,
      quantity: item.user_cards!.quantity,
      tradeValue: item.user_cards!.trade_value,
      setName: item.user_cards!.set_name,
      rarity: item.user_cards!.rarity,
      addedAt: item.added_at,
    }));
};

// The user's collection cards not already in this box, for the "add card" picker.
export const getAvailableCardsForBox = async (boxId: string): Promise<PickableCard[]> => {
  const userId = await getCurrentUserId();

  const [{ data: cards, error: cardsError }, { data: existing, error: existingError }] = await Promise.all([
    supabase
      .from('user_cards')
      .select('id, card_name, card_image, quantity, trade_value, set_name')
      .eq('user_id', userId)
      .order('card_name', { ascending: true }),
    supabase.from('card_box_items').select('user_card_id').eq('box_id', boxId),
  ]);

  if (cardsError) throw cardsError;
  if (existingError) throw existingError;

  const existingIds = new Set((existing || []).map((item) => item.user_card_id));

  return (cards || [])
    .filter((card) => !existingIds.has(card.id))
    .map((card) => ({
      id: card.id,
      cardName: card.card_name || 'Unknown card',
      cardImage: card.card_image,
      quantity: card.quantity,
      tradeValue: card.trade_value,
      setName: card.set_name,
    }));
};

export const addCardToBox = async (boxId: string, userCardId: string): Promise<void> => {
  const { error } = await supabase.from('card_box_items').insert({ box_id: boxId, user_card_id: userCardId });
  if (error) throw error;
};

export const removeCardFromBox = async (itemId: string): Promise<void> => {
  const { error } = await supabase.from('card_box_items').delete().eq('id', itemId);
  if (error) throw error;
};
