
import { TradeProposal, TradeStatus } from "@/models/escrow";
import { v4 as uuidv4 } from 'uuid';

// Mock data for trade proposals
const mockTrades: Record<string, TradeProposal> = {
  "t1": {
    id: "t1",
    status: "completed",
    createdAt: new Date(Date.now() - 2 * 24 * 60 * 60 * 1000).toISOString(), // 2 days ago
    initiator: {
      userId: "u1",
      username: "Alex Morgan",
      reputation: "trusted",
      offeringCards: [
        {
          id: "c1",
          name: "Charizard GX Rainbow Rare",
          imageUrl: "https://images.unsplash.com/photo-1605979257913-1704eb7b6246?q=80&w=1470&auto=format&fit=crop",
          rarity: "Ultra Rare",
          condition: "Near Mint",
          estimatedValue: 400
        },
        {
          id: "c2",
          name: "Venusaur V",
          imageUrl: "https://images.unsplash.com/photo-1613771404721-1f92d799e49f?q=80&w=1469&auto=format&fit=crop",
          rarity: "Rare",
          condition: "Mint",
          estimatedValue: 120
        }
      ],
      escrowAmount: {
        baseAmount: 520,
        feeAmount: 26,
        finalAmount: 546,
        currency: "USD"
      }
    },
    recipient: {
      userId: "u2",
      username: "Jordan Lee",
      reputation: "established",
      offeringCards: [
        {
          id: "c3",
          name: "Pikachu V-Max",
          imageUrl: "https://images.unsplash.com/photo-1607736703050-d0666c1d1278?q=80&w=1470&auto=format&fit=crop",
          rarity: "Rare",
          condition: "Mint",
          estimatedValue: 135
        },
        {
          id: "c4",
          name: "Mewtwo EX",
          imageUrl: "https://images.unsplash.com/photo-1613771404721-1f92d799e49f?q=80&w=1469&auto=format&fit=crop",
          rarity: "Ultra Rare",
          condition: "Excellent",
          estimatedValue: 225
        },
        {
          id: "c5",
          name: "Blastoise Holo",
          imageUrl: "https://images.unsplash.com/photo-1638075528746-8b5f9c2b6c9c?q=80&w=1480&auto=format&fit=crop",
          rarity: "Rare Holo",
          condition: "Good",
          estimatedValue: 100
        }
      ],
      escrowAmount: {
        baseAmount: 460,
        feeAmount: 23,
        finalAmount: 483,
        currency: "USD"
      }
    },
    escrow: {
      id: "e1",
      initiatorEscrowAmount: {
        baseAmount: 520,
        feeAmount: 26,
        finalAmount: 546,
        currency: "USD"
      },
      recipientEscrowAmount: {
        baseAmount: 460,
        feeAmount: 23,
        finalAmount: 483,
        currency: "USD"
      },
      initiatorPaid: true,
      recipientPaid: true,
      shippingInfo: {
        carrier: "USPS",
        trackingNumber: "9400123456789012345678",
        estimatedDelivery: new Date(Date.now() + 5 * 24 * 60 * 60 * 1000).toISOString() // 5 days from now
      },
      completedAt: new Date(Date.now() - 1 * 24 * 60 * 60 * 1000).toISOString() // 1 day ago
    },
    messages: [
      {
        id: "m1",
        userId: "u1",
        username: "Alex Morgan",
        message: "I'm interested in your Pikachu V-Max. Would you trade it for my Charizard GX?",
        createdAt: new Date(Date.now() - 3 * 24 * 60 * 60 * 1000).toISOString()
      },
      {
        id: "m2",
        userId: "u2",
        username: "Jordan Lee",
        message: "I'd prefer to include my Mewtwo EX and Blastoise Holo in the deal. Could you add your Venusaur V?",
        createdAt: new Date(Date.now() - 3 * 24 * 60 * 60 * 1000 + 30 * 60 * 1000).toISOString()
      },
      {
        id: "m3",
        userId: "u1",
        username: "Alex Morgan",
        message: "That sounds fair to me. Let's do it!",
        createdAt: new Date(Date.now() - 3 * 24 * 60 * 60 * 1000 + 60 * 60 * 1000).toISOString()
      }
    ]
  },
  "t2": {
    id: "t2",
    status: "proposed",
    createdAt: new Date(Date.now() - 5 * 60 * 60 * 1000).toISOString(), // 5 hours ago
    initiator: {
      userId: "u2",
      username: "Jordan Lee",
      reputation: "established",
      offeringCards: [
        {
          id: "c6",
          name: "Blastoise Holo",
          imageUrl: "https://images.unsplash.com/photo-1638075528746-8b5f9c2b6c9c?q=80&w=1480&auto=format&fit=crop",
          rarity: "Rare Holo",
          condition: "Good",
          estimatedValue: 100
        }
      ],
      escrowAmount: {
        baseAmount: 100,
        feeAmount: 5,
        finalAmount: 105,
        currency: "USD"
      }
    },
    recipient: {
      userId: "u3",
      username: "Taylor Kim",
      reputation: "new",
      offeringCards: [
        {
          id: "c7",
          name: "Mewtwo EX",
          imageUrl: "https://images.unsplash.com/photo-1613771404721-1f92d799e49f?q=80&w=1469&auto=format&fit=crop",
          rarity: "Ultra Rare",
          condition: "Excellent",
          estimatedValue: 225
        }
      ],
      escrowAmount: {
        baseAmount: 225,
        feeAmount: 11.25,
        finalAmount: 236.25,
        currency: "USD"
      }
    },
    escrow: null,
    messages: [
      {
        id: "m4",
        userId: "u2",
        username: "Jordan Lee",
        message: "Hi, would you be interested in trading your Mewtwo EX for my Blastoise Holo?",
        createdAt: new Date(Date.now() - 5 * 60 * 60 * 1000).toISOString()
      }
    ]
  }
};

