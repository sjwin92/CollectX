
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
import TradeCardSuggestions from "@/components/trades/TradeCardSuggestions";
import CollectionBoxSelector from "@/components/collection/CollectionBoxSelector";

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
  const [selectedBoxId, setSelectedBoxId] = useState<string>("");
  
  // User's collection from actual data (empty for fresh spawn)
  const userCollection: PokemonCard[] = [];

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
    id: targetCard.number || "target",
    name: targetCard.name,
    imageUrl: targetCard.imageUrl,
    condition: targetCard.condition,
    estimatedValue: parseFloat(targetCard.estimatedValue.replace('$', '')) || 0,
    currency: "USD"
  };

  const myTradeCards = convertToTradeCards(selectedCards);
  
  // Calculate total values for display only (no payment logic at proposal stage)
  const myTotalValue = myTradeCards.reduce((sum, card) => sum + card.estimatedValue, 0);
  const targetValue = targetTradeCard.estimatedValue;

  const handleCardSelect = (card: PokemonCard) => {
    setSelectedCards(prev => [...prev, card]);
    setIsSearching(false);
  };

  const handleRemoveCard = (index: number) => {
    setSelectedCards(prev => prev.filter((_, i) => i !== index));
  };

  const handleSubmit = () => {
    // No payment logic at proposal stage - that happens during escrow/negotiation
    onSubmitProposal(message, selectedCards);
    onClose();
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
                <div className="text-lg font-semibold">{formatCurrency(myTotalValue, "USD")}</div>
                <div className="text-xs text-muted-foreground">{selectedCards.length} card(s)</div>
              </div>
              
              <div className="flex items-center justify-center">
                <ArrowRightLeft className="h-5 w-5 text-muted-foreground" />
              </div>
              
              <div>
                <div className="text-sm text-muted-foreground">You're Getting</div>
                <div className="text-lg font-semibold">{formatCurrency(targetValue, "USD")}</div>
                <div className="text-xs text-muted-foreground">1 card</div>
              </div>
            </div>
            
            <div className="mt-3 p-2 rounded bg-blue-500/10 border border-blue-500/20">
              <div className="flex items-center justify-center gap-2 text-blue-600">
                <span className="text-sm font-medium">
                  Initial proposal - final value balance will be calculated during negotiation
                </span>
              </div>
            </div>
          </div>

          <div className="flex flex-col sm:flex-row gap-4 items-start">
            <div className="sm:w-1/4 w-1/2 mx-auto sm:mx-0">
              <img 
                src={targetCard.imageUrl} 
                alt={targetCard.name}
                className="w-full rounded-md"
                onError={(e) => {
                  console.log("Target card image failed to load");
                  (e.target as HTMLImageElement).style.display = "none";
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
                </div>

                {/* Collection Box Selector */}
                <div className="mb-4">
                  <CollectionBoxSelector
                    onSelectBox={setSelectedBoxId}
                    selectedBoxId={selectedBoxId}
                  />
                </div>

                {/* Cards from Selected Box */}
                {selectedBoxId && (
                  <div className="mb-4 p-4 border rounded-lg bg-muted/30">
                    <h4 className="text-sm font-medium mb-3">Cards in this box:</h4>
                    <div className="grid grid-cols-3 sm:grid-cols-4 gap-2 max-h-48 overflow-y-auto">
                      {userCollection.length === 0 ? (
                        <div className="col-span-full text-center py-8 text-muted-foreground">
                          <p className="text-sm">No cards in your collection yet</p>
                          <p className="text-xs mt-1">Add cards to start trading</p>
                        </div>
                      ) : userCollection.map((card, index) => (
                        <div
                          key={`${card.id}-${index}`}
                          className="cursor-pointer p-2 rounded border hover:border-primary/50 transition-colors"
                          onClick={() => handleCardSelect(card)}
                        >
                          <img
                            src={card.images.small}
                            alt={card.name}
                            className="w-full aspect-[3/4] object-cover rounded"
                          onError={(e) => {
                            console.log("Selected card image failed to load");
                            (e.target as HTMLImageElement).style.display = "none";
                          }}
                          />
                          <p className="text-xs mt-1 truncate">{card.name}</p>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {selectedCards.length > 0 ? (
                  <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
                    {selectedCards.map((card, index) => (
                      <div key={index} className="relative group">
                        <img 
                          src={card.images.small} 
                          alt={card.name}
                          className="w-full rounded-md"
                            onError={(e) => {
                              console.log("Collection card image failed to load");
                              (e.target as HTMLImageElement).style.display = "none";
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

          {/* Smart Trade Suggestions */}
          <TradeCardSuggestions 
            targetCard={targetCard}
            userCollection={userCollection}
            onSelectCard={handleCardSelect}
          />

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
            disabled={selectedCards.length === 0}
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
