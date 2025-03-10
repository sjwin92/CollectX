
import React from "react";
import GlassCard from "@/components/ui/custom/GlassCard";
import { CardItemProps } from "@/components/cards/CardItem";

interface CollectionStatsProps {
  collection: CardItemProps[];
}

const CollectionStats = ({ collection }: CollectionStatsProps) => {
  // Calculate stats
  const rareCards = collection.filter(card => 
    card.rarity.toLowerCase().includes("rare") || 
    card.rarity.toLowerCase().includes("ultra") ||
    card.rarity.toLowerCase().includes("secret")
  ).length;
  
  const tradableCards = 12; // Placeholder, would need real data
  
  // Calculate estimated value range
  const calculateTotalValue = () => {
    let minTotal = 0;
    let maxTotal = 0;
    
    collection.forEach(card => {
      const valueRange = card.estimatedValue.replace('$', '').split('-');
      if (valueRange.length === 2) {
        minTotal += Number(valueRange[0]);
        maxTotal += Number(valueRange[1]);
      }
    });
    
    return `$${minTotal.toLocaleString()}-${maxTotal.toLocaleString()}`;
  };

  return (
    <GlassCard className="p-6">
      <h3 className="text-lg font-medium mb-4">Collection Stats</h3>
      <div className="space-y-4">
        <div className="flex justify-between items-center">
          <span className="text-muted-foreground">Total Cards</span>
          <span className="font-medium">{collection.length}</span>
        </div>
        <div className="flex justify-between items-center">
          <span className="text-muted-foreground">Tradable Cards</span>
          <span className="font-medium">{tradableCards}</span>
        </div>
        <div className="flex justify-between items-center">
          <span className="text-muted-foreground">Rare Cards</span>
          <span className="font-medium">{rareCards}</span>
        </div>
        <div className="flex justify-between items-center">
          <span className="text-muted-foreground">Est. Collection Value</span>
          <span className="font-medium">{calculateTotalValue()}</span>
        </div>
      </div>
    </GlassCard>
  );
};

export default CollectionStats;
