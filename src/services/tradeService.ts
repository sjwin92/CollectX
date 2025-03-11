import { TradeProposal, TradeStatus, TradeMessage } from "@/models/escrow";
import { v4 as uuidv4 } from 'uuid';
import { getCardById, mapToTradeCard } from './tcgdexApi';
import { supabase } from "@/integrations/supabase/client";

const CARD_IDS = {
  CHARIZARD_GX_RR: 'sm12-150',
  VENUSAUR_V: 'sv1-1',
  PIKACHU_VMAX: 'swsh4-44',
  MEWTWO_EX: 'xy8-52',
  BLASTOISE_VMAX: 'swsh35-22',
  BLASTOISE_HOLO: 'base2-2',
};

const initializeMockTrades = async () => {
  try {
    console.log("Initializing mock trades with TCGDex API");
    const charizardGX = await getCardById(CARD_IDS.CHARIZARD_GX_RR);
    const venusaurV = await getCardById(CARD_IDS.VENUSAUR_V);
    const pikachuVMAX = await getCardById(CARD_IDS.PIKACHU_VMAX);
    const mewtwoEX = await getCardById(CARD_IDS.MEWTWO_EX);
    const blastoiseVMAX = await getCardById(CARD_IDS.BLASTOISE_VMAX);
    const blastoiseHolo = await getCardById(CARD_IDS.BLASTOISE_HOLO);

    // Create mock trades
    const mockTrades: Record<string, TradeProposal> = {
      "t1": {
        id: "t1",
        status: "completed",
        createdAt: new Date(Date.now() - 2 * 24 * 60 * 60 * 1000).toISOString(),
        updatedAt: new Date(Date.now() - 1 * 24 * 60 * 60 * 1000).toISOString(),
        initiator: {
          userId: "u1",
          username: "Alex Morgan",
          reputation: "trusted",
          tradeCount: 15,
          successRate: 98,
          offeringCards: [
            mapToTradeCard(charizardGX),
            mapToTradeCard(venusaurV)
          ],
          escrowAmount: {
            baseAmount: 520,
            reputationDiscount: 260,
            finalAmount: 260,
            currency: "USD"
          }
        },
        recipient: {
          userId: "u2",
          username: "Jordan Lee",
          reputation: "established",
          tradeCount: 8,
          successRate: 95,
          offeringCards: [
            mapToTradeCard(pikachuVMAX),
            mapToTradeCard(mewtwoEX),
            mapToTradeCard(blastoiseVMAX)
          ],
          escrowAmount: {
            baseAmount: 460,
            reputationDiscount: 115,
            finalAmount: 345,
            currency: "USD"
          }
        },
        escrow: {
          id: "e1",
          tradeId: "t1",
          status: "completed",
          initiatorId: "u1",
          recipientId: "u2",
          initiatorEscrowAmount: {
            baseAmount: 520,
            reputationDiscount: 260,
            finalAmount: 260,
            currency: "USD"
          },
          recipientEscrowAmount: {
            baseAmount: 460,
            reputationDiscount: 115,
            finalAmount: 345,
            currency: "USD"
          },
          initiatorPaid: true,
          recipientPaid: true,
          createdAt: new Date(Date.now() - 2 * 24 * 60 * 60 * 1000).toISOString(),
          updatedAt: new Date(Date.now() - 1 * 24 * 60 * 60 * 1000).toISOString(),
          completedAt: new Date(Date.now() - 1 * 24 * 60 * 60 * 1000).toISOString(),
          shippingInfo: {
            carrier: "USPS",
            trackingNumber: "9400123456789012345678",
            estimatedDelivery: new Date(Date.now() + 5 * 24 * 60 * 60 * 1000).toISOString()
          }
        },
        messages: [
          {
            id: "m1",
            tradeId: "t1",
            userId: "u1",
            username: "Alex Morgan",
            message: `I'm interested in your Pikachu VMAX. Would you trade it for my Charizard GX?`,
            createdAt: new Date(Date.now() - 3 * 24 * 60 * 60 * 1000).toISOString(),
            systemMessage: false
          },
          {
            id: "m2",
            tradeId: "t1",
            userId: "u2",
            username: "Jordan Lee",
            message: `I'd prefer to include my Mewtwo EX and Blastoise VMAX in the deal. Could you add your Venusaur V?`,
            createdAt: new Date(Date.now() - 3 * 24 * 60 * 60 * 1000 + 30 * 60 * 1000).toISOString(),
            systemMessage: false
          },
          {
            id: "m3",
            tradeId: "t1",
            userId: "u1",
            username: "Alex Morgan",
            message: "That sounds fair to me. Let's do it!",
            createdAt: new Date(Date.now() - 3 * 24 * 60 * 60 * 1000 + 60 * 60 * 1000).toISOString(),
            systemMessage: false
          }
        ]
      },
      "t2": {
        id: "t2",
        status: "proposed",
        createdAt: new Date(Date.now() - 5 * 60 * 60 * 1000).toISOString(),
        updatedAt: new Date(Date.now() - 5 * 60 * 60 * 1000).toISOString(),
        initiator: {
          userId: "u2",
          username: "Jordan Lee",
          reputation: "established",
          tradeCount: 8,
          successRate: 95,
          offeringCards: [
            mapToTradeCard(blastoiseHolo)
          ],
          escrowAmount: {
            baseAmount: 100,
            reputationDiscount: 25,
            finalAmount: 75,
            currency: "USD"
          }
        },
        recipient: {
          userId: "u3",
          username: "Taylor Kim",
          reputation: "new",
          tradeCount: 0,
          successRate: 0,
          offeringCards: [
            mapToTradeCard(mewtwoEX)
          ],
          escrowAmount: {
            baseAmount: 225,
            reputationDiscount: 0,
            finalAmount: 225,
            currency: "USD"
          }
        },
        escrow: null,
        messages: [
          {
            id: "m4",
            tradeId: "t2",
            userId: "u2",
            username: "Jordan Lee",
            message: `Hi, would you be interested in trading your Mewtwo EX for my Blastoise Holo?`,
            createdAt: new Date(Date.now() - 5 * 60 * 60 * 1000).toISOString(),
            systemMessage: false
          }
        ]
      }
    };

    console.log("Mock trades initialized with TCGDex API data:", Object.keys(mockTrades).length);
    return mockTrades;
  } catch (error) {
    console.error("Failed to initialize mock trades with TCGDex API:", error);
    return createFallbackTrades();
  }
};

