
import React from "react";
import { 
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { PokemonSet } from "@/services/api/pokemonTypes";
import CardCollectionForm from "./collection/CardCollectionForm";

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
        <CardCollectionForm {...props} />
      </DialogContent>
    </Dialog>
  );
};

export default AddToCollectionModal;
