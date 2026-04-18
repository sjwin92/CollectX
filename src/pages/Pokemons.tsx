
import React, { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { getCards, PokemonCard } from "@/services/pokemonTcgApi";
import Navbar from "@/components/layout/Navbar";
import Footer from "@/components/layout/Footer";
import CardGrid from "@/components/cards/CardGrid";
import { Button } from "@/components/ui/button";
import GlassCard from "@/components/ui/custom/GlassCard";
import { Link } from "react-router-dom";
import { CardItemProps } from "@/components/cards/CardItem";
import { useToast } from "@/hooks/use-toast";
import { usdToGbp } from "@/services/currencyService";

const Pokemons = () => {
  const [currentPage, setCurrentPage] = useState(1);
  const { toast } = useToast();

  const { data, isLoading, isError } = useQuery({
    queryKey: ['pokemons', currentPage],
    queryFn: async () => {
      return await getCards(currentPage, 20);
    },
  });

  const mapToPokemonCardItems = (cards: PokemonCard[] = []): CardItemProps[] => {
    return cards.map(card => ({
      id: card.id,
      name: card.name,
      imageUrl: card.images.small,
      rarity: card.rarity || "Unknown",
      condition: "Near Mint",
      estimatedValue: (() => {
        const p = card.tcgplayer?.prices;
        const usd = p?.holofoil?.market ?? p?.holofoil?.mid ?? p?.normal?.market ?? p?.normal?.mid
          ?? p?.reverseHolofoil?.market ?? p?.['1stEditionHolofoil']?.market ?? 0;
        return usd > 0 ? `£${usdToGbp(usd).toFixed(2)}` : 'N/A';
      })()
    }));
  };

  const loadNextPage = () => {
    setCurrentPage(prev => prev + 1);
  };

  const loadPreviousPage = () => {
    if (currentPage > 1) {
      setCurrentPage(prev => prev - 1);
    }
  };

  return (
    <div className="min-h-screen flex flex-col">
      <Navbar />

      <div className="container py-8 flex-1">
        <div className="mb-8">
          <h1 className="text-3xl font-bold mb-2">Pokémon Database</h1>
          <p className="text-muted-foreground">
            Browse and explore Pokémon data to help you with your collection and trades.
          </p>
        </div>

        {isLoading ? (
          <div className="text-center py-12">
            <div className="animate-pulse text-xl">Loading Pokémon data...</div>
          </div>
        ) : isError ? (
          <GlassCard variant="dark" className="p-6 text-center">
            <h3 className="text-xl font-medium mb-2">Failed to load Pokémon data</h3>
            <p className="text-muted-foreground mb-4">
              There was an error loading the Pokémon database.
            </p>
            <Button onClick={() => setCurrentPage(1)}>Try Again</Button>
          </GlassCard>
        ) : (
          <>
            <CardGrid
              cards={mapToPokemonCardItems(data?.data)}
              columns={{ sm: 2, md: 3, lg: 4, xl: 5 }}
              animated
              staggered
            />

            <div className="flex justify-between items-center pt-6">
              <Button
                variant="outline"
                onClick={loadPreviousPage}
                disabled={currentPage <= 1}
              >
                Previous Page
              </Button>
              <span className="text-muted-foreground">
                Page {currentPage} of {Math.ceil((data?.totalCount || 0) / 20)}
              </span>
              <Button
                variant="outline"
                onClick={loadNextPage}
                disabled={!data || currentPage >= Math.ceil(data.totalCount / 20)}
              >
                Next Page
              </Button>
            </div>
          </>
        )}
      </div>

      <Footer />
    </div>
  );
};

export default Pokemons;
