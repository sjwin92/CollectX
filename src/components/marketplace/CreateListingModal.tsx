import React, { useState } from "react";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useToast } from "@/hooks/use-toast";
import { useUser } from "@/hooks/useUser";
import { createMarketplaceListing } from "@/services/supabaseMarketplaceService";
import { ExtendedCardItemWithDB, getTradableCards } from "@/services/supabaseCollectionService";
import { useQuery } from "@tanstack/react-query";
import { SmartImage } from "@/components/common/SmartImage";

interface CreateListingModalProps {
  isOpen: boolean;
  onClose: () => void;
  selectedCard: ExtendedCardItemWithDB | null;
  onListingCreated?: () => void;
}

const CreateListingModal = ({ 
  isOpen, 
  onClose, 
  selectedCard,
  onListingCreated
}: CreateListingModalProps) => {
  const [internalSelectedCard, setInternalSelectedCard] = useState<ExtendedCardItemWithDB | null>(selectedCard);
  const [tradePreferences, setTradePreferences] = useState<string>("");
  const [description, setDescription] = useState<string>("");
  const [expiresAt, setExpiresAt] = useState<string>("");
  const [isLoading, setIsLoading] = useState(false);
  const { toast } = useToast();
  const { user } = useUser();

  // Get user's collection for card selection
  const { data: userCards = [], isLoading: isLoadingCards } = useQuery({
    queryKey: ['user-tradable-cards'],
    queryFn: getTradableCards,
    enabled: !!user && !selectedCard
  });

  const currentCard = internalSelectedCard || selectedCard;

  const handleSubmit = async () => {
    if (!user) {
      toast({
        title: "Authentication required",
        description: "Please sign in to create listings",
        variant: "destructive"
      });
      return;
    }

    if (!currentCard) {
      toast({
        title: "Error",
        description: "No card selected",
        variant: "destructive"
      });
      return;
    }

    if (!tradePreferences) {
      toast({
        title: "Error",
        description: "Please specify what you're looking for in trade",
        variant: "destructive"
      });
      return;
    }

    setIsLoading(true);

    try {
      await createMarketplaceListing(currentCard, {
        listing_type: 'trade',
        trade_preferences: tradePreferences,
        description,
        expires_at: expiresAt || undefined
      });

      toast({
        title: "Listing created",
        description: "Your card has been listed in the marketplace",
      });

      // Reset form
      setTradePreferences("");
      setDescription("");
      setExpiresAt("");

      onListingCreated?.();
      onClose();
    } catch (error) {
      console.error('Error creating listing:', error);
      toast({
        title: "Error",
        description: "Failed to create listing. Please try again.",
        variant: "destructive"
      });
    } finally {
      setIsLoading(false);
    }
  };

  const handleClose = () => {
    if (!isLoading) {
      onClose();
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={handleClose}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Create Marketplace Listing</DialogTitle>
          <DialogDescription>
            List your card for trade or sale in the marketplace
          </DialogDescription>
        </DialogHeader>

        {!currentCard ? (
          <div className="space-y-4 py-4">
            <h3 className="text-lg font-medium">Select a card from your collection</h3>
            {isLoadingCards ? (
              <div className="flex justify-center py-8">
                <div className="h-8 w-8 animate-spin rounded-full border-4 border-primary border-t-transparent"></div>
              </div>
            ) : userCards.length === 0 ? (
              <div className="text-center py-8">
                <p className="text-muted-foreground">No cards available for listing.</p>
                <p className="text-sm text-muted-foreground mt-2">
                  Add cards to your collection and mark them as "for trade" to list them.
                </p>
              </div>
            ) : (
              <div className="grid grid-cols-2 md:grid-cols-3 gap-4 max-h-96 overflow-y-auto">
                {userCards.map((card) => (
                  <div
                    key={card.dbId}
                    className="cursor-pointer p-2 border rounded-lg hover:border-primary transition-colors"
                    onClick={() => setInternalSelectedCard(card)}
                  >
                    <div className="aspect-[2/3] relative mb-2">
                      <SmartImage
                        src={card.imageUrl}
                        alt={card.name}
                        className="w-full h-full object-cover rounded"
                        onError={(e) => {
                          const target = e.target as HTMLImageElement;
                          target.src = "/placeholder.svg";
                        }}
                      />
                    </div>
                    <h4 className="text-sm font-medium truncate">{card.name}</h4>
                    <p className="text-xs text-muted-foreground truncate">
                      {card.set?.name}
                    </p>
                  </div>
                ))}
              </div>
            )}
          </div>
        ) : (
          <div className="space-y-6 py-4">
            {/* Card Preview */}
            <div className="flex gap-4 items-start p-4 bg-muted rounded-lg">
              <div className="w-20 h-28 relative">
                <SmartImage
                  src={currentCard.imageUrl}
                  alt={currentCard.name}
                  className="w-full h-full object-cover rounded-md"
                  onError={(e) => {
                    const target = e.target as HTMLImageElement;
                    target.src = "/placeholder.svg";
                  }}
                />
              </div>
              <div className="flex-1 space-y-1">
                <div className="flex justify-between items-start">
                  <h3 className="font-semibold">{currentCard.name}</h3>
                  {!selectedCard && (
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => setInternalSelectedCard(null)}
                    >
                      Change
                    </Button>
                  )}
                </div>
                <p className="text-sm text-muted-foreground">
                  {currentCard.set?.name} • {currentCard.rarity}
                </p>
                <p className="text-sm">
                  Condition: {currentCard.condition} • Qty: {currentCard.quantity}
                </p>
                {currentCard.graded && (
                  <p className="text-sm">
                    {currentCard.gradingCompany} {currentCard.gradeScore}
                  </p>
                )}
              </div>
            </div>

            {/* Listing Details Form */}
            <div className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="tradePreferences">Trade Preferences</Label>
                <Textarea
                  id="tradePreferences"
                  placeholder="What cards are you looking for? (e.g., Charizard cards, specific sets, etc.)"
                  value={tradePreferences}
                  onChange={(e) => setTradePreferences(e.target.value)}
                />
              </div>


              <div className="space-y-2">
                <Label htmlFor="description">Additional Description</Label>
                <Textarea
                  id="description"
                  placeholder="Any additional details about the card or trade preferences"
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="expiresAt">Expires At (optional)</Label>
                <Input
                  id="expiresAt"
                  type="datetime-local"
                  value={expiresAt}
                  onChange={(e) => setExpiresAt(e.target.value)}
                />
              </div>
            </div>
          </div>
        )}

        <DialogFooter>
          <Button variant="outline" onClick={handleClose} disabled={isLoading}>
            Cancel
          </Button>
          <Button onClick={handleSubmit} disabled={!currentCard || isLoading}>
            {isLoading ? "Creating..." : "Create Listing"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};

export default CreateListingModal;