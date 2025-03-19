
export type TradeStatus =
  | "proposed"
  | "accepted"
  | "declined"
  | "pending"
  | "processing"
  | "escrowed"
  | "shipped"
  | "completed"
  | "disputed"
  | "cancelled";

export type UserReputation = "new" | "starter" | "established" | "trusted" | "elite";

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

export interface TradeAmount {
  baseAmount: number;
  reputationDiscount: number;
  finalAmount: number;
  currency: Currency;
}

export interface TradeParticipant {
  userId: string;
  username: string;
  reputation: UserReputation;
  tradeCount: number;
  successRate: number;
  offeringCards: TradeCard[];
  escrowAmount: TradeAmount;
}

export interface ShippingInfo {
  carrier: string;
  trackingNumber: string;
  estimatedDelivery?: string;
}

export interface TradeEscrow {
  id: string;
  tradeId: string;
  status: TradeStatus;
  initiatorId: string;
  recipientId: string;
  initiatorEscrowAmount: TradeAmount;
  recipientEscrowAmount: TradeAmount;
  initiatorPaid: boolean;
  recipientPaid: boolean;
  createdAt: string;
  updatedAt: string;
  completedAt?: string;
  shippingInfo?: ShippingInfo;
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
  escrow: TradeEscrow | null;
  messages: TradeMessage[];
}
