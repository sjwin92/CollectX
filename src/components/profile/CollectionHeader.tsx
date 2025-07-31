
import React from "react";
import { Button } from "@/components/ui/button";
import { Plus, RefreshCw } from "lucide-react";

interface CollectionHeaderProps {
  onAddCard: () => void;
  onRefresh: () => void;
}

const CollectionHeader = ({ onAddCard, onRefresh }: CollectionHeaderProps) => {
  return (
    <div className="flex justify-between items-center mb-6">
      <h2 className="text-lg font-bold">My Card Collection</h2>
      <div className="flex gap-2">
        <Button size="sm" variant="outline" onClick={onRefresh}>
          <RefreshCw className="h-4 w-4 mr-2" />
          Refresh
        </Button>
        <Button size="sm" onClick={() => {
          console.log("Add Cards button clicked - navigating to search");
          window.location.href = "/pokemon-cards";
        }}>
          <Plus className="h-4 w-4 mr-2" />
          Add Cards
        </Button>
      </div>
    </div>
  );
};

export default CollectionHeader;
