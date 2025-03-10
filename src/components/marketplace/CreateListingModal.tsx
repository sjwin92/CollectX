
import React, { useState } from "react";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { PokemonCard } from "@/services/pokemonTcgApi";
import PokemonCardSearch from "@/components/pokemon/PokemonCardSearch";
import { X } from "lucide-react";

interface CreateListingModalProps {
  isOpen: boolean;
  onClose: () => void;
  selectedCard: PokemonCard | null;
  onCreateListing: (cardOffered: PokemonCard, cardsWanted: string[], description: string) => void;
}

const CreateListingModal = ({ 
  isOpen, 
  onClose, 
  selectedCard, 
  onCreateListing 
}: CreateListingModalProps) => {
  const [card, setCard] = useState<PokemonCard | null>(selectedCard);
  const [cardsWanted, setCardsWanted] = useState<string>("");
  const [description, setDescription] = useState<string>("");
  const [step, setStep] = useState<"select-card" | "details">(selectedCard ? "details" : "select-card");

  const handleSubmit = () => {
    if (!card) return;
    
    // Split the cards wanted by commas and trim whitespace
    const cardsWantedArray = cardsWanted
      .split(",")
      .map(c => c.trim())
      .filter(c => c.length > 0);
    
    onCreateListing(card, cardsWantedArray, description);
  };

  const handleCardSelect = (selectedCard: PokemonCard) => {
    setCard(selectedCard);
    setStep("details");
  };

  const handleReset = () => {
    setCard(null);
    setStep("select-card");
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Create Trade Listing</DialogTitle>
          <DialogDescription>
            Select a card from your collection to offer for trade and specify what you're looking for.
          </DialogDescription>
        </DialogHeader>

        {step === "select-card" ? (
          <div className="space-y-4 py-4">
            <h3 className="text-lg font-medium">Select a card to trade</h3>
            <PokemonCardSearch onSelect={handleCardSelect} />
          </div>
        ) : (
          <div className="space-y-6 py-4">
            {card && (
              <div className="flex gap-4 items-start">
                <div className="w-1/3">
                  <img 
                    src={card.images.small} 
                    alt={card.name}
                    className="w-full rounded-md"
                    onError={(e) => {
                      (e.target as HTMLImageElement).src = "/placeholder.svg";
                    }}
                  />
                </div>
                <div className="w-2/3 space-y-2">
                  <div className="flex justify-between items-start">
                    <h3 className="text-lg font-semibold">{card.name}</h3>
                    <Button size="icon" variant="ghost" onClick={handleReset} className="h-8 w-8">
                      <X className="h-4 w-4" />
                    </Button>
                  </div>
                  <p className="text-sm text-muted-foreground">
                    {card.set.name} • {card.rarity || "Unknown rarity"}
                  </p>
                  <p className="text-sm">
                    Estimated Value: {
                      card.tcgplayer?.prices?.holofoil?.market
                        ? `$${card.tcgplayer.prices.holofoil.market.toFixed(2)}`
                        : card.tcgplayer?.prices?.normal?.market
                        ? `$${card.tcgplayer.prices.normal.market.toFixed(2)}`
                        : "Not available"
                    }
                  </p>
                </div>
              </div>
            )}

            <div className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="cardsWanted">Cards You Want (comma separated)</Label>
                <Input
                  id="cardsWanted"
                  placeholder="Charizard, Pikachu V, Mewtwo GX"
                  value={cardsWanted}
                  onChange={(e) => setCardsWanted(e.target.value)}
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="description">Description (condition, preferences, etc.)</Label>
                <Textarea
                  id="description"
                  placeholder="Describe your card's condition and what you're looking for in a trade"
                  className="min-h-24"
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                />
              </div>
            </div>
          </div>
        )}

        <DialogFooter>
          <Button variant="outline" onClick={onClose}>Cancel</Button>
          {step === "details" && (
            <Button onClick={handleSubmit} disabled={!card || cardsWanted.trim().length === 0}>
              Create Listing
            </Button>
          )}
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};

export default CreateListingModal;
