
import { EscrowCalculation, ReputationTier } from "@/models/escrow";

/**
 * Calculate the escrow amount required based on reputation tier and trade value
 */
export const calculateEscrowAmount = (
  reputation: ReputationTier,
  tradeValue: number,
  currency: string = "USD"
): EscrowCalculation => {
  // Base escrow rate by reputation tier (percentage of trade value)
  const escrowRates: Record<ReputationTier, number> = {
    new: 100, // New users pay 100% escrow
    established: 75, // Established users get 25% discount
    trusted: 50, // Trusted users get 50% discount
    verified: 25, // Verified users get 75% discount
  };

  const baseAmount = tradeValue;
  const rate = escrowRates[reputation] / 100;
  const finalAmount = baseAmount * rate;
  const reputationDiscount = baseAmount - finalAmount;

  return {
    baseAmount,
    reputationDiscount,
    finalAmount,
    currency
  };
};

/**
 * Format currency values for display
 */
export const formatCurrency = (amount: number, currency: string = "USD"): string => {
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency,
    minimumFractionDigits: 2
  }).format(amount);
};

/**
 * Generate a unique release code for trade completion
 */
export const generateReleaseCode = (): string => {
  return Math.random().toString(36).substring(2, 8).toUpperCase();
};
