
import React, { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Plus, Search } from "lucide-react";
import CardGrid from "@/components/cards/CardGrid";
import { ExtendedCardItemProps } from "@/types/cardTypes";
import GlassCard from "@/components/ui/custom/GlassCard";
import { Checkbox } from "@/components/ui/checkbox";
import { Label } from "@/components/ui/label";
import GradedFilter from "@/components/profile/GradedFilter";
import { useToast } from "@/hooks/use-toast";
import { useNavigate } from "react-router-dom";
import CollectionStats from "@/components/profile/CollectionStats";

interface CollectionManagerProps {
  collection?: ExtendedCardItemProps[];
}

const CollectionManager = ({ collection: propCollection }: CollectionManagerProps) => {
  const [searchQuery, setSearchQuery] = useState("");
  const [showGradedOnly, setShowGradedOnly] = useState(false);
  const [filteredCards, setFilteredCards] = useState<ExtendedCardItemProps[]>([]);
  const { toast } = useToast();
  const navigate = useNavigate();
  
  const [collection, setCollection] = useState<ExtendedCardItemProps[]>([]);
  
  useEffect(() => {
    if (propCollection) {
      setCollection(propCollection);
      filterCards(searchQuery, showGradedOnly, propCollection);
    } else {
      // Load from localStorage if no prop collection is provided
      const savedCollection = localStorage.getItem('myCollection');
      if (savedCollection) {
        try {
          const parsedCollection = JSON.parse(savedCollection);
          setCollection(parsedCollection);
          filterCards(searchQuery, showGradedOnly, parsedCollection);
        } catch (error) {
          console.error('Error parsing collection from localStorage:', error);
          setCollection([]);
          setFilteredCards([]);
        }
      }
    }
  }, [propCollection, searchQuery, showGradedOnly]);
  
  const handleSearchChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const query = e.target.value.toLowerCase();
    setSearchQuery(query);
    console.log("Collection Manager - Searching for:", query);
    filterCards(query, showGradedOnly, collection);
  };
  
  const handleGradedFilterChange = (checked: boolean) => {
    setShowGradedOnly(checked);
    filterCards(searchQuery, checked, collection);
  };
  
  const filterCards = (query: string, gradedOnly: boolean, cards: ExtendedCardItemProps[]) => {
    if (!cards || !Array.isArray(cards)) {
      console.log("No cards to filter or invalid cards array");
      setFilteredCards([]);
      return;
    }
    
    console.log(`Filtering ${cards.length} cards with query: "${query}"`);
    let filtered = [...cards]; // Create a copy to avoid mutating the original
    
    if (query.trim() !== "") {
      filtered = filtered.filter(card => {
        if (!card) return false;
        
        const nameMatch = card.name && card.name.toLowerCase().includes(query);
        const rarityMatch = card.rarity && card.rarity.toLowerCase().includes(query);
        const conditionMatch = card.condition && card.condition.toLowerCase().includes(query);
        const setMatch = card.set && card.set.name && card.set.name.toLowerCase().includes(query);
        const numberMatch = card.number && card.number.toLowerCase().includes(query);
        
        return nameMatch || rarityMatch || conditionMatch || setMatch || numberMatch;
      });
      
      console.log(`Found ${filtered.length} cards matching "${query}"`);
    }
    
    if (gradedOnly) {
      filtered = filtered.filter(card => card.graded === true);
      console.log(`Found ${filtered.length} graded cards`);
    }
    
    setFilteredCards(filtered);
  };

  const handleAddCard = () => {
    navigate("/sets");
    toast({
      title: "Browse Sets",
      description: "Choose a set to find cards to add to your collection."
    });
  };

  return (
    <GlassCard className="p-6 mb-6">
      <div className="flex justify-between items-center mb-6">
        <h2 className="text-lg font-bold">My Card Collection</h2>
        <Button size="sm" onClick={handleAddCard}>
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
        
        <GradedFilter 
          showGradedOnly={showGradedOnly}
          onGradedFilterChange={handleGradedFilterChange}
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
          <Button onClick={handleAddCard}>
            <Plus className="h-4 w-4 mr-2" />
            Add Your First Card
          </Button>
        </div>
      )}
      
      {collection.length > 0 && (
        <div className="mt-6">
          <CollectionStats collection={collection} />
        </div>
      )}
    </GlassCard>
  );
};

export default CollectionManager;
