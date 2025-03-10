
import React, { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Plus, Search } from "lucide-react";
import CardGrid from "@/components/cards/CardGrid";
import { CardItemProps } from "@/components/cards/CardItem";
import GlassCard from "@/components/ui/custom/GlassCard";

interface CollectionManagerProps {
  collection: CardItemProps[];
}

const CollectionManager = ({ collection }: CollectionManagerProps) => {
  const [searchQuery, setSearchQuery] = useState("");
  const [filteredCards, setFilteredCards] = useState<CardItemProps[]>(collection);
  
  // Filter cards based on search query
  const handleSearchChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const query = e.target.value.toLowerCase();
    setSearchQuery(query);
    
    if (query.trim() === "") {
      setFilteredCards(collection);
    } else {
      const filtered = collection.filter(card => 
        card.name.toLowerCase().includes(query) || 
        card.rarity.toLowerCase().includes(query) ||
        card.condition.toLowerCase().includes(query)
      );
      setFilteredCards(filtered);
    }
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
      
      <div className="relative mb-6">
        <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-muted-foreground h-4 w-4" />
        <Input 
          placeholder="Search your collection..." 
          className="pl-9"
          value={searchQuery}
          onChange={handleSearchChange}
        />
      </div>
      
      {filteredCards.length > 0 ? (
        <CardGrid 
          cards={filteredCards} 
          columns={{ sm: 1, md: 2, lg: 3 }} 
          animated
        />
      ) : (
        <div className="text-center py-8">
          <p className="text-muted-foreground">No cards matching "{searchQuery}"</p>
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
