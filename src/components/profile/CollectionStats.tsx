
import React from "react";
import GlassCard from "@/components/ui/custom/GlassCard";
import { ExtendedCardItemProps } from "@/types/cardTypes";
import { formatCurrency } from "@/utils/escrowCalculator";

interface CollectionStatsProps {
  collection: ExtendedCardItemProps[];
}

const CollectionStats = ({ collection }: CollectionStatsProps) => {
  // Calculate stats
  const rareCards = collection.filter(card => 
    card.rarity?.toLowerCase().includes("rare") || 
    card.rarity?.toLowerCase().includes("ultra") ||
    card.rarity?.toLowerCase().includes("secret")
  ).length;
  
  // Get tradable cards count
  const tradableCards = collection.filter(card => card.forTrade).length;
  
  // Calculate estimated value range
  const calculateTotalValue = () => {
    let minTotal = 0;
    let maxTotal = 0;
    
    collection.forEach(card => {
      if (!card.estimatedValue) return;
      
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

  // Calculate graded cards count
  const gradedCards = collection.filter(card => card.graded).length;

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
          <span className="text-muted-foreground">Graded Cards</span>
          <span className="font-medium">{gradedCards}</span>
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