const createFallbackTrades = () => {
  const fallbackCard = {
    id: "fallback-1",
    name: "Placeholder Card",
    imageUrl: "https://archives.bulbagarden.net/media/upload/1/17/Cardback.jpg",
    condition: "Near Mint",
    estimatedValue: 0,
    currency: "USD"
  };
  
  return {
    "t1": {
      id: "t1",
      status: "proposed",
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      initiator: {
        userId: "u1",
        username: "Alex Morgan",
        reputation: "trusted",
        tradeCount: 15,
        successRate: 98,
        offeringCards: [fallbackCard],
        escrowAmount: {
          baseAmount: 100,
          reputationDiscount: 50,
          finalAmount: 50,
          currency: "USD"
        }
      },
      recipient: {
        userId: "u2",
        username: "Jordan Lee",
        reputation: "established",
        tradeCount: 8,
        successRate: 95,
        offeringCards: [fallbackCard],
        escrowAmount: {
          baseAmount: 100,
          reputationDiscount: 25,
          finalAmount: 75,
          currency: "USD"
        }
      },
      escrow: null,
      messages: [
        {
          id: "m1",
          tradeId: "t1",
          userId: "u1",
          username: "Alex Morgan",
          message: "API is currently unavailable. This is a placeholder trade.",
          createdAt: new Date().toISOString(),
          systemMessage: true
        }
      ]
    }
  };
};

let mockTradesPromise = initializeMockTrades();

