import { supabase } from '@/integrations/supabase/client';
import { calculateEscrowAmount, generateReleaseCode } from './escrowService';

export interface EscrowTransaction {
  id: string;
  trade_id: string;
  initiator_user_id: string;
  recipient_user_id: string;
  initiator_escrow_amount: number;
  recipient_escrow_amount: number;
  initiator_paid: boolean;
  recipient_paid: boolean;
  initiator_payment_id?: string;
  recipient_payment_id?: string;
  release_code?: string;
  status: string;
  created_at: string;
  updated_at: string;
  completed_at?: string;
  metadata?: any;
}

// Create escrow transaction for a trade
export const createEscrowTransaction = async (
  tradeId: string,
  initiatorUserId: string,
  recipientUserId: string,
  initiatorCardsValue: number,
  recipientCardsValue: number,
  initiatorReputation: string = 'new',
  recipientReputation: string = 'new'
): Promise<EscrowTransaction> => {
  
  const initiatorEscrow = calculateEscrowAmount(initiatorCardsValue, initiatorReputation);
  const recipientEscrow = calculateEscrowAmount(recipientCardsValue, recipientReputation);
  
  const { data, error } = await supabase
    .from('escrow_transactions')
    .insert({
      trade_id: tradeId,
      initiator_user_id: initiatorUserId,
      recipient_user_id: recipientUserId,
      initiator_escrow_amount: initiatorEscrow.finalAmount,
      recipient_escrow_amount: recipientEscrow.finalAmount,
      release_code: generateReleaseCode(),
      status: 'pending'
    })
    .select()
    .single();
    
  if (error) {
    throw new Error(`Failed to create escrow: ${error.message}`);
  }
  
  return data;
};

// Get escrow transaction by trade ID
export const getEscrowByTradeId = async (tradeId: string): Promise<EscrowTransaction | null> => {
  const { data, error } = await supabase
    .from('escrow_transactions')
    .select('*')
    .eq('trade_id', tradeId)
    .single();
    
  if (error) {
    if (error.code === 'PGRST116') {
      return null; // No escrow found
    }
    throw new Error(`Failed to fetch escrow: ${error.message}`);
  }
  
  return data;
};

// Update escrow payment status
export const updateEscrowPayment = async (
  escrowId: string,
  userId: string,
  paymentId: string,
  paymentAmount: number
): Promise<EscrowTransaction> => {
  
  // First get the escrow to determine which user is paying
  const { data: escrowData, error: fetchError } = await supabase
    .from('escrow_transactions')
    .select('*')
    .eq('id', escrowId)
    .single();
    
  if (fetchError) {
    throw new Error(`Failed to fetch escrow: ${fetchError.message}`);
  }
  
  // Determine update fields based on user
  const updateFields: any = {};
  if (userId === escrowData.initiator_user_id) {
    updateFields.initiator_paid = true;
    updateFields.initiator_payment_id = paymentId;
  } else if (userId === escrowData.recipient_user_id) {
    updateFields.recipient_paid = true;
    updateFields.recipient_payment_id = paymentId;
  } else {
    throw new Error('User not authorized for this escrow transaction');
  }
  
  // Check if both parties have now paid
  const bothPaid = (userId === escrowData.initiator_user_id ? true : escrowData.initiator_paid) &&
                   (userId === escrowData.recipient_user_id ? true : escrowData.recipient_paid);
  
  if (bothPaid) {
    updateFields.status = 'escrowed';
  }
  
  const { data, error } = await supabase
    .from('escrow_transactions')
    .update(updateFields)
    .eq('id', escrowId)
    .select()
    .single();
    
  if (error) {
    throw new Error(`Failed to update escrow: ${error.message}`);
  }
  
  return data;
};

// Release escrow funds
export const releaseEscrowFunds = async (
  escrowId: string,
  releaseCode: string
): Promise<EscrowTransaction> => {
  
  // Verify release code
  const { data: escrowData, error: fetchError } = await supabase
    .from('escrow_transactions')
    .select('*')
    .eq('id', escrowId)
    .single();
    
  if (fetchError) {
    throw new Error(`Failed to fetch escrow: ${fetchError.message}`);
  }
  
  if (escrowData.release_code !== releaseCode) {
    throw new Error('Invalid release code');
  }
  
  if (escrowData.status !== 'escrowed') {
    throw new Error('Escrow is not in the correct status for release');
  }
  
  const { data, error } = await supabase
    .from('escrow_transactions')
    .update({
      status: 'completed',
      completed_at: new Date().toISOString()
    })
    .eq('id', escrowId)
    .select()
    .single();
    
  if (error) {
    throw new Error(`Failed to release escrow: ${error.message}`);
  }
  
  return data;
};

// Get all escrow transactions for a user
export const getUserEscrowTransactions = async (userId: string): Promise<EscrowTransaction[]> => {
  const { data, error } = await supabase
    .from('escrow_transactions')
    .select('*')
    .or(`initiator_user_id.eq.${userId},recipient_user_id.eq.${userId}`)
    .order('created_at', { ascending: false });
    
  if (error) {
    throw new Error(`Failed to fetch user escrows: ${error.message}`);
  }
  
  return data;
};