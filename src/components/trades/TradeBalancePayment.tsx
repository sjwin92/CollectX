
import React, { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { CreditCard, DollarSign, AlertTriangle } from "lucide-react";
import { formatCurrency } from "@/utils/escrowCalculator";
import { useToast } from "@/hooks/use-toast";

interface TradeBalancePaymentProps {
  paymentAmount: number;
  whoPays: "me" | "them";
  onPaymentComplete: (success: boolean) => void;
}

const TradeBalancePayment = ({ 
  paymentAmount, 
  whoPays, 
  onPaymentComplete 
}: TradeBalancePaymentProps) => {
  const [cardNumber, setCardNumber] = useState("");
  const [expiryDate, setExpiryDate] = useState("");
  const [cvv, setCvv] = useState("");
  const [cardholderName, setCardholderName] = useState("");
  const [isProcessing, setIsProcessing] = useState(false);
  const { toast } = useToast();

  const handlePayment = async () => {
    if (!cardNumber || !expiryDate || !cvv || !cardholderName) {
      toast({
        variant: "destructive",
        title: "Incomplete payment details",
        description: "Please fill in all payment fields."
      });
      return;
    }

    setIsProcessing(true);
    
    // Simulate payment processing
    setTimeout(() => {
      setIsProcessing(false);
      toast({
        title: "Payment successful",
        description: `${formatCurrency(paymentAmount)} has been processed successfully.`
      });
      onPaymentComplete(true);
    }, 2000);
  };

  if (whoPays === "them") {
    return (
      <Card className="border-orange-200 bg-orange-50">
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-orange-700">
            <DollarSign className="h-5 w-5" />
            Payment Required from Other Party
          </CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-sm text-orange-600">
            The other party needs to pay {formatCurrency(paymentAmount)} to balance this trade.
            They will be prompted to complete payment when they review the proposal.
          </p>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className="border-red-200 bg-red-50">
      <CardHeader>
        <CardTitle className="flex items-center gap-2 text-red-700">
          <AlertTriangle className="h-5 w-5" />
          Payment Required - {formatCurrency(paymentAmount)}
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <p className="text-sm text-red-600">
          Your offered items are worth less than what you're requesting. 
          Please provide payment details to cover the difference.
        </p>
        
        <div className="grid grid-cols-2 gap-4">
          <div className="col-span-2">
            <Label htmlFor="cardholderName">Cardholder Name</Label>
            <Input
              id="cardholderName"
              placeholder="John Doe"
              value={cardholderName}
              onChange={(e) => setCardholderName(e.target.value)}
            />
          </div>
          
          <div className="col-span-2">
            <Label htmlFor="cardNumber">Card Number</Label>
            <Input
              id="cardNumber"
              placeholder="1234 5678 9012 3456"
              value={cardNumber}
              onChange={(e) => setCardNumber(e.target.value)}
              maxLength={19}
            />
          </div>
          
          <div>
            <Label htmlFor="expiryDate">Expiry Date</Label>
            <Input
              id="expiryDate"
              placeholder="MM/YY"
              value={expiryDate}
              onChange={(e) => setExpiryDate(e.target.value)}
              maxLength={5}
            />
          </div>
          
          <div>
            <Label htmlFor="cvv">CVV</Label>
            <Input
              id="cvv"
              placeholder="123"
              value={cvv}
              onChange={(e) => setCvv(e.target.value)}
              maxLength={4}
            />
          </div>
        </div>
        
        <Button 
          onClick={handlePayment} 
          disabled={isProcessing}
          className="w-full"
        >
          <CreditCard className="h-4 w-4 mr-2" />
          {isProcessing ? "Processing..." : `Pay ${formatCurrency(paymentAmount)}`}
        </Button>
      </CardContent>
    </Card>
  );
};

export default TradeBalancePayment;
