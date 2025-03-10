
import React, { useState } from "react";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { CardItemProps } from "@/components/cards/CardItem";
import PokemonCardSearch from "@/components/pokemon/PokemonCardSearch";
import { PokemonCard } from "@/services/pokemonTcgApi";
import { ArrowRightLeft, Plus } from "lucide-react";

interface TradeProposalFormProps {
  isOpen: boolean;
  onClose: () => void;
  targetCard: CardItemProps;
  onSubmitProposal: (message: string, offeredCards: PokemonCard[]) => void;
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

  const handleCardSelect = (card: PokemonCard) => {
    setSelectedCards(prev => [...prev, card]);
    setIsSearching(false);
  };

  const handleRemoveCard = (index: number) => {
    setSelectedCards(prev => prev.filter((_, i) => i !== index));
  };

  const handleSubmit = () => {
    onSubmitProposal(message, selectedCards);
    onClose();
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Propose a Trade</DialogTitle>
          <DialogDescription>
            Offer your cards in exchange for {targetCard.name}
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-6 py-4">
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
          <Button onClick={handleSubmit} disabled={selectedCards.length === 0}>
            <ArrowRightLeft className="h-4 w-4 mr-2" />
            Send Trade Proposal
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};

export default TradeProposalForm;
