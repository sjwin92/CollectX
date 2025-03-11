
import React, { useState } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { PlusCircle, ArrowRightLeft } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { useUser } from "@/hooks/useUser";
import AddToCollectionModal from "./AddToCollectionModal";
import { handleImageError } from "@/services/cardImageService";

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
  const { isSignedIn } = useUser();
  const { toast } = useToast();
  
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
  
  return (
    <>
      <Card 
        className="overflow-hidden group cursor-pointer transition-all hover:shadow-md"
        onClick={handleClick}
      >
        <div className="relative aspect-[2/3] overflow-hidden">
          {card.images?.small && (
            <img 
              src={card.images.small}
              alt={card.name}
              className="w-full h-full object-contain transition-transform duration-300 group-hover:scale-105"
              loading="lazy"
              onError={(e) => handleImageError(e, card)}
            />
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
