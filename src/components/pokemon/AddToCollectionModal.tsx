
import React from "react";
import { 
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { PokemonSet } from "@/services/api/pokemonTypes";
import QuickAddCardForm from "./collection/QuickAddCardForm";

interface AddToCollectionModalProps {
  set: PokemonSet;
  open: boolean;
  onClose: () => void;
  cardId?: string;
  cardName?: string;
  cardImage?: string;
  cardRarity?: string;
  cardNumber?: string;
}

const AddToCollectionModal = (props: AddToCollectionModalProps) => {
  const { set, open, onClose, cardName } = props;
  
  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-[425px]">
        <DialogHeader>
          <DialogTitle>Add to Collection</DialogTitle>
          <DialogDescription>
            Add {cardName || "cards"} from {set.name} to your collection
          </DialogDescription>
        </DialogHeader>
        <QuickAddCardForm 
          card={{
            id: props.cardId || `${set.id}-generic`,
            name: props.cardName || `Card from ${set.name}`,
            set: {
              id: set.id,
              name: set.name,
            },
            images: {
              small: props.cardImage || set.images.logo || "",
              large: props.cardImage || set.images.logo || "",
            },
            rarity: props.cardRarity || "Common",
            number: props.cardNumber || ""
          }}
          onClose={onClose}
        />
      </DialogContent>
    </Dialog>
  );
};

export default AddToCollectionModal;
