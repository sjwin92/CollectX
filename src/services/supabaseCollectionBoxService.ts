import { supabase } from '@/integrations/supabase/client';
import { convertSupabaseCardToExtended, type ExtendedCardItemWithDB } from './supabaseCollectionService';

export interface CollectionBox {
  id: string;
  user_id: string;
  name: string;
  description: string | null;
  icon: string;
  color: string;
  created_at: string;
  updated_at: string;
}

export interface CollectionBoxWithStats extends CollectionBox {
  cardCount: number;
  totalValue: number;
}

// Get the user's collection boxes with real card-count / total-value aggregates
export const getCollectionBoxesWithStats = async (): Promise<CollectionBoxWithStats[]> => {
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return [];

  const { data: boxes, error: boxesError } = await supabase
    .from('collection_boxes')
    .select('*')
    .eq('user_id', user.id)
    .order('created_at', { ascending: true });
  if (boxesError) throw boxesError;

  const { data: cards, error: cardsError } = await supabase
    .from('user_cards')
    .select('box_id, quantity, trade_value')
    .eq('user_id', user.id)
    .not('box_id', 'is', null);
  if (cardsError) throw cardsError;

  const statsByBox = new Map<string, { cardCount: number; totalValue: number }>();
  for (const card of cards || []) {
    const boxId = card.box_id as string;
    const existing = statsByBox.get(boxId) || { cardCount: 0, totalValue: 0 };
    existing.cardCount += card.quantity || 1;
    existing.totalValue += (card.trade_value || 0) * (card.quantity || 1);
    statsByBox.set(boxId, existing);
  }

  return (boxes || []).map((box) => ({
    ...box,
    cardCount: statsByBox.get(box.id)?.cardCount || 0,
    totalValue: statsByBox.get(box.id)?.totalValue || 0,
  }));
};

// Create a new box
export const createCollectionBox = async (
  name: string,
  description?: string
): Promise<CollectionBox> => {
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) throw new Error('User not authenticated');

  const { data, error } = await supabase
    .from('collection_boxes')
    .insert([{ user_id: user.id, name, description: description || null }])
    .select()
    .single();

  if (error) throw error;
  return data as CollectionBox;
};

// Rename / update a box's details
export const updateCollectionBox = async (
  boxId: string,
  updates: { name?: string; description?: string | null }
): Promise<void> => {
  const { error } = await supabase
    .from('collection_boxes')
    .update(updates)
    .eq('id', boxId);

  if (error) throw error;
};

// Delete a box (cards inside it are unassigned, not deleted, via ON DELETE SET NULL)
export const deleteCollectionBox = async (boxId: string): Promise<void> => {
  const { error } = await supabase
    .from('collection_boxes')
    .delete()
    .eq('id', boxId);

  if (error) throw error;
};

// Get the cards currently assigned to a box
export const getBoxCards = async (boxId: string): Promise<ExtendedCardItemWithDB[]> => {
  const { data, error } = await supabase
    .from('user_cards')
    .select('*')
    .eq('box_id', boxId)
    .order('created_at', { ascending: false });

  if (error) throw error;
  return (data || []).map((card) => convertSupabaseCardToExtended(card));
};

// Assign (or unassign, with boxId = null) a card to a box
export const assignCardToBox = async (userCardId: string, boxId: string | null): Promise<void> => {
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) throw new Error('User not authenticated');

  const { error } = await supabase
    .from('user_cards')
    .update({ box_id: boxId })
    .eq('id', userCardId)
    .eq('user_id', user.id);

  if (error) throw error;
};
