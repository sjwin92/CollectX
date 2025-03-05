
export type TradeStatus = 
  | "proposed" 
  | "accepted" 
  | "processing" 
  | "escrowed" 
  | "shipped" 
  | "received" 
  | "completed" 
  | "disputed" 
  | "cancelled" 
  | "pending" 
  | "declined";

export type ReputationTier = "new" | "established" | "trusted" | "verified";

export interface EscrowCalculation {
  baseAmount: number;
  reputationDiscount: number;
  finalAmount: number;
  currency: string;
}

export interface TradeEscrow {
  id: string;
  tradeId: string;
  status: TradeStatus;
  initiatorId: string;
  recipientId: string;
  initiatorEscrowAmount: EscrowCalculation;
  recipientEscrowAmount: EscrowCalculation;
  initiatorPaid: boolean;
  recipientPaid: boolean;
  createdAt: string;
  updatedAt: string;
  releaseCode?: string;
  shippingInfo?: {
    trackingNumber: string;
    carrier: string;
    estimatedDelivery?: string;
  };
}

export interface TradeParticipant {
  userId: string;
  username: string;
  reputation: ReputationTier;
  tradeCount: number;
  successRate: number;
  offeringCards: TradeCard[];
  escrowAmount: EscrowCalculation;
}

export interface TradeCard {
  id: string;
  name: string;
  imageUrl: string;
  condition: string;
  estimatedValue: number;
  currency: string;
}

export interface TradeProposal {
  id: string;
  status: TradeStatus;
  initiator: TradeParticipant;
  recipient: TradeParticipant;
  escrow?: TradeEscrow;
  messages: TradeMessage[];
  createdAt: string;
  updatedAt: string;
}

export interface TradeMessage {
  id: string;
  tradeId: string;
  userId: string;
  username: string;
  message: string;
  createdAt: string;
  systemMessage: boolean;
}
