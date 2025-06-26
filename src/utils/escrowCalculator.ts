
import { Currency, UserReputation } from '@/models/escrow';
import { getEscrowDiscount } from '@/services/reputationService';

export const formatCurrency = (amount: number, currency: Currency = 'USD'): string => {
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: currency,
    minimumFractionDigits: 2,
    maximumFractionDigits: 2
  }).format(amount);
};

export const calculateTotalTradeValue = (cards: Array<{estimatedValue: number}>): number => {
  return cards.reduce((total, card) => total + (card.estimatedValue || 0), 0);
};

export const calculateEscrowAmount = (
  tradeValue: number, 
  reputation: UserReputation,
  baseEscrowPercentage: number = 10 // 10% of trade value as base escrow
): {
  baseAmount: number;
  discountAmount: number;
  finalAmount: number;
  discountPercentage: number;
} => {
  const baseAmount = Math.max(tradeValue * (baseEscrowPercentage / 100), 5); // Minimum $5 escrow
  const discountPercentage = getEscrowDiscount(reputation);
  const discountAmount = baseAmount * (discountPercentage / 100);
  const finalAmount = Math.max(baseAmount - discountAmount, 2.50); // Minimum $2.50 after discount
  
  return {
    baseAmount,
    discountAmount,
    finalAmount,
    discountPercentage
  };
};

export const calculateEscrowDiscount = (reputation: string, baseAmount: number): number => {
  const userRep = reputation as UserReputation;
  const discountPercentage = getEscrowDiscount(userRep);
  return baseAmount * (discountPercentage / 100);
};
