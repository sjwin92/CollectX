import React, { useState } from 'react';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { Shield, CreditCard, Clock, CheckCircle } from 'lucide-react';
import { EscrowTransaction } from '@/services/supabaseEscrowService';
import { useToast } from '@/hooks/use-toast';

interface EscrowPaymentModalProps {
  isOpen: boolean;
  onClose: () => void;
  escrow: EscrowTransaction;
  currentUserId: string;
  onPaymentComplete: (paymentId: string) => void;
}

const EscrowPaymentModal = ({ 
  isOpen, 
  onClose, 
  escrow, 
  currentUserId,
  onPaymentComplete 
}: EscrowPaymentModalProps) => {
  const [isProcessing, setIsProcessing] = useState(false);
  const { toast } = useToast();
  
  const isInitiator = currentUserId === escrow.initiator_user_id;
  const userAmount = isInitiator ? escrow.initiator_escrow_amount : escrow.recipient_escrow_amount;
  const userPaid = isInitiator ? escrow.initiator_paid : escrow.recipient_paid;
  const otherUserPaid = isInitiator ? escrow.recipient_paid : escrow.initiator_paid;

  const handlePayment = async () => {
    setIsProcessing(true);
    
    try {
      // Simulate payment processing
      await new Promise(resolve => setTimeout(resolve, 2000));
      
      // Generate mock payment ID
      const paymentId = `pay_${Date.now()}`;
      
      onPaymentComplete(paymentId);
      
      toast({
        title: "Payment successful",
        description: "Your escrow payment has been processed successfully.",
      });
      
      onClose();
    } catch (error) {
      toast({
        variant: "destructive",
        title: "Payment failed",
        description: "There was an error processing your payment. Please try again.",
      });
    } finally {
      setIsProcessing(false);
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Shield className="h-5 w-5 text-green-600" />
            Escrow Payment
          </DialogTitle>
          <DialogDescription>
            Secure your trade with escrow protection
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          {/* Payment Status */}
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-base flex items-center gap-2">
                <CreditCard className="h-4 w-4" />
                Payment Status
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              <div className="flex items-center justify-between">
                <span className="text-sm">Your payment:</span>
                <Badge variant={userPaid ? "default" : "secondary"}>
                  {userPaid ? <CheckCircle className="h-3 w-3 mr-1" /> : <Clock className="h-3 w-3 mr-1" />}
                  {userPaid ? "Paid" : "Pending"}
                </Badge>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-sm">Other trader:</span>
                <Badge variant={otherUserPaid ? "default" : "secondary"}>
                  {otherUserPaid ? <CheckCircle className="h-3 w-3 mr-1" /> : <Clock className="h-3 w-3 mr-1" />}
                  {otherUserPaid ? "Paid" : "Pending"}
                </Badge>
              </div>
            </CardContent>
          </Card>

          {/* Payment Amount */}
          <Card>
            <CardContent className="pt-6">
              <div className="text-center space-y-2">
                <div className="text-2xl font-bold">${userAmount.toFixed(2)}</div>
                <div className="text-sm text-muted-foreground">
                  Escrow amount required
                </div>
              </div>
              <Separator className="my-4" />
              <div className="space-y-2 text-xs text-muted-foreground">
                <p>• Funds are held securely until trade completion</p>
                <p>• Released automatically when both parties confirm</p>
                <p>• Full refund if trade is cancelled</p>
              </div>
            </CardContent>
          </Card>

          {/* Payment Actions */}
          {!userPaid && (
            <div className="space-y-2">
              <Button 
                onClick={handlePayment} 
                disabled={isProcessing}
                className="w-full"
              >
                {isProcessing ? (
                  <>
                    <Clock className="h-4 w-4 mr-2 animate-spin" />
                    Processing Payment...
                  </>
                ) : (
                  <>
                    <CreditCard className="h-4 w-4 mr-2" />
                    Pay ${userAmount.toFixed(2)}
                  </>
                )}
              </Button>
              
              <p className="text-xs text-center text-muted-foreground">
                This is a demo payment. No real money will be charged.
              </p>
            </div>
          )}

          {userPaid && (
            <div className="text-center py-4">
              <CheckCircle className="h-8 w-8 text-green-600 mx-auto mb-2" />
              <p className="text-sm font-medium">Payment Complete</p>
              <p className="text-xs text-muted-foreground">
                {otherUserPaid 
                  ? "Trade is now secured with escrow"
                  : "Waiting for other trader to pay"
                }
              </p>
            </div>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
};

export default EscrowPaymentModal;