
import React, { useState } from "react";
import { TradeEscrow, TradeStatus } from "@/models/escrow";
import GlassCard from "@/components/ui/custom/GlassCard";
import Badge from "@/components/ui/custom/Badge";
import { Button } from "@/components/ui/button";
import { LockKeyhole, Shield, AlertTriangle, CheckCircle, Clock, Loader2 } from "lucide-react";
import { formatCurrency } from "@/utils/escrowCalculator";
import { useToast } from "@/hooks/use-toast";
import EscrowModal from "./EscrowModal";

interface EscrowDetailsProps {
  escrow: TradeEscrow;
  isInitiator: boolean;
  onPayEscrow: () => Promise<boolean>;
  onReleaseEscrow: (releaseCode: string) => Promise<boolean>;
  onConfirmReceipt: () => Promise<boolean>;
}

const EscrowDetails = ({
  escrow,
  isInitiator,
  onPayEscrow,
  onReleaseEscrow,
  onConfirmReceipt
}: EscrowDetailsProps) => {
  const { toast } = useToast();
  const [isEscrowModalOpen, setIsEscrowModalOpen] = useState(false);
  const [isReleaseModalOpen, setIsReleaseModalOpen] = useState(false);
  const [isConfirming, setIsConfirming] = useState(false);
  
  const handleCopyReleaseCode = () => {
    if (escrow.releaseCode) {
      navigator.clipboard.writeText(escrow.releaseCode);
      toast({
        title: "Release code copied",
        description: "The release code has been copied to your clipboard"
      });
    }
  };

  const handleConfirmReceipt = async () => {
    setIsConfirming(true);
    try {
      const success = await onConfirmReceipt();
      if (success) {
        toast({
          title: "Receipt confirmed",
          description: "You have confirmed receipt of the traded cards."
        });
      } else {
        toast({
          variant: "destructive",
          title: "Error confirming receipt",
          description: "There was a problem confirming your receipt. Please try again."
        });
      }
    } catch (error) {
      toast({
        variant: "destructive",
        title: "Error confirming receipt",
        description: "An unexpected error occurred. Please try again later."
      });
    } finally {
      setIsConfirming(false);
    }
  };

  const getStatusColor = (status: TradeStatus): string => {
    switch (status) {
      case "proposed":
      case "accepted":
        return "bg-blue-500";
      case "escrowed":
      case "processing":
      case "shipped":
        return "bg-yellow-500";
      case "received":
      case "completed":
        return "bg-green-500";
      case "disputed":
      case "cancelled":
        return "bg-red-500";
      default:
        return "bg-gray-500";
    }
  };

  const renderEscrowStatus = () => {
    const myAmount = isInitiator 
      ? escrow.initiatorEscrowAmount 
      : escrow.recipientEscrowAmount;
    
    const myPaid = isInitiator 
      ? escrow.initiatorPaid 
      : escrow.recipientPaid;
    
    const theirPaid = isInitiator 
      ? escrow.recipientPaid 
      : escrow.initiatorPaid;

    return (
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Shield className="h-5 w-5 text-primary" />
            <h3 className="text-lg font-semibold">Escrow Protection</h3>
          </div>
          <div className={`h-3 w-3 rounded-full ${getStatusColor(escrow.status)}`} />
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div className="space-y-2">
            <div className="text-sm text-muted-foreground">Your Escrow Status:</div>
            <div className="flex items-center gap-2">
              {myPaid ? (
                <CheckCircle className="h-5 w-5 text-green-500" />
              ) : (
                <Clock className="h-5 w-5 text-yellow-500" />
              )}
              <span className="font-medium">
                {myPaid 
                  ? "Paid" 
                  : `${formatCurrency(myAmount.finalAmount, myAmount.currency)} Required`}
              </span>
            </div>
            {!myPaid && myAmount.reputationDiscount > 0 && (
              <div className="text-xs text-muted-foreground">
                You saved {formatCurrency(myAmount.reputationDiscount, myAmount.currency)} based on your reputation!
              </div>
            )}
          </div>

          <div className="space-y-2">
            <div className="text-sm text-muted-foreground">Their Escrow Status:</div>
            <div className="flex items-center gap-2">
              {theirPaid ? (
                <CheckCircle className="h-5 w-5 text-green-500" />
              ) : (
                <Clock className="h-5 w-5 text-yellow-500" />
              )}
              <span className="font-medium">
                {theirPaid ? "Paid" : "Awaiting Payment"}
              </span>
            </div>
          </div>
        </div>

        {escrow.status === "shipped" && escrow.shippingInfo && (
          <div className="mt-4 p-3 border border-border rounded-md bg-secondary/30">
            <div className="text-sm font-medium mb-1">Shipping Information</div>
            <div className="grid grid-cols-2 gap-2 text-sm">
              <div className="text-muted-foreground">Tracking:</div>
              <div>{escrow.shippingInfo.trackingNumber}</div>
              <div className="text-muted-foreground">Carrier:</div>
              <div>{escrow.shippingInfo.carrier}</div>
              {escrow.shippingInfo.estimatedDelivery && (
                <>
                  <div className="text-muted-foreground">Est. Delivery:</div>
                  <div>{escrow.shippingInfo.estimatedDelivery}</div>
                </>
              )}
            </div>
          </div>
        )}

        {escrow.releaseCode && (
          <div className="flex items-center justify-between p-3 mt-2 border border-primary/20 rounded-md bg-primary/5">
            <div className="flex items-center gap-2">
              <LockKeyhole className="h-4 w-4 text-primary" />
              <span className="text-sm font-medium">Release Code: {escrow.releaseCode}</span>
            </div>
            <Button 
              variant="ghost" 
              size="sm" 
              onClick={handleCopyReleaseCode}
            >
              Copy
            </Button>
          </div>
        )}

        <div className="flex justify-end gap-2 mt-4">
          {!myPaid && escrow.status === "accepted" && (
            <Button onClick={() => setIsEscrowModalOpen(true)} size="sm">
              Pay Escrow
            </Button>
          )}
          
          {escrow.status === "shipped" && (
            <Button onClick={handleConfirmReceipt} size="sm" disabled={isConfirming}>
              {isConfirming ? (
                <>
                  Confirming...
                  <Loader2 className="ml-2 h-4 w-4 animate-spin" />
                </>
              ) : (
                "Confirm Receipt"
              )}
            </Button>
          )}
          
          {escrow.status === "received" && (
            <Button onClick={() => setIsReleaseModalOpen(true)} size="sm">
              Release Funds
            </Button>
          )}
          
          {["proposed", "accepted", "processing"].includes(escrow.status) && (
            <Button variant="outline" size="sm">
              Cancel Trade
            </Button>
          )}
          
          {["shipped", "received"].includes(escrow.status) && (
            <Button variant="destructive" size="sm">
              Report Issue
            </Button>
          )}
        </div>
      </div>
    );
  };

  return (
    <>
      <GlassCard variant="dark" className="overflow-hidden">
        {renderEscrowStatus()}
      </GlassCard>
      
      <EscrowModal
        isOpen={isEscrowModalOpen}
        onClose={() => setIsEscrowModalOpen(false)}
        escrow={escrow}
        isInitiator={isInitiator}
        onPayEscrow={onPayEscrow}
      />
      
      <EscrowModal
        isOpen={isReleaseModalOpen}
        onClose={() => setIsReleaseModalOpen(false)}
        escrow={escrow}
        isInitiator={isInitiator}
        onPayEscrow={onPayEscrow}
        onReleaseEscrow={onReleaseEscrow}
      />
    </>
  );
};

export default EscrowDetails;
