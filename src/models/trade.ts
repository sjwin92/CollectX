// Canonical trade model for the card-for-card journey.
// No escrow, no payments — this app trades cards directly.

export type TradeStatus =
  | "proposed"
  | "accepted"
  | "shipped"
  | "completed"
  | "disputed"
  | "cancelled";

export type UserReputation = "new" | "starter" | "established" | "trusted" | "elite";

export type ReputationTier = "new" | "established" | "trusted" | "verified";

export type Currency = "USD" | "EUR" | "GBP" | "AUD" | "CAD" | "JPY";

export interface TradeCard {
  id: string;
  name: string;
  imageUrl: string;
  condition: string;
  estimatedValue: number;
  currency: Currency;
  graded?: boolean;
  gradingCompany?: string;
  grade?: string;
}

export interface TradeParticipant {
  userId: string;
  username: string;
  reputation: UserReputation;
  tradeCount: number;
  successRate: number;
  offeringCards: TradeCard[];
}

export interface ShippingInfo {
  carrier: string;
  trackingNumber: string;
  estimatedDelivery?: string;
}

export interface TradeMessage {
  id: string;
  tradeId: string;
  userId: string;
  username: string;
  message: string;
  createdAt: string;
  systemMessage: boolean;
  imageUrl: string | null;
}

export interface TradeProposal {
  id: string;
  status: TradeStatus;
  createdAt: string;
  updatedAt: string;
  initiator: TradeParticipant;
  recipient: TradeParticipant;
  messages: TradeMessage[];
}
