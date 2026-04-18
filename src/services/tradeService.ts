import { TradeProposal, TradeStatus, TradeMessage } from "@/models/escrow";
import { v4 as uuidv4 } from 'uuid';

const sessionTrades: Record<string, TradeProposal> = {};

export const getTradeProposal = async (id: string): Promise<TradeProposal> => {
  const trades = sessionTrades;
  const trade = trades[id];
  if (!trade) {
    throw new Error(`Trade proposal with ID ${id} not found`);
  }
  return trade;
};

export const addTradeMessage = async (tradeId: string, message: string, imageUrl: string | null = null): Promise<void> => {
  const trades = sessionTrades;
  const trade = trades[tradeId];
  if (!trade) {
    throw new Error(`Trade proposal with ID ${tradeId} not found`);
  }
  
  const newMessage: TradeMessage = {
    id: uuidv4(),
    tradeId: tradeId,
    userId: "user-1", // Using the current user ID from useUser hook
    username: "Current User",
    message,
    createdAt: new Date().toISOString(),
    systemMessage: false,
    imageUrl
  };
  
  trade.messages.push(newMessage);
  
  return Promise.resolve();
};

export const acceptTradeProposal = async (tradeId: string): Promise<void> => {
  const trades = sessionTrades;
  const trade = trades[tradeId];
  if (!trade) {
    throw new Error(`Trade proposal with ID ${tradeId} not found`);
  }
  
  if (trade.status === "proposed") {
    trade.status = "accepted";
    trade.updatedAt = new Date().toISOString();
  } else {
    throw new Error(`Trade is not in a state that can be accepted`);
  }
  
  return Promise.resolve();
};

export const declineTradeProposal = async (tradeId: string): Promise<void> => {
  const trades = sessionTrades;
  const trade = trades[tradeId];
  if (!trade) {
    throw new Error(`Trade proposal with ID ${tradeId} not found`);
  }
  
  if (trade.status === "proposed") {
    trade.status = "declined";
    trade.updatedAt = new Date().toISOString();
  } else {
    throw new Error(`Trade is not in a state that can be declined`);
  }
  
  return Promise.resolve();
};

export const payInitiatorEscrow = async (tradeId: string): Promise<boolean> => {
  const trades = sessionTrades;
  const trade = trades[tradeId];
  if (!trade) {
    throw new Error(`Trade proposal with ID ${tradeId} not found`);
  }
  
  if (trade.status === "accepted") {
    if (!trade.escrow) {
      trade.escrow = {
        id: uuidv4(),
        tradeId: tradeId,
        status: "accepted",
        initiatorId: trade.initiator.userId,
        recipientId: trade.recipient.userId,
        initiatorEscrowAmount: trade.initiator.escrowAmount,
        recipientEscrowAmount: trade.recipient.escrowAmount,
        initiatorPaid: true,
        recipientPaid: false,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString()
      };
    } else {
      trade.escrow.initiatorPaid = true;
      trade.escrow.updatedAt = new Date().toISOString();
    }
    
    if (trade.escrow.initiatorPaid && trade.escrow.recipientPaid) {
      trade.status = "escrowed";
      trade.escrow.status = "escrowed";
      trade.updatedAt = new Date().toISOString();
    }
    
    return true;
  } else {
    throw new Error(`Trade is not in a state where initiator can pay escrow`);
  }
};

export const payRecipientEscrow = async (tradeId: string): Promise<boolean> => {
  const trades = sessionTrades;
  const trade = trades[tradeId];
  if (!trade) {
    throw new Error(`Trade proposal with ID ${tradeId} not found`);
  }
  
  if (trade.status === "accepted") {
    if (!trade.escrow) {
      trade.escrow = {
        id: uuidv4(),
        tradeId: tradeId,
        status: "accepted",
        initiatorId: trade.initiator.userId,
        recipientId: trade.recipient.userId,
        initiatorEscrowAmount: trade.initiator.escrowAmount,
        recipientEscrowAmount: trade.recipient.escrowAmount,
        initiatorPaid: false,
        recipientPaid: true,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString()
      };
    } else {
      trade.escrow.recipientPaid = true;
      trade.escrow.updatedAt = new Date().toISOString();
    }
    
    if (trade.escrow.initiatorPaid && trade.escrow.recipientPaid) {
      trade.status = "escrowed";
      trade.escrow.status = "escrowed";
      trade.updatedAt = new Date().toISOString();
    }
    
    return true;
  } else {
    throw new Error(`Trade is not in a state where recipient can pay escrow`);
  }
};