export const createTradeProposal = async (
  initiatorCards: any[],
  recipientId: string | null,
  message: string
): Promise<string | null> => {
  try {
    // Get current authenticated user
    const { data: { user } } = await supabase.auth.getUser();
    
    if (!user) {
      throw new Error('Authentication required');
    }
    
    // Create the trade proposal
    const { data: tradeProposal, error: tradeError } = await supabase
      .from('trade_proposals')
      .insert({
        initiator_id: user.id,
        recipient_id: recipientId,
        status: 'proposed'
      })
      .select()
      .single();
    
    if (tradeError) {
      console.error("Error creating trade proposal:", tradeError);
      throw tradeError;
    }
    
    // Add cards to the trade
    if (initiatorCards.length > 0) {
      const cardsToInsert = initiatorCards.map(card => ({
        card_id: card.id,
        condition: card.condition || "Near Mint",
        trade_id: tradeProposal.id,
        user_id: user.id,
        estimated_value: card.estimatedValue || 0,
        currency: card.currency || "USD"
      }));
      
      const { error: cardsError } = await supabase
        .from('trade_cards')
        .insert(cardsToInsert);
      
      if (cardsError) {
        console.error("Error adding cards to trade:", cardsError);
        throw cardsError;
      }
    }
    
    // Add initial message if provided
    if (message) {
      const { error: messageError } = await supabase
        .from('trade_messages')
        .insert({
          trade_id: tradeProposal.id,
          user_id: user.id,
          message: message,
          system_message: false
        });
      
      if (messageError) {
        console.error("Error adding message to trade:", messageError);
        throw messageError;
      }
    }
    
    return tradeProposal.id;
  } catch (error) {
    console.error("Error in createTradeProposal:", error);
    return null;
  }
};

export const getTradeProposal = async (id: string): Promise<TradeProposal> => {
  try {
    // Try to get from Supabase first
    const { data: { user } } = await supabase.auth.getUser();
    
    if (user) {
      const { data: tradeData, error: tradeError } = await supabase
        .from('trade_proposals')
        .select(`
          *,
          initiator_cards:trade_cards!trade_cards_trade_id_fkey(*)
        `)
        .eq('id', id)
        .single();
      
      if (tradeData && !tradeError) {
        // Transform Supabase data to match our TradeProposal model
        // For now, return mock data - in a real app you'd transform the data
        console.log("Supabase trade data found:", tradeData);
      }
    }
    
    // Fallback to mock data
    const trades = await mockTradesPromise;
    const trade = trades[id];
    if (!trade) {
      throw new Error(`Trade proposal with ID ${id} not found`);
    }
    return trade;
  } catch (error) {
    console.error("Error fetching trade proposal:", error);
    const trades = await mockTradesPromise;
    const trade = trades[id];
    if (!trade) {
      throw new Error(`Trade proposal with ID ${id} not found`);
    }
    return trade;
  }
};

export const addTradeMessage = async (tradeId: string, message: string): Promise<void> => {
  const trades = await mockTradesPromise;
  const trade = trades[tradeId];
  if (!trade) {
    throw new Error(`Trade proposal with ID ${tradeId} not found`);
  }
  
  const newMessage: TradeMessage = {
    id: uuidv4(),
    tradeId: tradeId,
    userId: "currentUser",
    username: "Current User",
    message,
    createdAt: new Date().toISOString(),
    systemMessage: false
  };
  
  trade.messages.push(newMessage);
  
  return Promise.resolve();
};

export const acceptTradeProposal = async (tradeId: string): Promise<void> => {
  const trades = await mockTradesPromise;
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
  const trades = await mockTradesPromise;
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

export const payInitiatorEscrow = async (tradeId: string): Promise<void> => {
  const trades = await mockTradesPromise;
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
      trade.updatedAt = new Date().toISOString();
    }
  } else {
    throw new Error(`Trade is not in a state where initiator can pay escrow`);
  }
  
  return Promise.resolve();
};

export const payRecipientEscrow = async (tradeId: string): Promise<void> => {
  const trades = await mockTradesPromise;
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
      trade.updatedAt = new Date().toISOString();
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
  const trades = await mockTradesPromise;
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

export const releaseTradeEscrow = async (tradeId: string): Promise<void> => {
  const trades = await mockTradesPromise;
  const trade = trades[tradeId];
  if (!trade) {
    throw new Error(`Trade proposal with ID ${tradeId} not found`);
  }
  
  if (trade.status === "shipped" && trade.escrow) {
    trade.escrow.completedAt = new Date().toISOString();
    trade.status = "completed";
    trade.updatedAt = new Date().toISOString();
    trade.escrow.updatedAt = new Date().toISOString();
  } else {
    throw new Error(`Trade is not in a state where escrow can be released`);
  }
  
  return Promise.resolve();
};

