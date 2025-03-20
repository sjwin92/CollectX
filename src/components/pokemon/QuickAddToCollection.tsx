
import React, { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { PlusCircle, CheckCircle } from "lucide-react";
import { PokemonCard } from "@/services/pokemonTcgApi";
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
} from "@/components/ui/sheet";
import QuickAddCardForm from "./collection/QuickAddCardForm";
import { getCollection } from "@/services/collectionService";
import { useToast } from "@/hooks/use-toast";

interface QuickAddToCollectionProps {
  card: PokemonCard;
}

const QuickAddToCollection = ({ card }: QuickAddToCollectionProps) => {
  const [open, setOpen] = useState(false);
  const [isInCollection, setIsInCollection] = useState(false);
  const { toast } = useToast();
  
  // Check if card is already in collection
  useEffect(() => {
    const checkCollection = () => {
      const collection = getCollection();
      const exists = collection.some(item => item.id === card.id);
      setIsInCollection(exists);
    };
    
    checkCollection();
    
    // Set up event listener to check when collection changes
    window.addEventListener('storage', checkCollection);
    
    return () => {
      window.removeEventListener('storage', checkCollection);
    };
  }, [card.id]);

  const handleOpenChange = (newOpen: boolean) => {
    // If trying to open and card is already in collection, show toast instead
    if (newOpen && isInCollection) {
      toast({
        title: "Already in Collection",
        description: `${card.name} is already in your collection.`,
      });
      return;
    }
    setOpen(newOpen);
  };
  
  if (isInCollection) {
    return (
      <Button className="w-full" variant="outline" disabled>
        <CheckCircle className="mr-2 h-4 w-4 text-green-500" />
        In Collection
      </Button>
    );
  }
  
  return (
    <Sheet open={open} onOpenChange={handleOpenChange}>
      <SheetTrigger asChild>
        <Button className="w-full">
          <PlusCircle className="mr-2 h-4 w-4" />
          Add to Collection
        </Button>
      </SheetTrigger>
      <SheetContent className="overflow-y-auto">
        <SheetHeader>
          <SheetTitle>Add to Collection</SheetTitle>
          <SheetDescription>
            Add {card.name} from {card.set.name} to your collection
          </SheetDescription>
        </SheetHeader>
        
        <QuickAddCardForm 
          card={card} 
          onClose={() => setOpen(false)} 
        />
      </SheetContent>
    </Sheet>
  );
};

export default QuickAddToCollection;