export const confirmTradeReceipt = async (tradeId: string): Promise<boolean> => {
  const trades = sessionTrades;
  const trade = trades[tradeId];
  if (!trade) {
    throw new Error(`Trade proposal with ID ${tradeId} not found`);
  }
  
  if (trade.status === "shipped" && trade.escrow) {
    trade.status = "received";
    trade.escrow.status = "received";
    trade.escrow.releaseCode = Math.floor(100000 + Math.random() * 900000).toString();
    trade.updatedAt = new Date().toISOString();
    trade.escrow.updatedAt = new Date().toISOString();
    
    // Add a system message about the receipt confirmation
    const newMessage = {
      id: uuidv4(),
      tradeId: tradeId,
      userId: "system",
      username: "System",
      message: "The recipient has confirmed receipt of the items. The sender can now release the escrow funds using the release code.",
      createdAt: new Date().toISOString(),
      systemMessage: true,
      imageUrl: null
    };
    
    trade.messages.push(newMessage);
    
    return true;
  } else {
    throw new Error(`Trade is not in a state where receipt can be confirmed`);
  }
};

export const validateReleaseEscrow = async (tradeId: string, releaseCode: string): Promise<boolean> => {
  const trades = sessionTrades;
  const trade = trades[tradeId];
  if (!trade) {
    throw new Error(`Trade proposal with ID ${tradeId} not found`);
  }
  
  if (trade.status === "received" && trade.escrow && trade.escrow.releaseCode === releaseCode) {
    return true;
  }
  
  return false;
};

export const releaseTradeEscrow = async (tradeId: string, releaseCode: string): Promise<boolean> => {
  const trades = sessionTrades;
  const trade = trades[tradeId];
  if (!trade) {
    throw new Error(`Trade proposal with ID ${tradeId} not found`);
  }
  
  if (trade.status === "received" && trade.escrow) {
    if (trade.escrow.releaseCode !== releaseCode) {
      return false;
    }
    
    trade.escrow.completedAt = new Date().toISOString();
    trade.status = "completed";
    trade.escrow.status = "completed";
    trade.updatedAt = new Date().toISOString();
    trade.escrow.updatedAt = new Date().toISOString();
    
    // Add a system message about the escrow release
    const newMessage = {
      id: uuidv4(),
      tradeId: tradeId,
      userId: "system",
      username: "System",
      message: "The escrow has been released and the trade is now complete. Thank you for using our platform!",
      createdAt: new Date().toISOString(),
      systemMessage: true,
      imageUrl: null
    };
    
    trade.messages.push(newMessage);
    
    return true;
  } else {
    throw new Error(`Trade is not in a state where escrow can be released`);
  }
};

export const updateShippingInfo = async (
  tradeId: string,
  carrier: string,
  trackingNumber: string,
  estimatedDelivery?: Date
): Promise<void> => {
  const trades = sessionTrades;
  const trade = trades[tradeId];
  if (!trade) {
    throw new Error(`Trade proposal with ID ${tradeId} not found`);
  }
  
  if (trade.status === "escrowed" && trade.escrow) {
    trade.escrow.shippingInfo = {
      carrier,
      trackingNumber,
      estimatedDelivery: estimatedDelivery ? estimatedDelivery.toISOString() : undefined
    };
    trade.status = "shipped";
    trade.updatedAt = new Date().toISOString();
    trade.escrow.updatedAt = new Date().toISOString();
  } else {
    throw new Error(`Trade is not in a state where shipping info can be updated`);
  }
  
  return Promise.resolve();
};

export const uploadTradeImage = async (file: File): Promise<string> => {
  throw new Error("Image upload not yet implemented. Please configure Supabase Storage.");
};
