
import React, { useState, useEffect } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import CardItem, { CardItemProps } from "./CardItem";
import { Button } from "@/components/ui/button";
import { searchCards } from "@/services/api/pokemonCardsService";
import { Skeleton } from "@/components/ui/skeleton";

interface CardGridProps {
  setId?: string | null;
  cards?: CardItemProps[];
  columns?: {
    sm?: number;
    md?: number;
    lg?: number;
    xl?: number;
  };
  animated?: boolean;
  staggered?: boolean;
}

const CardGrid: React.FC<CardGridProps> = ({ 
  setId = null, 
  cards = undefined,
  columns = { sm: 2, md: 3, lg: 4, xl: 5 },
  animated = false,
  staggered = false
}) => {
  const [loadedCards, setLoadedCards] = useState<CardItemProps[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [page, setPage] = useState(1);
  const [hasMore, setHasMore] = useState(true);
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();

  const effectiveSetId = setId || searchParams.get('setId');
  const nameQuery = searchParams.get('name') || '';
  
  const loadCards = async (pageNum = 1, append = false) => {
    if (cards) {
      // If cards are provided as props, use them instead of fetching
      setLoadedCards(cards);
      setIsLoading(false);
      return;
    }
    
    setIsLoading(true);
    try {
      const searchParams: Record<string, string> = {};
      
      if (effectiveSetId) {
        searchParams.setId = effectiveSetId;
        console.log(`Adding set filter with setId: ${effectiveSetId}`);
      }
      
      if (nameQuery) {
        searchParams.name = nameQuery;
        console.log(`Adding name filter: ${nameQuery}`);
      }
      
      console.log(`Loading cards with search params:`, searchParams);
      const response = await searchCards(searchParams, pageNum, 20);
      
      if (response && response.data) {
        console.log(`Received ${response.data.length} cards from API`);
        
        const formattedCards: CardItemProps[] = response.data.map(card => ({
          id: card.id,
          name: card.name,
          imageUrl: card.images?.small,
          rarity: card.rarity || "Unknown",
          condition: "Near Mint",
          estimatedValue: card.tcgplayer?.prices?.holofoil?.market
            ? `$${card.tcgplayer.prices.holofoil.market.toFixed(2)}`
            : card.tcgplayer?.prices?.normal?.market
            ? `$${card.tcgplayer.prices.normal.market.toFixed(2)}`
            : "N/A"
        }));
        
        if (append) {
          setLoadedCards(prev => [...prev, ...formattedCards]);
        } else {
          setLoadedCards(formattedCards);
        }
        
        setHasMore(formattedCards.length >= 20);
      }
    } catch (error) {
      console.error("Error fetching cards:", error);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    console.log(`CardGrid useEffect - effectiveSetId: ${effectiveSetId}, nameQuery: ${nameQuery}`);
    
    if (cards) {
      setLoadedCards(cards);
      setIsLoading(false);
      return;
    }
    
    setPage(1);
    loadCards(1, false);
  }, [effectiveSetId, nameQuery, cards]);

  const handleLoadMore = () => {
    const nextPage = page + 1;
    setPage(nextPage);
    loadCards(nextPage, true);
  };

  const handleCardClick = (cardId: string) => {
    navigate(`/card/${cardId}`);
  };

  const displayCards = cards || loadedCards;

  if (isLoading && displayCards.length === 0) {
    return (
      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-4">
        {Array.from({ length: 10 }).map((_, index) => (
          <div key={index} className="flex flex-col space-y-2">
            <Skeleton className="w-full aspect-[2.5/3.5] rounded-lg" />
            <Skeleton className="h-4 w-2/3" />
            <Skeleton className="h-4 w-1/2" />
          </div>
        ))}
      </div>
    );
  }

  if (displayCards.length === 0 && !isLoading) {
    return (
      <div className="text-center py-12">
        <h3 className="text-xl font-medium mb-2">No cards found</h3>
        <p className="text-muted-foreground">
          {effectiveSetId ? "No cards found in this set" : "Try adjusting your search parameters"}
        </p>
      </div>
    );
  }

  // Using template string for grid classes to avoid Tailwind purge issues
  const gridClasses = `grid grid-cols-${columns.sm || 2} md:grid-cols-${columns.md || 3} lg:grid-cols-${columns.lg || 4} xl:grid-cols-${columns.xl || 5} gap-4`;

  return (
    <div className="space-y-6">
      <div className={gridClasses}>
        {displayCards.map((card, index) => (
          <CardItem 
            key={card.id}
            id={card.id}
            name={card.name}
            imageUrl={card.imageUrl}
            rarity={card.rarity}
            condition={card.condition}
            estimatedValue={card.estimatedValue}
            animation={animated ? "fade" : "none"}
            onClick={() => handleCardClick(card.id)}
          />
        ))}
      </div>
      
      {!cards && hasMore && (
        <div className="flex justify-center mt-8">
          <Button
            variant="outline"
            onClick={handleLoadMore}
            disabled={isLoading}
          >
            {isLoading ? "Loading..." : "Load More"}
          </Button>
        </div>
      )}
    </div>
  );
};

export default CardGrid;
