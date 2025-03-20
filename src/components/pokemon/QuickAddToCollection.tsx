
import React, { useState } from "react";
import { Button } from "@/components/ui/button";
import { PlusCircle } from "lucide-react";
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

interface QuickAddToCollectionProps {
  card: PokemonCard;
}

const QuickAddToCollection = ({ card }: QuickAddToCollectionProps) => {
  const [open, setOpen] = useState(false);
  
  return (
    <Sheet open={open} onOpenChange={setOpen}>
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
