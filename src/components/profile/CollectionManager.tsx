
import React, { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Plus, Search, Shield } from "lucide-react";
import CardGrid from "@/components/cards/CardGrid";
import { CardItemProps } from "@/components/cards/CardItem";
import GlassCard from "@/components/ui/custom/GlassCard";
import { Checkbox } from "@/components/ui/checkbox";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";

interface CollectionManagerProps {
  collection: CardItemProps[];
}

const CollectionManager = ({ collection }: CollectionManagerProps) => {
  const [searchQuery, setSearchQuery] = useState("");
  const [showGradedOnly, setShowGradedOnly] = useState(false);
  const [filteredCards, setFilteredCards] = useState<CardItemProps[]>(collection);
  
  // Filter cards based on search query and graded status
  const handleSearchChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const query = e.target.value.toLowerCase();
    setSearchQuery(query);
    
    filterCards(query, showGradedOnly);
  };
  
  // Handle graded filter change
  const handleGradedFilterChange = (checked: boolean) => {
    setShowGradedOnly(checked);
    filterCards(searchQuery, checked);
  };
  
  // Combined filter function
  const filterCards = (query: string, gradedOnly: boolean) => {
    let filtered = collection;
    
    if (query.trim() !== "") {
      filtered = filtered.filter(card => 
        card.name.toLowerCase().includes(query) || 
        card.rarity.toLowerCase().includes(query) ||
        card.condition.toLowerCase().includes(query)
      );
    }
    
    if (gradedOnly) {
      filtered = filtered.filter(card => card.graded === true);
    }
    
    setFilteredCards(filtered);
  };

  return (
    <GlassCard className="p-6 mb-6">
      <div className="flex justify-between items-center mb-6">
        <h2 className="text-lg font-bold">My Card Collection</h2>
        <Button size="sm">
          <Plus className="h-4 w-4 mr-2" />
          Add Cards
        </Button>
      </div>
      
      <div className="flex flex-col sm:flex-row gap-4 mb-6">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-muted-foreground h-4 w-4" />
          <Input 
            placeholder="Search your collection..." 
            className="pl-9"
            value={searchQuery}
            onChange={handleSearchChange}
          />
        </div>
        
        <div className="flex items-center space-x-2">
          <Checkbox 
            id="graded-filter" 
            checked={showGradedOnly}
            onCheckedChange={(checked) => handleGradedFilterChange(checked as boolean)}
          />
          <Label 
            htmlFor="graded-filter" 
            className="text-sm font-medium cursor-pointer flex items-center gap-1.5"
          >
            <Shield className="h-4 w-4" />
            Graded Only
          </Label>
          
          {showGradedOnly && (
            <Badge variant="outline" className="bg-primary/10 text-primary">
              Graded
            </Badge>
          )}
        </div>
      </div>
      
      {filteredCards.length > 0 ? (
        <CardGrid 
          cards={filteredCards} 
          columns={{ sm: 1, md: 2, lg: 3 }} 
          animated
        />
      ) : (
        <div className="text-center py-8">
          <p className="text-muted-foreground">
            {showGradedOnly 
              ? "No graded cards found" 
              : searchQuery 
                ? `No cards matching "${searchQuery}"` 
                : "No cards in your collection"}
          </p>
        </div>
      )}
      
      {collection.length === 0 && (
        <div className="text-center py-10">
          <h3 className="text-xl font-medium mb-2">Your collection is empty</h3>
          <p className="text-muted-foreground mb-4">Start adding cards to showcase your collection</p>
          <Button>
            <Plus className="h-4 w-4 mr-2" />
            Add Your First Card
          </Button>
        </div>
      )}
    </GlassCard>
  );
};

export default CollectionManager;
