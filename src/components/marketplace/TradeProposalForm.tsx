
import React, { useState, useEffect } from "react";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { CardItemProps } from "@/components/cards/CardItem";
import PokemonCardSearch from "@/components/pokemon/PokemonCardSearch";
import { PokemonCard } from "@/services/pokemonTcgApi";
import { ArrowRightLeft, Plus, Calculator, DollarSign } from "lucide-react";
import { formatCurrency } from "@/utils/escrowCalculator";
import { estimateCardValue, calculateTradeBalance } from "@/services/valueEstimationService";
import { TradeCard } from "@/models/escrow";
import TradeBalancePayment from "@/components/trades/TradeBalancePayment";

interface TradeProposalFormProps {
  isOpen: boolean;
  onClose: () => void;
  targetCard: CardItemProps;
  onSubmitProposal: (message: string, offeredCards: PokemonCard[], paymentCompleted?: boolean) => void;
}

const TradeProposalForm = ({
  isOpen,
  onClose,
  targetCard,
  onSubmitProposal
}: TradeProposalFormProps) => {
  const [message, setMessage] = useState("");
  const [selectedCards, setSelectedCards] = useState<PokemonCard[]>([]);
  const [isSearching, setIsSearching] = useState(false);
  const [paymentCompleted, setPaymentCompleted] = useState(false);

  // Convert cards to TradeCard format for value calculation
  const convertToTradeCards = (cards: PokemonCard[]): TradeCard[] => {
    return cards.map(card => ({
      id: card.id,
      name: card.name,
      imageUrl: card.images.small,
      condition: "Near Mint", // Default condition
      estimatedValue: estimateCardValue({
        id: card.id,
        name: card.name,
        imageUrl: card.images.small,
        condition: "Near Mint",
        estimatedValue: 0,
        currency: "USD"
      }),
      currency: "USD"
    }));
  };

  const targetTradeCard: TradeCard = {
    id: targetCard.cardNumber || "target",
    name: targetCard.name,
    imageUrl: targetCard.imageUrl,
    condition: targetCard.condition,
    estimatedValue: parseFloat(targetCard.estimatedValue.replace('$', '')) || 0,
    currency: "USD"
  };

  const myTradeCards = convertToTradeCards(selectedCards);
  const tradeBalance = calculateTradeBalance(myTradeCards, [targetTradeCard]);

  const handleCardSelect = (card: PokemonCard) => {
    setSelectedCards(prev => [...prev, card]);
    setIsSearching(false);
  };

  const handleRemoveCard = (index: number) => {
    setSelectedCards(prev => prev.filter((_, i) => i !== index));
  };

  const handleSubmit = () => {
    if (tradeBalance.needsPayment && tradeBalance.whoPays === "me" && !paymentCompleted) {
      return; // Payment required but not completed
    }
    
    onSubmitProposal(message, selectedCards, paymentCompleted);
    onClose();
  };

  const handlePaymentComplete = (success: boolean) => {
    setPaymentCompleted(success);
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Propose a Trade</DialogTitle>
          <DialogDescription>
            Offer your cards in exchange for {targetCard.name}
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-6 py-4">
          {/* Value Analysis Section */}
          <div className="bg-muted/30 p-4 rounded-lg">
            <div className="flex items-center gap-2 mb-3">
              <Calculator className="h-5 w-5" />
              <h3 className="font-medium">Trade Value Analysis</h3>
            </div>
            
            <div className="grid grid-cols-3 gap-4 text-center">
              <div>
                <div className="text-sm text-muted-foreground">You're Offering</div>
                <div className="text-lg font-semibold">{formatCurrency(tradeBalance.myValue, "USD")}</div>
                <div className="text-xs text-muted-foreground">{selectedCards.length} card(s)</div>
              </div>
              
              <div className="flex items-center justify-center">
                <ArrowRightLeft className="h-5 w-5 text-muted-foreground" />
              </div>
              
              <div>
                <div className="text-sm text-muted-foreground">You're Getting</div>
                <div className="text-lg font-semibold">{formatCurrency(tradeBalance.theirValue, "USD")}</div>
                <div className="text-xs text-muted-foreground">1 card</div>
              </div>
            </div>
            
            {tradeBalance.needsPayment && (
              <div className="mt-3 p-2 rounded bg-yellow-500/10 border border-yellow-500/20">
                <div className="flex items-center justify-center gap-2 text-yellow-600">
                  <DollarSign className="h-4 w-4" />
                  <span className="text-sm font-medium">
                    Balance required: {formatCurrency(tradeBalance.paymentAmount, "USD")}
                    {tradeBalance.whoPays === "me" ? " (you pay)" : " (they pay)"}
                  </span>
                </div>
              </div>
            )}
          </div>

          {/* Payment Section */}
          {tradeBalance.needsPayment && (
            <TradeBalancePayment
              paymentAmount={tradeBalance.paymentAmount}
              whoPays={tradeBalance.whoPays}
              onPaymentComplete={handlePaymentComplete}
            />
          )}

          <div className="flex flex-col sm:flex-row gap-4 items-start">
            <div className="sm:w-1/4 w-1/2 mx-auto sm:mx-0">
              <img 
                src={targetCard.imageUrl} 
                alt={targetCard.name}
                className="w-full rounded-md"
                onError={(e) => {
                  (e.target as HTMLImageElement).src = "/placeholder.svg";
                }}
              />
            </div>
            <div className="sm:w-3/4 space-y-4 w-full">
              <div>
                <h3 className="text-lg font-semibold">You want to trade for:</h3>
                <p className="text-muted-foreground">{targetCard.name} • {targetCard.rarity} • {targetCard.condition}</p>
                <p className="text-sm">Estimated Value: {targetCard.estimatedValue}</p>
              </div>

              <div>
                <div className="flex justify-between items-center mb-2">
                  <h3 className="text-lg font-semibold">Your offer:</h3>
                  <Button size="sm" variant="outline" onClick={() => setIsSearching(true)}>
                    <Plus className="h-4 w-4 mr-2" />
                    Add Card
                  </Button>
                </div>

                {selectedCards.length > 0 ? (
                  <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
                    {selectedCards.map((card, index) => (
                      <div key={index} className="relative group">
                        <img 
                          src={card.images.small} 
                          alt={card.name}
                          className="w-full rounded-md"
                          onError={(e) => {
                            (e.target as HTMLImageElement).src = "/placeholder.svg";
                          }}
                        />
                        <Button 
                          size="icon" 
                          variant="destructive" 
                          className="absolute top-1 right-1 h-6 w-6 opacity-0 group-hover:opacity-100 transition-opacity"
                          onClick={() => handleRemoveCard(index)}
                        >
                          <Plus className="h-3 w-3 rotate-45" />
                        </Button>
                        <div className="absolute bottom-1 left-1 bg-black/70 text-white text-xs px-1 rounded">
                          {formatCurrency(estimateCardValue({
                            id: card.id,
                            name: card.name,
                            imageUrl: card.images.small,
                            condition: "Near Mint",
                            estimatedValue: 0,
                            currency: "USD"
                          }), "USD")}
                        </div>
                      </div>
                    ))}
                  </div>
                ) : (
                  <div className="text-center p-4 border border-dashed rounded-md">
                    <p className="text-muted-foreground">Add cards to your trade offer</p>
                  </div>
                )}
              </div>

              <div className="space-y-2">
                <h3 className="text-sm font-medium">Message to trader:</h3>
                <Textarea
                  placeholder="Include any details about your offer, card conditions, or other notes for the trader..."
                  value={message}
                  onChange={(e) => setMessage(e.target.value)}
                  className="min-h-24"
                />
              </div>
            </div>
          </div>

          {isSearching && (
            <div className="border rounded-md p-4">
              <h3 className="text-lg font-medium mb-4">Select a card to offer</h3>
              <PokemonCardSearch onSelect={handleCardSelect} />
            </div>
          )}
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={onClose}>Cancel</Button>
          <Button 
            onClick={handleSubmit} 
            disabled={
              selectedCards.length === 0 || 
              (tradeBalance.needsPayment && tradeBalance.whoPays === "me" && !paymentCompleted)
            }
          >
            <ArrowRightLeft className="h-4 w-4 mr-2" />
            Send Trade Proposal
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};

export default TradeProposalForm;
