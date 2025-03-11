
import React, { useState, useEffect } from "react";
import { useQuery } from "@tanstack/react-query";
import { useSearchParams, Link } from "react-router-dom";
import { getCardsBySet, PokemonCard } from "@/services/pokemonSetsApi";
import Navbar from "@/components/layout/Navbar";
import Footer from "@/components/layout/Footer";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Loader2, Search, ArrowLeft, X } from "lucide-react";
import GlassCard from "@/components/ui/custom/GlassCard";
import { useToast } from "@/hooks/use-toast";
import PokemonCardItem from "@/components/pokemon/PokemonCardItem";

const PokemonSetDetails = () => {
  const [searchParams] = useSearchParams();
  const setId = searchParams.get("set") || "";
  const [searchQuery, setSearchQuery] = useState("");
  const [filteredCards, setFilteredCards] = useState<PokemonCard[]>([]);
  const { toast } = useToast();
  
  const { data: cards = [], isLoading, isError } = useQuery({
    queryKey: ['pokemonCards', setId],
    queryFn: () => getCardsBySet(setId),
    enabled: !!setId,
  });
  
  useEffect(() => {
    if (!searchQuery) {
      setFilteredCards(cards);
      return;
    }
    
    const lowerQuery = searchQuery.toLowerCase();
    const results = cards.filter(card => 
      card.name.toLowerCase().includes(lowerQuery) || 
      card.number.toLowerCase().includes(lowerQuery) ||
      card.types?.some(type => type.toLowerCase().includes(lowerQuery))
    );
    
    setFilteredCards(results);
    
    if (results.length === 0 && cards.length > 0) {
      toast({
        title: "No cards found",
        description: `No cards found matching "${searchQuery}"`,
        variant: "destructive"
      });
    }
  }, [searchQuery, cards, toast]);
  
  const handleClearSearch = () => {
    setSearchQuery("");
  };
  
  const handleCardClick = (card: PokemonCard) => {
    window.open(`/card/${card.id}`, '_blank');
  };
  
  // Get set name from first card
  const setName = cards.length > 0 ? cards[0].set.name : "Loading...";
  
  return (
    <div className="min-h-screen flex flex-col">
      <Navbar />

      <div className="container py-8 flex-1">
        <div className="mb-4">
          <Link to="/pokemon-sets">
            <Button variant="ghost" className="pl-0 mb-2">
              <ArrowLeft className="mr-2 h-4 w-4" /> Back to Sets
            </Button>
          </Link>
          <h1 className="text-3xl font-bold mb-2">{setName}</h1>
          <p className="text-muted-foreground">
            {cards.length} cards in this set. Browse and add cards to your collection.
          </p>
        </div>

        {/* Search */}
        <div className="mb-8">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              type="text"
              placeholder="Search by card name, number, or type..."
              className="pl-9 pr-10"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
            />
            {searchQuery && (
              <Button 
                variant="ghost" 
                size="icon" 
                className="absolute right-1 top-1/2 -translate-y-1/2 h-7 w-7" 
                onClick={handleClearSearch}
              >
                <X className="h-4 w-4" />
              </Button>
            )}
          </div>
        </div>

        {isLoading ? (
          <div className="text-center py-12">
            <Loader2 className="h-8 w-8 animate-spin mx-auto mb-4" />
            <div className="text-xl">Loading cards...</div>
          </div>
        ) : isError ? (
          <GlassCard variant="dark" className="p-6 text-center">
            <h3 className="text-xl font-medium mb-2">Failed to load cards</h3>
            <p className="text-muted-foreground mb-4">
              There was an error loading the cards for this set.
            </p>
            <Button onClick={() => window.location.reload()}>Try Again</Button>
          </GlassCard>
        ) : (
          <>
            {filteredCards.length === 0 ? (
              <div className="text-center py-12">
                {searchQuery ? (
                  <>
                    <p className="text-xl mb-4">No cards found matching "{searchQuery}"</p>
                    <Button onClick={handleClearSearch}>Clear Search</Button>
                  </>
                ) : (
                  <p className="text-xl">No cards found in this set</p>
                )}
              </div>
            ) : (
              <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 gap-4">
                {filteredCards.map((card) => (
                  <PokemonCardItem 
                    key={card.id} 
                    card={card}
                    onClick={handleCardClick}
                  />
                ))}
              </div>
            )}
          </>
        )}
      </div>

      <Footer />
    </div>
  );
};

export default PokemonSetDetails;
