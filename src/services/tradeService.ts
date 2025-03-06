
import { TradeProposal, TradeStatus } from "@/models/escrow";

// Mock data and functions for now
export const getTradeProposal = async (id: string): Promise<TradeProposal> => {
  // Mock implementation
  throw new Error("Not implemented");
};

export const addTradeMessage = async (tradeId: string, message: string): Promise<void> => {
  // Mock implementation
  throw new Error("Not implemented");
};

export const acceptTradeProposal = async (tradeId: string): Promise<void> => {
  // Mock implementation
  throw new Error("Not implemented");
};

export const declineTradeProposal = async (tradeId: string): Promise<void> => {
  // Mock implementation
  throw new Error("Not implemented");
};

export const payInitiatorEscrow = async (tradeId: string): Promise<void> => {
  // Mock implementation
  throw new Error("Not implemented");
};

export const payRecipientEscrow = async (tradeId: string): Promise<void> => {
  // Mock implementation
  throw new Error("Not implemented");
};

export const releaseTradeEscrow = async (tradeId: string): Promise<void> => {
  // Mock implementation
  throw new Error("Not implemented");
};

export const updateShippingInfo = async (
  tradeId: string,
  carrier: string,
  trackingNumber: string,
  estimatedDelivery?: Date
): Promise<void> => {
  // Mock implementation
  throw new Error("Not implemented");
};
