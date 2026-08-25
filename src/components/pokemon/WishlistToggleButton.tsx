import React, { useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import { Heart } from "lucide-react";
import { PokemonCard } from "@/services/api/pokemonTypes";
import { isOnWishlist, addToWishlist, removeFromWishlist } from "@/services/wishlistService";
import { useToast } from "@/hooks/use-toast";
import { useUser } from "@/hooks/useUser";

interface WishlistToggleButtonProps {
  card: PokemonCard;
}

const WishlistToggleButton = ({ card }: WishlistToggleButtonProps) => {
  const [onWishlist, setOnWishlist] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const { toast } = useToast();
  const { user } = useUser();

  useEffect(() => {
    if (!user) {
      setOnWishlist(false);
      return;
    }
    isOnWishlist(card.id).then(setOnWishlist);
  }, [card.id, user]);

  const handleToggle = async () => {
    if (!user) {
      toast({
        title: "Sign in required",
        description: "Sign in to add cards to your want list.",
        variant: "destructive",
      });
      return;
    }

    setIsLoading(true);
    try {
      if (onWishlist) {
        await removeFromWishlist(card.id);
        setOnWishlist(false);
        toast({ title: "Removed from want list" });
      } else {
        await addToWishlist(card);
        setOnWishlist(true);
        toast({ title: "Added to want list", description: "We'll notify you if someone lists this card." });
      }
    } catch (error) {
      toast({
        title: "Something went wrong",
        description: error instanceof Error ? error.message : "Please try again.",
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <Button
      className="w-full"
      variant={onWishlist ? "secondary" : "outline"}
      onClick={handleToggle}
      disabled={isLoading}
    >
      <Heart className={`mr-2 h-4 w-4 ${onWishlist ? "fill-current" : ""}`} />
      {onWishlist ? "On your want list" : "Add to want list"}
    </Button>
  );
};

export default WishlistToggleButton;
