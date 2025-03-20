import React, { useState, useEffect } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import CardItem, { CardItemProps } from "./CardItem";
import { Button } from "@/components/ui/button";
import { searchCards, getCardById } from "@/services/api/pokemonCardsService";
import { Skeleton } from "@/components/ui/skeleton";
import { useToast } from "@/hooks/use-toast";
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
  showCondition?: boolean;
}
const CardGrid: React.FC<CardGridProps> = ({
  setId = null,
  cards = undefined,
  columns = {
    sm: 2,
    md: 3,
    lg: 4,
    xl: 5
  },
  animated = false,
  staggered = false,
  showCondition = true
}) => {
  const [loadedCards, setLoadedCards] = useState<CardItemProps[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [page, setPage] = useState(1);
  const [hasMore, setHasMore] = useState(true);
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const {
    toast
  } = useToast();
  const effectiveSetId = setId || searchParams.get('setId');
  const nameQuery = searchParams.get('name') || '';

  // Format currency values to GBP
  const formatToGBP = (value: number | null | undefined): string => {
    if (value === null || value === undefined) return "N/A";
    return `£${value.toFixed(2)}`;
  };
  const loadCards = async (pageNum = 1, append = false) => {
    if (cards) {
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
        const formattedCards: CardItemProps[] = response.data.map(card => {
          const imgUrl = card.images?.small || card.images?.large || null;

          // Get the price in the correct format
          const price = card.tcgplayer?.prices?.holofoil?.market ? formatToGBP(card.tcgplayer.prices.holofoil.market) : card.tcgplayer?.prices?.normal?.market ? formatToGBP(card.tcgplayer.prices.normal.market) : "N/A";
          return {
            id: card.id,
            name: card.name || "Unknown Card",
            imageUrl: imgUrl,
            rarity: card.rarity || "Unknown",
            condition: "Near Mint",
            estimatedValue: price
          };
        });
        if (append) {
          setLoadedCards(prev => [...prev, ...formattedCards]);
        } else {
          setLoadedCards(formattedCards);
        }
        setHasMore(formattedCards.length >= 20);
      } else {
        if (!append) {
          toast({
            title: "No cards found",
            description: "Try adjusting your search parameters",
            variant: "destructive"
          });
        }
      }
    } catch (error) {
      console.error("Error fetching cards:", error);
      toast({
        title: "Error loading cards",
        description: "There was a problem fetching the cards. Please try again.",
        variant: "destructive"
      });
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
    return <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-4">
        {Array.from({
        length: 10
      }).map((_, index) => <div key={index} className="flex flex-col space-y-2">
            <Skeleton className="w-full aspect-[2.5/3.5] rounded-lg" />
            <Skeleton className="h-4 w-2/3" />
            <Skeleton className="h-4 w-1/2" />
          </div>)}
      </div>;
  }
  if (displayCards.length === 0 && !isLoading) {
    return;
  }
  const gridClasses = `grid grid-cols-${columns.sm || 2} md:grid-cols-${columns.md || 3} lg:grid-cols-${columns.lg || 4} xl:grid-cols-${columns.xl || 5} gap-4`;
  return <div className="space-y-6">
      <div className={gridClasses}>
        {displayCards.map((card, index) => <CardItem key={card.id} id={card.id} name={card.name} imageUrl={card.imageUrl} rarity={card.rarity} condition={card.condition} estimatedValue={card.estimatedValue} animation={animated ? "fade" : "none"} onClick={() => handleCardClick(card.id)} showCondition={showCondition} />)}
      </div>
      
      {!cards && hasMore && <div className="flex justify-center mt-8">
          <Button variant="outline" onClick={handleLoadMore} disabled={isLoading}>
            {isLoading ? "Loading..." : "Load More"}
          </Button>
        </div>}
    </div>;
};
export default CardGrid;