
import React, { useState, useEffect } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { PlusCircle, ArrowRightLeft, AlertTriangle, Loader2 } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { useUser } from "@/hooks/useUser";
import AddToCollectionModal from "./AddToCollectionModal";

interface PokemonCard {
  id: string;
  name: string;
  number: string;
  rarity?: string;
  images: {
    small?: string;
    large?: string;
  };
  types?: string[];
}

interface PokemonCardItemProps {
  card: PokemonCard;
  onClick?: (card: PokemonCard) => void;
}

const PokemonCardItem = ({ card, onClick }: PokemonCardItemProps) => {
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [imageSrc, setImageSrc] = useState<string>("");
  const [imageStatus, setImageStatus] = useState<"loading" | "loaded" | "error">("loading");
  const { isSignedIn } = useUser();
  const { toast } = useToast();
  
  // Create Pokemon TCG URL directly - this uses the reliable format
  useEffect(() => {
    if (!card?.id) return;
    
    setImageStatus("loading");
    
    // Parse card ID into set code and number
    const parts = card.id.split("-");
    if (parts.length >= 2) {
      const setCode = parts[0];
      const cardNumber = parts[1];
      
      // Use the Pokemon TCG format that has better reliability
      const tcgUrl = `https://images.pokemontcg.io/${setCode}/${cardNumber}_hires.png`;
      console.log(`Setting Pokemon TCG URL for ${card.name}: ${tcgUrl}`);
      setImageSrc(tcgUrl);
    } else {
      // Fallback to original image if we can't parse the ID
      setImageSrc(card.images?.small || card.images?.large || "");
    }
  }, [card?.id]);
  
  const handleAddToCollection = (e: React.MouseEvent) => {
    e.stopPropagation();
    
    if (!isSignedIn) {
      toast({
        title: "Authentication required",
        description: "Please sign in to add cards to your collection",
        variant: "destructive"
      });
      return;
    }
    
    setIsModalOpen(true);
  };
  
  const handleClick = () => {
    if (onClick) {
      onClick(card);
    }
  };
  
  const handleImageLoad = () => {
    setImageStatus("loaded");
  };
  
  const handleImageError = () => {
    console.log(`Image failed to load: ${imageSrc} for card ${card?.id}`);
    
    // If Pokemon TCG URL fails, try TCGDex format
    if (card?.id && !imageSrc.includes('tcgdex.net')) {
      const parts = card.id.split("-");
      if (parts.length >= 2) {
        const setCode = parts[0];
        const cardNumber = parts[1];
        const tcgdexUrl = `https://assets.tcgdex.net/en/${setCode}/${cardNumber}`;
        console.log(`Trying TCGDex URL as backup: ${tcgdexUrl}`);
        setImageSrc(tcgdexUrl);
        return;
      }
    }
    
    // If TCGDex URL fails, try the original images
    if (card.images?.small && imageSrc !== card.images.small) {
      setImageSrc(card.images.small);
    } else if (card.images?.large && imageSrc !== card.images.large) {
      setImageSrc(card.images.large);
    } else {
      setImageStatus("error");
    }
  };
  
  return (
    <>
      <Card 
        className="overflow-hidden group cursor-pointer transition-all hover:shadow-md"
        onClick={handleClick}
      >
        <div className="relative aspect-[2/3] overflow-hidden">
          {imageSrc && imageStatus !== "error" && (
            <img 
              src={imageSrc}
              alt={card.name}
              className="w-full h-full object-contain transition-transform duration-300 group-hover:scale-105"
              loading="lazy"
              onLoad={handleImageLoad}
              onError={handleImageError}
            />
          )}
          
          {imageStatus === "loading" && (
            <div className="absolute inset-0 flex items-center justify-center bg-background/70">
              <Loader2 className="h-5 w-5 animate-spin text-primary" />
            </div>
          )}
          
          {imageStatus === "error" && (
            <div className="absolute inset-0 flex flex-col items-center justify-center bg-muted/80">
              <AlertTriangle className="h-5 w-5 text-amber-500 mb-1" />
              <p className="text-xs text-center">Image unavailable</p>
            </div>
          )}
          
          <div className="absolute top-0 left-0 w-full h-full opacity-0 group-hover:opacity-100 bg-black/50 transition-opacity flex flex-col justify-end">
            <div className="p-2 flex gap-1 flex-wrap">
              <Button 
                size="sm" 
                className="w-full" 
                onClick={handleAddToCollection}
              >
                <PlusCircle className="h-4 w-4 mr-1" />
                Add to Collection
              </Button>
            </div>
          </div>
        </div>
        
        <CardContent className="p-3">
          <div className="text-sm font-medium truncate mb-1">{card.name}</div>
          <div className="flex justify-between items-center">
            <Badge variant="outline" className="text-xs">
              {card.number}
            </Badge>
            {card.rarity && (
              <span className="text-xs text-muted-foreground">{card.rarity}</span>
            )}
          </div>
        </CardContent>
      </Card>
      
      <AddToCollectionModal 
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        card={card}
      />
    </>
  );
};

export default PokemonCardItem;
