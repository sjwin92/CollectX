
import { Currency } from '@/models/escrow';

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

export const calculateEscrowDiscount = (reputation: string, baseAmount: number): number => {
  switch (reputation) {
    case "new":
      return 0; // No discount
    case "starter":
      return baseAmount * 0.1; // 10% discount
    case "established":
      return baseAmount * 0.25; // 25% discount
    case "trusted":
      return baseAmount * 0.5; // 50% discount
    case "elite":
      return baseAmount * 0.75; // 75% discount
    default:
      return 0;
  }
};
