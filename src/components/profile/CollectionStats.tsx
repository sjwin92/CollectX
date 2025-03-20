
import React from "react";
import GlassCard from "@/components/ui/custom/GlassCard";
import { CardItemProps } from "@/components/cards/CardItem";
import { formatCurrency } from "@/utils/escrowCalculator";

interface CollectionStatsProps {
  collection: CardItemProps[];
}

const CollectionStats = ({ collection }: CollectionStatsProps) => {
  // Calculate stats
  const rareCards = collection.filter(card => 
    card.rarity?.toLowerCase().includes("rare") || 
    card.rarity?.toLowerCase().includes("ultra") ||
    card.rarity?.toLowerCase().includes("secret")
  ).length;
  
  // For tradable cards, in a real app this would come from the card's properties
  // For now, let's assume approximately 60% of cards are tradable
  const tradableCards = Math.floor(collection.length * 0.6);
  
  // Calculate estimated value range
  const calculateTotalValue = () => {
    let minTotal = 0;
    let maxTotal = 0;
    
    collection.forEach(card => {
      if (!card.estimatedValue || card.estimatedValue === "£N/A") return;
      
      let valueText = card.estimatedValue.replace('£', '').replace('$', '');
      
      if (valueText.includes('-')) {
        // Handle range values like "£10-15"
        const valueRange = valueText.split('-');
        if (valueRange.length === 2) {
          minTotal += Number(valueRange[0]) || 0;
          maxTotal += Number(valueRange[1]) || 0;
        }
      } else {
        // Handle single values like "£10"
        const value = Number(valueText) || 0;
        minTotal += value;
        maxTotal += value;
      }
    });
    
    // If min and max are the same, just return one value
    if (minTotal === maxTotal) {
      return formatCurrency(minTotal);
    }
    
    return `${formatCurrency(minTotal)}-${formatCurrency(maxTotal)}`;
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
