
import React, { useState } from 'react';
import { 
  Dialog, 
  DialogContent, 
  DialogHeader, 
  DialogTitle, 
  DialogDescription,
  DialogFooter
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { TradeEscrow } from '@/models/escrow';
import { Shield, Lock, CreditCard, AlertTriangle, CheckCircle, Loader2 } from 'lucide-react';
import { formatCurrency } from '@/utils/escrowCalculator';
import { useToast } from '@/hooks/use-toast';

interface EscrowModalProps {
  isOpen: boolean;
  onClose: () => void;
  escrow: TradeEscrow;
  isInitiator: boolean;
  onPayEscrow: () => Promise<boolean>;
  onReleaseEscrow?: (releaseCode: string) => Promise<boolean>;
}

const EscrowModal: React.FC<EscrowModalProps> = ({
  isOpen,
  onClose,
  escrow,
  isInitiator,
  onPayEscrow,
  onReleaseEscrow
}) => {
  const { toast } = useToast();
  const [isProcessing, setIsProcessing] = useState(false);
  const [isSuccess, setIsSuccess] = useState(false);
  const [releaseCode, setReleaseCode] = useState('');
  const [releaseError, setReleaseError] = useState<string | null>(null);

  const escrowAmount = isInitiator 
    ? escrow.initiatorEscrowAmount 
    : escrow.recipientEscrowAmount;

  const handlePayEscrow = async () => {
    setIsProcessing(true);
    try {
      const success = await onPayEscrow();
      if (success) {
        setIsSuccess(true);
        toast({
          title: "Escrow payment successful",
          description: "Your payment has been processed and the trade is now protected.",
          variant: "default"
        });
        setTimeout(() => {
          onClose();
        }, 2000);
      } else {
        toast({
          title: "Payment failed",
          description: "There was an issue processing your payment. Please try again.",
          variant: "destructive"
        });
      }
    } catch (error) {
      toast({
        title: "Payment error",
        description: "An unexpected error occurred. Please try again later.",
        variant: "destructive"
      });
    } finally {
      setIsProcessing(false);
    }
  };

  const handleReleaseEscrow = async () => {
    if (!releaseCode.trim()) {
      setReleaseError("Please enter the release code");
      return;
    }

    setIsProcessing(true);
    setReleaseError(null);
    
    try {
      if (onReleaseEscrow) {
        const success = await onReleaseEscrow(releaseCode);
        if (success) {
          setIsSuccess(true);
          toast({
            title: "Escrow released",
            description: "The trade has been completed and the escrow has been released.",
            variant: "default"
          });
          setTimeout(() => {
            onClose();
          }, 2000);
        } else {
          setReleaseError("Invalid release code. Please check and try again.");
        }
      }
    } catch (error) {
      setReleaseError("An unexpected error occurred. Please try again later.");
    } finally {
      setIsProcessing(false);
    }
  };

  // Determine if we're paying escrow or releasing escrow
  const isPayingEscrow = escrow.status === "accepted" && (
    (isInitiator && !escrow.initiatorPaid) || 
    (!isInitiator && !escrow.recipientPaid)
  );
  
  const isReleasingEscrow = escrow.status === "received" && !isInitiator;

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            {isPayingEscrow && (
              <>
                <Lock className="h-5 w-5 text-primary" />
                Pay Escrow Protection
              </>
            )}
            {isReleasingEscrow && (
              <>
                <Shield className="h-5 w-5 text-primary" />
                Release Escrow
              </>
            )}
          </DialogTitle>
          <DialogDescription>
            {isPayingEscrow && (
              "Secure your trade with escrow protection. This amount will be held until the trade is completed."
            )}
            {isReleasingEscrow && (
              "Enter the release code to complete the trade and release the escrow funds."
            )}
          </DialogDescription>
        </DialogHeader>

        {isSuccess ? (
          <div className="flex flex-col items-center justify-center py-6">
            <CheckCircle className="h-16 w-16 text-green-500 mb-4" />
            <p className="text-center text-lg font-medium">
              {isPayingEscrow ? "Payment Successful!" : "Escrow Released!"}
            </p>
            <p className="text-center text-muted-foreground mt-2">
              {isPayingEscrow 
                ? "Your trade is now protected by escrow" 
                : "The trade has been completed successfully"}
            </p>
          </div>
        ) : (
          <>
            {isPayingEscrow && (
              <div className="space-y-4">
                <div className="bg-secondary/30 p-4 rounded-md border border-border">
                  <h3 className="text-sm font-medium mb-2">Escrow Details</h3>
                  <div className="grid grid-cols-2 gap-2 text-sm">
                    <div className="text-muted-foreground">Base Amount:</div>
                    <div>{formatCurrency(escrowAmount.baseAmount, escrowAmount.currency)}</div>
                    
                    <div className="text-muted-foreground">Reputation Discount:</div>
                    <div>-{formatCurrency(escrowAmount.reputationDiscount, escrowAmount.currency)}</div>
                    
                    <div className="text-muted-foreground font-medium">Final Amount:</div>
                    <div className="font-medium">{formatCurrency(escrowAmount.finalAmount, escrowAmount.currency)}</div>
                  </div>
                </div>
                
                <div className="bg-primary/5 p-4 rounded-md border border-primary/20">
                  <div className="flex items-start gap-3">
                    <AlertTriangle className="h-5 w-5 text-yellow-500 mt-0.5" />
                    <div className="text-sm">
                      <p className="font-medium mb-1">Important:</p>
                      <p>This escrow amount will be held until both parties confirm the trade is complete. If there's a dispute, our moderators will review the case.</p>
                    </div>
                  </div>
                </div>

                <div>
                  <Label htmlFor="card-details">Card Details</Label>
                  <div className="flex items-center border rounded-md p-2 mt-1">
                    <CreditCard className="h-4 w-4 mr-2 text-muted-foreground" />
                    <span className="text-sm">**** **** **** 4242</span>
                  </div>
                  <p className="text-xs text-muted-foreground mt-1">
                    For demo purposes, all payments are simulated.
                  </p>
                </div>
              </div>
            )}

            {isReleasingEscrow && (
              <div className="space-y-4">
                <div className="bg-secondary/30 p-4 rounded-md border border-border">
                  <h3 className="text-sm font-medium mb-2">Release Escrow</h3>
                  <p className="text-sm text-muted-foreground mb-4">
                    The other party has confirmed they've shipped the cards. Once you receive them, enter the release code to complete the trade.
                  </p>
                  
                  <div>
                    <Label htmlFor="release-code">Release Code</Label>
                    <Input
                      id="release-code"
                      placeholder="Enter 6-digit code"
                      value={releaseCode}
                      onChange={(e) => setReleaseCode(e.target.value)}
                      maxLength={6}
                      className="mt-1"
                    />
                    {releaseError && (
                      <p className="text-sm text-destructive mt-1">{releaseError}</p>
                    )}
                  </div>
                </div>
                
                <div className="bg-primary/5 p-4 rounded-md border border-primary/20">
                  <div className="flex items-start gap-3">
                    <AlertTriangle className="h-5 w-5 text-yellow-500 mt-0.5" />
                    <div className="text-sm">
                      <p className="font-medium mb-1">Important:</p>
                      <p>Only release the escrow after you have received and verified the cards. This action cannot be undone.</p>
                    </div>
                  </div>
                </div>
              </div>
            )}
          </>
        )}

        <DialogFooter className="flex flex-col-reverse sm:flex-row sm:justify-end sm:space-x-2">
          {!isSuccess && (
            <>
              <Button variant="outline" onClick={onClose} disabled={isProcessing}>
                Cancel
              </Button>
              {isPayingEscrow && (
                <Button onClick={handlePayEscrow} disabled={isProcessing}>
                  {isProcessing ? (
                    <>
                      Processing...
                      <Loader2 className="ml-2 h-4 w-4 animate-spin" />
                    </>
                  ) : (
                    `Pay ${formatCurrency(escrowAmount.finalAmount, escrowAmount.currency)}`
                  )}
                </Button>
              )}
              {isReleasingEscrow && (
                <Button onClick={handleReleaseEscrow} disabled={isProcessing}>
                  {isProcessing ? (
                    <>
                      Processing...
                      <Loader2 className="ml-2 h-4 w-4 animate-spin" />
                    </>
                  ) : (
                    "Release Escrow"
                  )}
                </Button>
              )}
            </>
          )}
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};

export default EscrowModal;
