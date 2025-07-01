import React, { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import GlassCard from "@/components/ui/custom/GlassCard";
import Badge from "@/components/ui/custom/Badge";
import { TradeCard } from "@/models/escrow";
import { ArrowLeftRight, Plus, X, DollarSign, Check, AlertCircle, Calculator } from "lucide-react";
import { formatCurrency } from "@/utils/escrowCalculator";
import { useToast } from "@/hooks/use-toast";
import { 
  estimateCardValue, 
  calculateTradeBalance, 
  calculateTradeValue 
} from "@/services/valueEstimationService";
import TradeBalancePayment from "./TradeBalancePayment";

interface TradeProposalFormProps {
  myCards: TradeCard[];
  theirCards: TradeCard[];
  onSubmit: (mySelectedCards: TradeCard[], theirSelectedCards: TradeCard[], paymentCompleted?: boolean) => void;
  onCancel: () => void;
}

const TradeProposalForm = ({
  myCards,
  theirCards,
  onSubmit,
  onCancel
}: TradeProposalFormProps) => {
  const [mySelectedCards, setMySelectedCards] = useState<TradeCard[]>([]);
  const [theirSelectedCards, setTheirSelectedCards] = useState<TradeCard[]>([]);
  const [paymentCompleted, setPaymentCompleted] = useState(false);
  const { toast } = useToast();
  
  // Update card values when cards are selected
  useEffect(() => {
    const updateCardValues = (cards: TradeCard[]) => {
      return cards.map(card => ({
        ...card,
        estimatedValue: card.estimatedValue || estimateCardValue(card)
      }));
    };

    setMySelectedCards(prev => updateCardValues(prev));
    setTheirSelectedCards(prev => updateCardValues(prev));
  }, []);
  
  const handleAddMyCard = (card: TradeCard) => {
    const cardWithValue = {
      ...card,
      estimatedValue: card.estimatedValue || estimateCardValue(card)
    };
    setMySelectedCards([...mySelectedCards, cardWithValue]);
  };
  
  const handleRemoveMyCard = (cardId: string) => {
    setMySelectedCards(mySelectedCards.filter(card => card.id !== cardId));
  };
  
  const handleAddTheirCard = (card: TradeCard) => {
    const cardWithValue = {
      ...card,
      estimatedValue: card.estimatedValue || estimateCardValue(card)
    };
    setTheirSelectedCards([...theirSelectedCards, cardWithValue]);
  };
  
  const handleRemoveTheirCard = (cardId: string) => {
    setTheirSelectedCards(theirSelectedCards.filter(card => card.id !== cardId));
  };
  
  const tradeBalance = calculateTradeBalance(mySelectedCards, theirSelectedCards);
  const isBalanced = !tradeBalance.needsPayment;
  
  const handleSubmitProposal = () => {
    if (mySelectedCards.length === 0 || theirSelectedCards.length === 0) {
      toast({
        title: "Incomplete proposal",
        description: "Both sides must include at least one card",
        variant: "destructive"
      });
      return;
    }
    
    if (tradeBalance.needsPayment && tradeBalance.whoPays === "me" && !paymentCompleted) {
      toast({
        title: "Payment required",
        description: "Please complete payment to cover the trade balance.",
        variant: "destructive"
      });
      return;
    }
    
    onSubmit(mySelectedCards, theirSelectedCards, paymentCompleted);
  };

  const handlePaymentComplete = (success: boolean) => {
    setPaymentCompleted(success);
    if (success) {
      toast({
        title: "Payment completed",
        description: "You can now submit your trade proposal."
      });
    }
  };
  
  return (
    <div className="space-y-6">
      {/* Value Summary Card */}
      <GlassCard variant="dark" className="p-4">
        <div className="flex items-center gap-2 mb-4">
          <Calculator className="h-5 w-5" />
          <h3 className="text-lg font-medium">Trade Value Analysis</h3>
        </div>
        
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-4">
          <div className="text-center">
            <div className="text-sm text-muted-foreground mb-1">Your Offering</div>
            <div className="text-xl font-medium">{formatCurrency(tradeBalance.myValue, "USD")}</div>
            <div className="text-xs text-muted-foreground">{mySelectedCards.length} item(s)</div>
          </div>
          
          <div className="flex items-center justify-center">
            <ArrowLeftRight className="h-6 w-6 text-muted-foreground" />
          </div>
          
          <div className="text-center">
            <div className="text-sm text-muted-foreground mb-1">You're Receiving</div>
            <div className="text-xl font-medium">{formatCurrency(tradeBalance.theirValue, "USD")}</div>
            <div className="text-xs text-muted-foreground">{theirSelectedCards.length} item(s)</div>
          </div>
        </div>
        
        <div className={`text-center p-3 rounded-md ${
          isBalanced 
            ? 'bg-green-500/10 border border-green-500/20' 
            : 'bg-yellow-500/10 border border-yellow-500/20'
        }`}>
          <div className={`flex items-center justify-center gap-2 ${
            isBalanced ? 'text-green-500' : 'text-yellow-500'
          }`}>
            {isBalanced ? (
              <>
                <Check className="h-5 w-5" />
                <span className="font-medium">Trade is balanced</span>
              </>
            ) : (
              <>
                <DollarSign className="h-5 w-5" />
                <span className="font-medium">
                  Balance required: {formatCurrency(tradeBalance.paymentAmount, "USD")}
                  {tradeBalance.whoPays === "me" ? " (you pay)" : " (they pay)"}
                </span>
              </>
            )}
          </div>
        </div>
      </GlassCard>

      {/* Payment Section */}
      {tradeBalance.needsPayment && (
        <TradeBalancePayment
          paymentAmount={tradeBalance.paymentAmount}
          whoPays={tradeBalance.whoPays}
          onPaymentComplete={handlePaymentComplete}
        />
      )}

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <div>
          <h3 className="text-lg font-medium mb-3">Your Offering</h3>
          
          {/* Selected cards */}
          {mySelectedCards.length > 0 && (
            <GlassCard className="mb-4">
              <div className="space-y-3">
                {mySelectedCards.map(card => (
                  <div key={card.id} className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <div className="relative h-12 w-12 rounded-md overflow-hidden">
                        <img 
                          src={card.imageUrl} 
                          alt={card.name} 
                          className="h-full w-full object-cover"
                        />
                      </div>
                      <div>
                        <div className="text-sm font-medium">{card.name}</div>
                        <div className="text-xs text-muted-foreground">
                          {card.condition} · {formatCurrency(card.estimatedValue || 0, "USD")}
                        </div>
                      </div>
                    </div>
                    <Button 
                      variant="ghost" 
                      size="icon" 
                      onClick={() => handleRemoveMyCard(card.id)}
                    >
                      <X className="h-4 w-4" />
                    </Button>
                  </div>
                ))}
                
                <div className="flex justify-between pt-2 border-t border-border">
                  <span className="text-sm font-medium">Total Value:</span>
                  <span className="text-sm font-medium">
                    {formatCurrency(calculateTradeValue(mySelectedCards), "USD")}
                  </span>
                </div>
              </div>
            </GlassCard>
          )}
          
          {/* Available cards to offer */}
          <div className="space-y-2">
            <div className="text-sm text-muted-foreground mb-1">Select cards to offer:</div>
            <div className="h-[300px] overflow-y-auto pr-2 space-y-2">
              {myCards
                .filter(card => !mySelectedCards.some(selected => selected.id === card.id))
                .map(card => {
                  const estimatedValue = card.estimatedValue || estimateCardValue(card);
                  return (
                    <div 
                      key={card.id} 
                      className="flex items-center justify-between p-2 rounded-md hover:bg-secondary/30 cursor-pointer transition-colors"
                      onClick={() => handleAddMyCard({...card, estimatedValue})}
                    >
                      <div className="flex items-center gap-2">
                        <div className="h-10 w-10 rounded-md overflow-hidden">
                          <img 
                            src={card.imageUrl} 
                            alt={card.name} 
                            className="h-full w-full object-cover" 
                          />
                        </div>
                        <div>
                          <div className="text-sm">{card.name}</div>
                          <div className="text-xs text-muted-foreground">
                            {card.condition}
                          </div>
                        </div>
                      </div>
                      <div className="flex items-center gap-2">
                        <span className="text-xs font-medium">
                          {formatCurrency(estimatedValue, "USD")}
                        </span>
                        <Plus className="h-4 w-4" />
                      </div>
                    </div>
                  );
                })}
            </div>
          </div>
        </div>
        
        <div>
          <h3 className="text-lg font-medium mb-3">You're Requesting</h3>
          
          {/* Selected cards */}
          {theirSelectedCards.length > 0 && (
            <GlassCard className="mb-4">
              <div className="space-y-3">
                {theirSelectedCards.map(card => (
                  <div key={card.id} className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <div className="relative h-12 w-12 rounded-md overflow-hidden">
                        <img 
                          src={card.imageUrl} 
                          alt={card.name} 
                          className="h-full w-full object-cover"
                        />
                      </div>
                      <div>
                        <div className="text-sm font-medium">{card.name}</div>
                        <div className="text-xs text-muted-foreground">
                          {card.condition} · {formatCurrency(card.estimatedValue || 0, "USD")}
                        </div>
                      </div>
                    </div>
                    <Button 
                      variant="ghost" 
                      size="icon" 
                      onClick={() => handleRemoveTheirCard(card.id)}
                    >
                      <X className="h-4 w-4" />
                    </Button>
                  </div>
                ))}
                
                <div className="flex justify-between pt-2 border-t border-border">
                  <span className="text-sm font-medium">Total Value:</span>
                  <span className="text-sm font-medium">
                    {formatCurrency(calculateTradeValue(theirSelectedCards), "USD")}
                  </span>
                </div>
              </div>
            </GlassCard>
          )}
          
          {/* Available cards to request */}
          <div className="space-y-2">
            <div className="text-sm text-muted-foreground mb-1">Select cards to request:</div>
            <div className="h-[300px] overflow-y-auto pr-2 space-y-2">
              {theirCards
                .filter(card => !theirSelectedCards.some(selected => selected.id === card.id))
                .map(card => {
                  const estimatedValue = card.estimatedValue || estimateCardValue(card);
                  return (
                    <div 
                      key={card.id} 
                      className="flex items-center justify-between p-2 rounded-md hover:bg-secondary/30 cursor-pointer transition-colors"
                      onClick={() => handleAddTheirCard({...card, estimatedValue})}
                    >
                      <div className="flex items-center gap-2">
                        <div className="h-10 w-10 rounded-md overflow-hidden">
                          <img 
                            src={card.imageUrl} 
                            alt={card.name} 
                            className="h-full w-full object-cover" 
                          />
                        </div>
                        <div>
                          <div className="text-sm">{card.name}</div>
                          <div className="text-xs text-muted-foreground">
                            {card.condition}
                          </div>
                        </div>
                      </div>
                      <div className="flex items-center gap-2">
                        <span className="text-xs font-medium">
                          {formatCurrency(estimatedValue, "USD")}
                        </span>
                        <Plus className="h-4 w-4" />
                      </div>
                    </div>
                  );
                })}
            </div>
          </div>
        </div>
      </div>
      
      <div className="flex justify-end gap-2">
        <Button variant="outline" onClick={onCancel}>
          Cancel
        </Button>
        <Button 
          onClick={handleSubmitProposal}
          disabled={mySelectedCards.length === 0 || theirSelectedCards.length === 0}
        >
          Submit Trade Proposal
        </Button>
      </div>
    </div>
  );
};

export default TradeProposalForm;
