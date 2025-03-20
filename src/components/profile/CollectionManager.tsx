import React, { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Plus, Search, Shield } from "lucide-react";
import CardGrid from "@/components/cards/CardGrid";
import { ExtendedCardItemProps } from "@/types/cardTypes";
import GlassCard from "@/components/ui/custom/GlassCard";
import { Checkbox } from "@/components/ui/checkbox";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import GradedFilter from "@/components/profile/GradedFilter";
import { useToast } from "@/hooks/use-toast";
import { useQuery } from "@tanstack/react-query";
import { getAllSets } from "@/services/api/pokemonSetsService";
import { getCardsBySetId } from "@/services/api/pokemonCardsService";

interface CollectionManagerProps {
  collection?: ExtendedCardItemProps[];
}

const CollectionManager = ({ collection: propCollection }: CollectionManagerProps) => {
  const [searchQuery, setSearchQuery] = useState("");
  const [showGradedOnly, setShowGradedOnly] = useState(false);
  const [filteredCards, setFilteredCards] = useState<ExtendedCardItemProps[]>([]);
  const { toast } = useToast();
  
  const { data: apiCollection, isLoading } = useQuery({
    queryKey: ['userCollection'],
    queryFn: async () => {
      if (propCollection && propCollection.length > 0) {
        return propCollection;
      }
      
      try {
        const sets = await getAllSets();
        
        if (sets && sets.length > 0) {
          const randomSetIndex1 = Math.floor(Math.random() * sets.length);
          let randomSetIndex2 = Math.floor(Math.random() * sets.length);
          while (randomSetIndex2 === randomSetIndex1) {
            randomSetIndex2 = Math.floor(Math.random() * sets.length);
          }
          
          const set1 = sets[randomSetIndex1];
          const set2 = sets[randomSetIndex2];
          
          const cards1 = await getCardsBySetId(set1.id, 1, 3);
          const cards2 = await getCardsBySetId(set2.id, 1, 3);
          
          const formattedCards: ExtendedCardItemProps[] = [...cards1.data, ...cards2.data]
            .map(card => ({
              id: card.id,
              name: card.name,
              imageUrl: card.images?.small || card.images?.large,
              rarity: card.rarity || "Common",
              condition: Math.random() > 0.7 ? "Mint" : "Near Mint",
              estimatedValue: card.tcgplayer?.prices?.holofoil?.market 
                ? `£${card.tcgplayer.prices.holofoil.market.toFixed(2)}`
                : card.tcgplayer?.prices?.normal?.market
                ? `£${card.tcgplayer.prices.normal.market.toFixed(2)}`
                : "£N/A",
              graded: Math.random() > 0.8,
              gradingCompany: Math.random() > 0.5 ? "PSA" : "BGS",
              gradeScore: Math.floor(Math.random() * 3) + 8,
              forTrade: Math.random() > 0.3,
            }));
          
          return formattedCards;
        }
        
        return [];
      } catch (error) {
        console.error("Error fetching collection:", error);
        toast({
          title: "Error loading collection",
          description: "There was a problem fetching your collection.",
          variant: "destructive"
        });
        return [];
      }
    },
    enabled: !propCollection || propCollection.length === 0
  });
  
  const collection = propCollection || apiCollection || [];
  
  const handleSearchChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const query = e.target.value.toLowerCase();
    setSearchQuery(query);
    
    filterCards(query, showGradedOnly);
  };
  
  const handleGradedFilterChange = (checked: boolean) => {
    setShowGradedOnly(checked);
    filterCards(searchQuery, checked);
  };
  
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

  useEffect(() => {
    if (collection) {
      filterCards(searchQuery, showGradedOnly);
    }
  }, [collection, apiCollection]);

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
        
        <GradedFilter 
          showGradedOnly={showGradedOnly}
          onGradedFilterChange={handleGradedFilterChange}
        />
      </div>
      
      {isLoading ? (
        <div className="flex justify-center items-center py-12">
          <div className="h-8 w-8 animate-spin rounded-full border-4 border-primary border-t-transparent"></div>
        </div>
      ) : filteredCards.length > 0 ? (
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
      
      {collection.length === 0 && !isLoading && (
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
