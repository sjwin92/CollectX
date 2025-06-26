
import { TradeStatus, UserReputation } from '@/models/escrow';

export interface ReputationScore {
  userId: string;
  reputation: UserReputation;
  totalTrades: number;
  successfulTrades: number;
  averageRating: number;
  escrowDiscountPercentage: number;
}

export interface TradeRating {
  id: string;
  tradeId: string;
  raterId: string;
  ratedUserId: string;
  rating: number; // 1-5 stars
  feedback: string;
  createdAt: string;
}

// Calculate reputation based on trade history and ratings
export const calculateReputation = (
  totalTrades: number,
  successfulTrades: number,
  averageRating: number
): UserReputation => {
  const successRate = totalTrades > 0 ? successfulTrades / totalTrades : 0;
  
  // New user (0-2 trades)
  if (totalTrades < 3) return 'new';
  
  // Starter (3-9 trades, >80% success rate, >3.5 rating)
  if (totalTrades < 10 && successRate >= 0.8 && averageRating >= 3.5) return 'starter';
  
  // Established (10-24 trades, >85% success rate, >4.0 rating)
  if (totalTrades < 25 && successRate >= 0.85 && averageRating >= 4.0) return 'established';
  
  // Trusted (25-49 trades, >90% success rate, >4.2 rating)
  if (totalTrades < 50 && successRate >= 0.90 && averageRating >= 4.2) return 'trusted';
  
  // Elite (50+ trades, >95% success rate, >4.5 rating)
  if (totalTrades >= 50 && successRate >= 0.95 && averageRating >= 4.5) return 'elite';
  
  // Default based on success rate for edge cases
  if (successRate >= 0.9) return 'trusted';
  if (successRate >= 0.8) return 'established';
  if (successRate >= 0.7) return 'starter';
  
  return 'new';
};

// Calculate escrow discount percentage based on reputation
export const getEscrowDiscount = (reputation: UserReputation): number => {
  switch (reputation) {
    case 'new': return 0;        // 0% discount
    case 'starter': return 10;   // 10% discount
    case 'established': return 25; // 25% discount
    case 'trusted': return 50;   // 50% discount
    case 'elite': return 75;     // 75% discount
    default: return 0;
  }
};

// Get reputation color for UI display
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

// Get reputation badge variant
export const getReputationBadgeVariant = (reputation: UserReputation): 'default' | 'secondary' | 'success' | 'warning' | 'info' => {
  switch (reputation) {
    case 'new': return 'default';
    case 'starter': return 'info';
    case 'established': return 'success';
    case 'trusted': return 'secondary';
    case 'elite': return 'warning';
    default: return 'default';
  }
};

// Mock service to get user reputation
export const getUserReputation = async (userId: string): Promise<ReputationScore> => {
  // In a real app, this would fetch from your database
  return {
    userId,
    reputation: 'established',
    totalTrades: 15,
    successfulTrades: 14,
    averageRating: 4.2,
    escrowDiscountPercentage: getEscrowDiscount('established')
  };
};

// Mock service to submit trade rating
export const submitTradeRating = async (
  tradeId: string,
  ratedUserId: string,
  rating: number,
  feedback: string
): Promise<TradeRating> => {
  const newRating: TradeRating = {
    id: `rating_${Date.now()}`,
    tradeId,
    raterId: 'current_user_id', // Would get from auth
    ratedUserId,
    rating,
    feedback,
    createdAt: new Date().toISOString()
  };
  
  // In a real app, this would save to your database
  console.log('Submitting trade rating:', newRating);
  
  return newRating;
};
