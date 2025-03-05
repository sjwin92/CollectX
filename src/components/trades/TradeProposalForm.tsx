
import React, { useState } from "react";
import { Button } from "@/components/ui/button";
import GlassCard from "@/components/ui/custom/GlassCard";
import Badge from "@/components/ui/custom/Badge";
import { TradeCard } from "@/models/escrow";
import { ArrowLeftRight, Plus, X, DollarSign, Check, AlertCircle } from "lucide-react";
import { formatCurrency } from "@/utils/escrowCalculator";
import { useToast } from "@/hooks/use-toast";

interface TradeProposalFormProps {
  myCards: TradeCard[];
  theirCards: TradeCard[];
  onSubmit: (mySelectedCards: TradeCard[], theirSelectedCards: TradeCard[]) => void;
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
  const { toast } = useToast();
  
  const handleAddMyCard = (card: TradeCard) => {
    setMySelectedCards([...mySelectedCards, card]);
  };
  
  const handleRemoveMyCard = (cardId: string) => {
    setMySelectedCards(mySelectedCards.filter(card => card.id !== cardId));
  };
  
  const handleAddTheirCard = (card: TradeCard) => {
    setTheirSelectedCards([...theirSelectedCards, card]);
  };
  
  const handleRemoveTheirCard = (cardId: string) => {
    setTheirSelectedCards(theirSelectedCards.filter(card => card.id !== cardId));
  };
  
  const calculateTotalValue = (cards: TradeCard[]): number => {
    return cards.reduce((sum, card) => sum + card.estimatedValue, 0);
  };
  
  const myTotalValue = calculateTotalValue(mySelectedCards);
  const theirTotalValue = calculateTotalValue(theirSelectedCards);
  const valueDifference = Math.abs(myTotalValue - theirTotalValue);
  const isBalanced = valueDifference <= myTotalValue * 0.1; // Within 10% is considered balanced
  
  const handleSubmitProposal = () => {
    if (mySelectedCards.length === 0 || theirSelectedCards.length === 0) {
      toast({
        title: "Incomplete proposal",
        description: "Both sides must include at least one card",
        variant: "destructive"
      });
      return;
    }
    
    if (!isBalanced) {
      toast({
        title: "Value imbalance",
        description: "The trade values are significantly different. Consider adjusting your offer.",
        variant: "destructive"
      });
      return;
    }
    
    onSubmit(mySelectedCards, theirSelectedCards);
  };
  
  return (
    <div className="space-y-6">
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
                          {card.condition} · {formatCurrency(card.estimatedValue, card.currency)}
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
                    {formatCurrency(myTotalValue, "USD")}
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
                .map(card => (
                  <div 
                    key={card.id} 
                    className="flex items-center justify-between p-2 rounded-md hover:bg-secondary/30 cursor-pointer transition-colors"
                    onClick={() => handleAddMyCard(card)}
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
                        {formatCurrency(card.estimatedValue, card.currency)}
                      </span>
                      <Plus className="h-4 w-4" />
                    </div>
                  </div>
                ))}
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
                          {card.condition} · {formatCurrency(card.estimatedValue, card.currency)}
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
                    {formatCurrency(theirTotalValue, "USD")}
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
                .map(card => (
                  <div 
                    key={card.id} 
                    className="flex items-center justify-between p-2 rounded-md hover:bg-secondary/30 cursor-pointer transition-colors"
                    onClick={() => handleAddTheirCard(card)}
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
                        {formatCurrency(card.estimatedValue, card.currency)}
                      </span>
                      <Plus className="h-4 w-4" />
                    </div>
                  </div>
                ))}
            </div>
          </div>
        </div>
      </div>
      
      {/* Trade summary */}
      <GlassCard variant="dark" className="p-4">
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-lg font-medium">Trade Summary</h3>
          <div className={`flex items-center gap-2 ${isBalanced ? 'text-green-500' : 'text-yellow-500'}`}>
            {isBalanced ? (
              <>
                <Check className="h-5 w-5" />
                <span className="text-sm font-medium">Fair Trade</span>
              </>
            ) : (
              <>
                <AlertCircle className="h-5 w-5" />
                <span className="text-sm font-medium">Value Imbalance</span>
              </>
            )}
          </div>
        </div>
        
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-4">
          <div className="text-center">
            <div className="text-sm text-muted-foreground mb-1">You're Offering</div>
            <div className="text-xl font-medium">{formatCurrency(myTotalValue, "USD")}</div>
            <div className="text-xs text-muted-foreground">{mySelectedCards.length} card(s)</div>
          </div>
          
          <div className="flex items-center justify-center">
            <ArrowLeftRight className="h-6 w-6 text-muted-foreground" />
          </div>
          
          <div className="text-center">
            <div className="text-sm text-muted-foreground mb-1">You're Receiving</div>
            <div className="text-xl font-medium">{formatCurrency(theirTotalValue, "USD")}</div>
            <div className="text-xs text-muted-foreground">{theirSelectedCards.length} card(s)</div>
          </div>
        </div>
        
        {valueDifference > 0 && (
          <div className={`text-center mb-4 p-2 rounded ${isBalanced ? 'bg-green-500/10' : 'bg-yellow-500/10'}`}>
            <DollarSign className={`h-4 w-4 inline-block mr-1 ${isBalanced ? 'text-green-500' : 'text-yellow-500'}`} />
            <span className="text-sm">
              {isBalanced 
                ? `Value difference of ${formatCurrency(valueDifference, "USD")} is acceptable`
                : `Value difference of ${formatCurrency(valueDifference, "USD")} may be unbalanced`}
            </span>
          </div>
        )}
        
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
      </GlassCard>
    </div>
  );
};

export default TradeProposalForm;
