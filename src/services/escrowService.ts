
import { v4 as uuidv4 } from 'uuid';
import { 
  TradeProposal, 
  TradeStatus, 
  TradeEscrow, 
  TradeAmount 
} from '@/models/escrow';

// Escrow calculations based on user reputation and card values
export const calculateEscrowAmount = (
  cardsTotalValue: number,
  userReputation: string
): TradeAmount => {
  let baseAmount = cardsTotalValue * 0.1; // Base escrow is 10% of cards value
  
  // Apply reputation discount
  let reputationDiscount = 0;
  switch (userReputation) {
    case "new":
      reputationDiscount = 0; // No discount for new users
      break;
    case "starter":
      reputationDiscount = baseAmount * 0.1; // 10% discount
      break;
    case "established":
      reputationDiscount = baseAmount * 0.25; // 25% discount
      break;
    case "trusted":
      reputationDiscount = baseAmount * 0.5; // 50% discount
      break;
    case "elite":
      reputationDiscount = baseAmount * 0.75; // 75% discount
      break;
    default:
      reputationDiscount = 0;
  }
  
  const finalAmount = baseAmount - reputationDiscount;
  
  return {
    baseAmount,
    reputationDiscount,
    finalAmount,
    currency: "USD"
  };
};

// Create a new escrow for a trade
export const createEscrow = (
  tradeProposal: TradeProposal
): TradeEscrow => {
  return {
    id: uuidv4(),
    tradeId: tradeProposal.id,
    status: "accepted" as TradeStatus,
    initiatorId: tradeProposal.initiator.userId,
    recipientId: tradeProposal.recipient.userId,
    initiatorEscrowAmount: tradeProposal.initiator.escrowAmount,
    recipientEscrowAmount: tradeProposal.recipient.escrowAmount,
    initiatorPaid: false,
    recipientPaid: false,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString()
  };
};

// Generate a release code for escrow (6 digits)
export const generateReleaseCode = (): string => {
  return Math.floor(100000 + Math.random() * 900000).toString();
};

// Process escrow payment simulation
export const processEscrowPayment = async (
  escrowId: string,
  userId: string,
  amount: number,
  currency: string
): Promise<boolean> => {
  // In a real application, this would connect to a payment processor
  console.log(`Processing payment of ${amount} ${currency} for escrow ${escrowId} by user ${userId}`);
  
  // Simulate payment processing delay
  await new Promise(resolve => setTimeout(resolve, 1000));
  
  // Simulate successful payment (could add random failures for testing)
  return true;
};

// Validate escrow release code
export const validateReleaseCode = (
  providedCode: string,
  actualCode: string
): boolean => {
  return providedCode === actualCode;
};

// Release escrow funds simulation
export const releaseEscrowFunds = async (
  escrowId: string,
  recipientId: string,
  amount: number,
  currency: string
): Promise<boolean> => {
  // In a real application, this would transfer funds to the recipient
  console.log(`Releasing ${amount} ${currency} from escrow ${escrowId} to recipient ${recipientId}`);
  
  // Simulate processing delay
  await new Promise(resolve => setTimeout(resolve, 1000));
  
  // Simulate successful release (could add random failures for testing)
  return true;
};
