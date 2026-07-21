import { supabase as supabaseTyped } from '@/integrations/supabase/client';
import { ExtendedCardItemWithDB } from './supabaseCollectionService';
const supabase = supabaseTyped as any;

export interface TradeOffer {
  id: string;
  initiator_user_id: string;
  recipient_user_id: string;
  status: 'proposed' | 'accepted' | 'declined' | 'processing' | 'shipped' | 'completed' | 'cancelled' | 'disputed';
  title?: string;
  description?: string;
  initiator_cards: ExtendedCardItemWithDB[];
  recipient_cards: ExtendedCardItemWithDB[];
  initiator_value: number;
  recipient_value: number;
  shipping_address?: string;
  tracking_number?: string;
  escrow_required: boolean;
  escrow_amount: number;
  escrow_paid: boolean;
  created_at: string;
  updated_at: string;
  completed_at?: string;
  cancelled_at?: string;
}

export interface TradeMessage {
  id: string;
  trade_id: string;
  user_id: string;
  message: string;
  message_type: 'text' | 'system' | 'image';
  created_at: string;
}

export interface TradeRating {
  id: string;
  trade_id: string;
  rater_user_id: string;
  rated_user_id: string;
  rating: number;
  review?: string;
  created_at: string;
}

// Create a new trade offer. Both sides MUST include at least one card
// (enforced by a DB trigger — trades are card-for-card only).
export const createTradeOffer = async (tradeData: {
  recipient_user_id: string;
  title?: string;
  description?: string;
  initiator_cards: ExtendedCardItemWithDB[];
  recipient_cards: ExtendedCardItemWithDB[];
}): Promise<TradeOffer> => {
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) throw new Error('User not authenticated');

  if (!tradeData.initiator_cards?.length || !tradeData.recipient_cards?.length) {
    throw new Error('Both sides of the trade must include at least one card.');
  }

  const { data, error } = await supabase
    .from('trades')
    .insert([{
      initiator_user_id: user.id,
      recipient_user_id: tradeData.recipient_user_id,
      title: tradeData.title,
      description: tradeData.description,
      initiator_cards: tradeData.initiator_cards as any,
      recipient_cards: tradeData.recipient_cards as any,
    }])
    .select()
    .single();

  if (error) throw error;
  return {
    ...data,
    initiator_cards: data.initiator_cards as unknown as ExtendedCardItemWithDB[],
    recipient_cards: data.recipient_cards as unknown as ExtendedCardItemWithDB[]
  } as TradeOffer;
};

// Get user's trades (both initiated and received)
export const getUserTrades = async (): Promise<TradeOffer[]> => {
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return [];

  const { data, error } = await supabase
    .from('trades')
    .select('*')
    .or(`initiator_user_id.eq.${user.id},recipient_user_id.eq.${user.id}`)
    .order('created_at', { ascending: false });

  if (error) throw error;
  return (data || []).map(trade => ({
    ...trade,
    initiator_cards: trade.initiator_cards as unknown as ExtendedCardItemWithDB[],
    recipient_cards: trade.recipient_cards as unknown as ExtendedCardItemWithDB[]
  })) as TradeOffer[];
};

// Get specific trade by ID
export const getTradeById = async (tradeId: string): Promise<TradeOffer | null> => {
  const { data, error } = await supabase
    .from('trades')
    .select('*')
    .eq('id', tradeId)
    .single();

  if (error) return null;
  return {
    ...data,
    initiator_cards: data.initiator_cards as unknown as ExtendedCardItemWithDB[],
    recipient_cards: data.recipient_cards as unknown as ExtendedCardItemWithDB[]
  } as TradeOffer;
};

// Update trade status
export const updateTradeStatus = async (
  tradeId: string, 
  status: TradeOffer['status'],
  updates?: Partial<TradeOffer>
): Promise<void> => {
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) throw new Error('User not authenticated');

  const updateData: any = { status, ...updates };
  
  if (status === 'completed') {
    updateData.completed_at = new Date().toISOString();
  } else if (status === 'cancelled') {
    updateData.cancelled_at = new Date().toISOString();
  }

  const { error } = await supabase
    .from('trades')
    .update(updateData)
    .eq('id', tradeId);

  if (error) throw error;
};

// Get trade messages
export const getTradeMessages = async (tradeId: string): Promise<TradeMessage[]> => {
  const { data, error } = await supabase
    .from('trade_messages')
    .select('*')
    .eq('trade_id', tradeId)
    .order('created_at', { ascending: true });

  if (error) throw error;
  return (data || []) as TradeMessage[];
};

// Send trade message
export const sendTradeMessage = async (
  tradeId: string,
  message: string,
  messageType: 'text' | 'system' | 'image' = 'text'
): Promise<TradeMessage> => {
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) throw new Error('User not authenticated');

  const { data, error } = await supabase
    .from('trade_messages')
    .insert([{
      trade_id: tradeId,
      user_id: user.id,
      message,
      message_type: messageType
    }])
    .select()
    .single();

  if (error) throw error;
  return data as TradeMessage;
};

// Create trade rating
export const createTradeRating = async (
  tradeId: string,
  ratedUserId: string,
  rating: number,
  review?: string
): Promise<TradeRating> => {
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) throw new Error('User not authenticated');

  const { data, error } = await supabase
    .from('trade_ratings')
    .insert([{
      trade_id: tradeId,
      rater_user_id: user.id,
      rated_user_id: ratedUserId,
      rating,
      review
    }])
    .select()
    .single();

  if (error) throw error;
  return data;
};

// Get trade ratings for a trade
export const getTradeRatings = async (tradeId: string): Promise<TradeRating[]> => {
  const { data, error } = await supabase
    .from('trade_ratings')
    .select('*')
    .eq('trade_id', tradeId);

  if (error) throw error;
  return data || [];
};

// Subscribe to trade updates
export const subscribeToTradeUpdates = (
  tradeId: string,
  onUpdate: (payload: any) => void
) => {
  const channel = supabase
    .channel(`trade-${tradeId}`)
    .on(
      'postgres_changes',
      {
        event: '*',
        schema: 'public',
        table: 'trades',
        filter: `id=eq.${tradeId}`
      },
      onUpdate
    )
    .subscribe();

  return () => supabase.removeChannel(channel);
};

// Subscribe to trade messages
export const subscribeToTradeMessages = (
  tradeId: string,
  onMessage: (payload: any) => void
) => {
  const channel = supabase
    .channel(`trade-messages-${tradeId}`)
    .on(
      'postgres_changes',
      {
        event: 'INSERT',
        schema: 'public',
        table: 'trade_messages',
        filter: `trade_id=eq.${tradeId}`
      },
      onMessage
    )
    .subscribe();

  return () => supabase.removeChannel(channel);
};

// Upload a trade image to Supabase storage
export const uploadTradeImage = async (file: File): Promise<string> => {
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) throw new Error('User not authenticated');

  const fileExt = file.name.split('.').pop() || 'jpg';
  const filePath = `trade-images/${user.id}/${Date.now()}.${fileExt}`;

  const { error } = await (supabase as any).storage
    .from('card-images')
    .upload(filePath, file, { upsert: false });

  if (error) throw new Error(`Image upload failed: ${error.message}`);

  const { data: urlData } = (supabase as any).storage
    .from('card-images')
    .getPublicUrl(filePath);

  return urlData.publicUrl;
};