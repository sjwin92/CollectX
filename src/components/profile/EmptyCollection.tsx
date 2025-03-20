
import React from "react";
import { Button } from "@/components/ui/button";
import { Plus } from "lucide-react";

interface EmptyCollectionProps {
  onAddCard: () => void;
}

const EmptyCollection = ({ onAddCard }: EmptyCollectionProps) => {
  return (
    <div className="text-center py-10">
      <h3 className="text-xl font-medium mb-2">Your collection is empty</h3>
      <p className="text-muted-foreground mb-4">Start adding cards to showcase your collection</p>
      <Button onClick={onAddCard}>
        <Plus className="h-4 w-4 mr-2" />
        Add Your First Card
      </Button>
    </div>
  );
};

export default EmptyCollection;
