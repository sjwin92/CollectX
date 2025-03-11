
import React, { useState } from "react";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { PokemonCard, getReliableImageUrl } from "@/services/pokemonTcgApi";
import PokemonCardSearch from "@/components/pokemon/PokemonCardSearch";
import { findWorkingImageUrl } from "@/services/cardImageService";
import { X } from "lucide-react";
import { useToast } from "@/hooks/use-toast";

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
  const [imageLoaded, setImageLoaded] = useState(false);
  const [imageError, setImageError] = useState(false);
  const [cardImageUrl, setCardImageUrl] = useState<string>("");
  const { toast } = useToast();

  React.useEffect(() => {
    const loadCardImage = async () => {
      if (card) {
        try {
          const bestImageUrl = await findWorkingImageUrl(card);
          setCardImageUrl(bestImageUrl);
          setImageError(false);
        } catch (error) {
          console.error("Error loading card image:", error);
          setImageError(true);
        }
      }
    };
    
    loadCardImage();
  }, [card]);

  const handleSubmit = () => {
    if (!card) {
      toast({
        title: "Error",
        description: "Please select a card to offer",
        variant: "destructive"
      });
      return;
    }
    
    // Split the cards wanted by commas and trim whitespace
    const cardsWantedArray = cardsWanted
      .split(",")
      .map(c => c.trim())
      .filter(c => c.length > 0);

    if (cardsWantedArray.length === 0) {
      toast({
        title: "Error",
        description: "Please specify at least one card you want in exchange",
        variant: "destructive"
      });
      return;
    }
    
    toast({
      title: "Creating listing",
      description: "Your trade listing is being created...",
    });
    
    onCreateListing(card, cardsWantedArray, description);
  };

  const handleCardSelect = (selectedCard: PokemonCard) => {
    console.log("Card selected:", selectedCard);
    setCard(selectedCard);
    setStep("details");
    setImageLoaded(false);
    setImageError(false);
    toast({
      title: "Card Selected",
      description: `${selectedCard.name} has been selected for your trade listing.`,
    });
  };

  const handleReset = () => {
    setCard(null);
    setStep("select-card");
    setImageLoaded(false);
    setImageError(false);
  };

  const getFallbackImage = () => {
    return "https://archives.bulbagarden.net/media/upload/1/17/Cardback.jpg";
  };

  const getCardPrice = (card: PokemonCard) => {
    if (!card.tcgplayer?.prices) {
      return "Not available";
    }
    
    // Check different price types in order of preference
    if (card.tcgplayer.prices.holofoil?.market) {
      return `$${card.tcgplayer.prices.holofoil.market.toFixed(2)}`;
    }
    
    if (card.tcgplayer.prices.normal?.market) {
      return `$${card.tcgplayer.prices.normal.market.toFixed(2)}`;
    }
    
    if (card.tcgplayer.prices.reverseHolofoil?.market) {
      return `$${card.tcgplayer.prices.reverseHolofoil.market.toFixed(2)}`;
    }
    
    // If no market price is available, return "Not available"
    return "Not available";
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
                <div className="w-1/3 relative">
                  {!imageLoaded && !imageError && (
                    <div className="absolute inset-0 flex items-center justify-center bg-muted rounded-md">
                      <div className="h-8 w-8 animate-spin rounded-full border-4 border-primary border-t-transparent"></div>
                    </div>
                  )}
                  <img 
                    src={cardImageUrl || (card.images?.large || card.images?.small || "")}
                    alt={card.name}
                    className={`w-full rounded-md ${!imageLoaded && 'opacity-0'} ${imageError && 'hidden'}`}
                    onLoad={() => setImageLoaded(true)}
                    onError={(e) => {
                      setImageError(true);
                      const target = e.target as HTMLImageElement;
                      target.src = getFallbackImage();
                      target.className = "w-full rounded-md";
                      setImageLoaded(true);
                    }}
                  />
                  {imageError && (
                    <div className="w-full aspect-[2/3] bg-muted rounded-md flex items-center justify-center">
                      <p className="text-sm text-muted-foreground px-2 text-center">
                        {card.name}
                        <br />
                        (Image unavailable)
                      </p>
                    </div>
                  )}
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
                    Estimated Value: {getCardPrice(card)}
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
