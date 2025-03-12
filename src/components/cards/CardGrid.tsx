
import React, { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import CardItem from "./CardItem";
import { Button } from "@/components/ui/button";
import { searchCards } from "@/services/pokemonTcgApi";
import { Skeleton } from "@/components/ui/skeleton";

interface CardGridProps {
  setId?: string | null;
}

const CardGrid: React.FC<CardGridProps> = ({ setId = null }) => {
  const [cards, setCards] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [page, setPage] = useState(1);
  const [hasMore, setHasMore] = useState(true);
  const navigate = useNavigate();

  const loadCards = async (pageNum = 1, append = false) => {
    setIsLoading(true);
    try {
      // Build query parameters
      const params = new URLSearchParams();
      if (setId) {
        params.append('q', `set.id:${setId}`);
      }
      params.append('page', pageNum.toString());
      params.append('pageSize', '20');
      
      const response = await searchCards(params);
      
      if (response && response.data) {
        if (append) {
          setCards(prev => [...prev, ...response.data]);
        } else {
          setCards(response.data);
        }
        
        setHasMore(response.data.length >= 20);
      }
    } catch (error) {
      console.error("Error fetching cards:", error);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    // Reset page and load cards when setId changes
    setPage(1);
    loadCards(1, false);
  }, [setId]);

  const handleLoadMore = () => {
    const nextPage = page + 1;
    setPage(nextPage);
    loadCards(nextPage, true);
  };

  const handleCardClick = (cardId) => {
    navigate(`/card/${cardId}`);
  };

  if (isLoading && cards.length === 0) {
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

  if (cards.length === 0 && !isLoading) {
    return (
      <div className="text-center py-12">
        <h3 className="text-xl font-medium mb-2">No cards found</h3>
        <p className="text-muted-foreground">
          {setId ? "No cards found in this set" : "Try adjusting your search parameters"}
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-4">
        {cards.map((card) => (
          <CardItem 
            key={card.id} 
            card={card} 
            onClick={() => handleCardClick(card.id)}
          />
        ))}
      </div>
      
      {hasMore && (
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