// Mock implementation of service functions
export const getTradeProposal = async (id: string): Promise<TradeProposal> => {
  const trade = mockTrades[id];
  if (!trade) {
    throw new Error(`Trade proposal with ID ${id} not found`);
  }
  return trade;
};

export const addTradeMessage = async (tradeId: string, message: string): Promise<void> => {
  const trade = mockTrades[tradeId];
  if (!trade) {
    throw new Error(`Trade proposal with ID ${tradeId} not found`);
  }
  
  // Simulate adding a message
  trade.messages.push({
    id: uuidv4(),
    userId: "currentUser", // In a real app, this would be the current user's ID
    username: "Current User",
    message,
    createdAt: new Date().toISOString()
  });
  
  return Promise.resolve();
};

export const acceptTradeProposal = async (tradeId: string): Promise<void> => {
  const trade = mockTrades[tradeId];
  if (!trade) {
    throw new Error(`Trade proposal with ID ${tradeId} not found`);
  }
  
  // Simulate accepting a trade
  if (trade.status === "proposed") {
    trade.status = "accepted";
  } else {
    throw new Error(`Trade is not in a state that can be accepted`);
  }
  
  return Promise.resolve();
};

export const declineTradeProposal = async (tradeId: string): Promise<void> => {
  const trade = mockTrades[tradeId];
  if (!trade) {
    throw new Error(`Trade proposal with ID ${tradeId} not found`);
  }
  
  // Simulate declining a trade
  if (trade.status === "proposed") {
    trade.status = "declined";
  } else {
    throw new Error(`Trade is not in a state that can be declined`);
  }
  
  return Promise.resolve();
};

export const payInitiatorEscrow = async (tradeId: string): Promise<void> => {
  const trade = mockTrades[tradeId];
  if (!trade) {
    throw new Error(`Trade proposal with ID ${tradeId} not found`);
  }
  
  // Simulate paying escrow
  if (trade.status === "accepted") {
    if (!trade.escrow) {
      trade.escrow = {
        id: uuidv4(),
        initiatorEscrowAmount: trade.initiator.escrowAmount,
        recipientEscrowAmount: trade.recipient.escrowAmount,
        initiatorPaid: true,
        recipientPaid: false,
        shippingInfo: null,
        completedAt: null
      };
    } else {
      trade.escrow.initiatorPaid = true;
    }
    
    // If both parties have paid escrow, update status
    if (trade.escrow.initiatorPaid && trade.escrow.recipientPaid) {
      trade.status = "escrowed";
    }
  } else {
    throw new Error(`Trade is not in a state where initiator can pay escrow`);
  }
  
  return Promise.resolve();
};

export const payRecipientEscrow = async (tradeId: string): Promise<void> => {
  const trade = mockTrades[tradeId];
  if (!trade) {
    throw new Error(`Trade proposal with ID ${tradeId} not found`);
  }
  
  // Simulate paying escrow
  if (trade.status === "accepted") {
    if (!trade.escrow) {
      trade.escrow = {
        id: uuidv4(),
        initiatorEscrowAmount: trade.initiator.escrowAmount,
        recipientEscrowAmount: trade.recipient.escrowAmount,
        initiatorPaid: false,
        recipientPaid: true,
        shippingInfo: null,
        completedAt: null
      };
    } else {
      trade.escrow.recipientPaid = true;
    }
    
    // If both parties have paid escrow, update status
    if (trade.escrow.initiatorPaid && trade.escrow.recipientPaid) {
      trade.status = "escrowed";
    }
  } else {
    throw new Error(`Trade is not in a state where recipient can pay escrow`);
  }
  
  return Promise.resolve();
};

export const updateShippingInfo = async (
  tradeId: string,
  carrier: string,
  trackingNumber: string,
  estimatedDelivery?: Date
): Promise<void> => {
  const trade = mockTrades[tradeId];
  if (!trade) {
    throw new Error(`Trade proposal with ID ${tradeId} not found`);
  }
  
  // Simulate updating shipping info
  if (trade.status === "escrowed" && trade.escrow) {
    trade.escrow.shippingInfo = {
      carrier,
      trackingNumber,
      estimatedDelivery: estimatedDelivery ? estimatedDelivery.toISOString() : null
    };
    trade.status = "shipped";
  } else {
    throw new Error(`Trade is not in a state where shipping info can be updated`);
  }
  
  return Promise.resolve();
};

export const releaseTradeEscrow = async (tradeId: string): Promise<void> => {
  const trade = mockTrades[tradeId];
  if (!trade) {
    throw new Error(`Trade proposal with ID ${tradeId} not found`);
  }
  
  // Simulate releasing escrow
  if (trade.status === "shipped" && trade.escrow) {
    trade.escrow.completedAt = new Date().toISOString();
    trade.status = "completed";
  } else {
    throw new Error(`Trade is not in a state where escrow can be released`);
  }
  
  return Promise.resolve();
};
