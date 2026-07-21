import { UserReputation } from '@/models/trade';
import { supabase } from '@/integrations/supabase/client';

export interface ReputationScore {
  userId: string;
  reputation: UserReputation;
  totalTrades: number;
  successfulTrades: number;
  averageRating: number;
}

export interface TradeRating {
  id: string;
  tradeId: string;
  raterId: string;
  ratedUserId: string;
  rating: number;
  feedback: string;
  createdAt: string;
}

export const calculateReputation = (
  totalTrades: number,
  successfulTrades: number,
  averageRating: number,
): UserReputation => {
  const successRate = totalTrades > 0 ? successfulTrades / totalTrades : 0;
  if (totalTrades < 3) return 'new';
  if (totalTrades < 10 && successRate >= 0.8 && averageRating >= 3.5) return 'starter';
  if (totalTrades < 25 && successRate >= 0.85 && averageRating >= 4.0) return 'established';
  if (totalTrades < 50 && successRate >= 0.9 && averageRating >= 4.2) return 'trusted';
  if (totalTrades >= 50 && successRate >= 0.95 && averageRating >= 4.5) return 'elite';
  if (successRate >= 0.9) return 'trusted';
  if (successRate >= 0.8) return 'established';
  if (successRate >= 0.7) return 'starter';
  return 'new';
};


export const getReputationColor = (reputation: UserReputation): string => {
  switch (reputation) {
    case 'new': return 'text-gray-600';
    case 'starter': return 'text-blue-600';
    case 'established': return 'text-green-600';
    case 'trusted': return 'text-purple-600';
    case 'elite': return 'text-amber-600';
    default: return 'text-gray-600';
  }
};

export const getReputationBadgeVariant = (
  reputation: UserReputation,
): 'default' | 'secondary' | 'success' | 'warning' | 'info' => {
  switch (reputation) {
    case 'new': return 'default';
    case 'starter': return 'info';
    case 'established': return 'success';
    case 'trusted': return 'secondary';
    case 'elite': return 'warning';
    default: return 'default';
  }
};

// Real backend: reads trade_ratings + trades tables
export const getUserReputation = async (userId: string): Promise<ReputationScore> => {
  const [{ data: ratings }, { data: trades }] = await Promise.all([
    supabase.from('trade_ratings').select('rating').eq('rated_user_id', userId),
    supabase
      .from('trades')
      .select('status, initiator_user_id, recipient_user_id')
      .or(`initiator_user_id.eq.${userId},recipient_user_id.eq.${userId}`),
  ]);

  const totalTrades = trades?.length ?? 0;
  const successfulTrades = trades?.filter((t) => t.status === 'completed').length ?? 0;
  const averageRating =
    ratings && ratings.length > 0
      ? ratings.reduce((sum, r) => sum + (r.rating ?? 0), 0) / ratings.length
      : 0;

  const reputation = calculateReputation(totalTrades, successfulTrades, averageRating);
  return {
    userId,
    reputation,
    totalTrades,
    successfulTrades,
    averageRating,
    escrowDiscountPercentage: getEscrowDiscount(reputation),
  };
};

export const submitTradeRating = async (
  tradeId: string,
  ratedUserId: string,
  rating: number,
  feedback: string,
): Promise<TradeRating> => {
  const { data: userResp, error: userErr } = await supabase.auth.getUser();
  if (userErr || !userResp.user) throw new Error('You must be signed in to rate.');

  const { data, error } = await supabase
    .from('trade_ratings')
    .insert({
      trade_id: tradeId,
      rater_user_id: userResp.user.id,
      rated_user_id: ratedUserId,
      rating,
      review: feedback,
    })
    .select()
    .single();

  if (error) throw new Error(error.message);

  return {
    id: data.id,
    tradeId: data.trade_id,
    raterId: data.rater_user_id,
    ratedUserId: data.rated_user_id,
    rating: data.rating,
    feedback: data.review ?? '',
    createdAt: data.created_at,
  };
};
