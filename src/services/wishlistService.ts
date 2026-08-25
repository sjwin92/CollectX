import { supabase as supabaseTyped } from '@/integrations/supabase/client';
import { PokemonCard } from '@/services/api/pokemonTypes';
const supabase = supabaseTyped as any;

export interface WishlistItem {
  id: string;
  card_id: string;
  card_name: string;
  set_id: string;
  set_name: string;
  image_url: string | null;
  priority: number;
  max_price: number | null;
  created_at: string;
}

export const getMyWishlist = async (): Promise<WishlistItem[]> => {
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return [];
  const { data, error } = await supabase
    .from('user_wishlist')
    .select('*')
    .eq('user_id', user.id)
    .order('created_at', { ascending: false });
  if (error) throw error;
  return data as WishlistItem[];
};

export const isOnWishlist = async (cardId: string): Promise<boolean> => {
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return false;
  const { data, error } = await supabase
    .from('user_wishlist')
    .select('id')
    .eq('user_id', user.id)
    .eq('card_id', cardId)
    .maybeSingle();
  if (error) return false;
  return !!data;
};

export const addToWishlist = async (card: PokemonCard, maxPrice?: number): Promise<void> => {
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) throw new Error('User not authenticated');
  const { error } = await supabase.from('user_wishlist').insert({
    user_id: user.id,
    card_id: card.id,
    card_name: card.name,
    set_id: card.set?.id || '',
    set_name: card.set?.name || '',
    image_url: card.images?.small || null,
    max_price: maxPrice ?? null,
  });
  if (error) throw error;
};

export const removeFromWishlist = async (cardId: string): Promise<void> => {
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) throw new Error('User not authenticated');
  const { error } = await supabase
    .from('user_wishlist')
    .delete()
    .eq('user_id', user.id)
    .eq('card_id', cardId);
  if (error) throw error;
};
