
import React, { useState, useEffect } from "react";
import { useQuery } from "@tanstack/react-query";
import { getCards as getPokemonTcgCards, PokemonCard } from "@/services/pokemonTcgApi";
import { getCards as getTCGDexCards, TCGDexCard } from "@/services/tcgdexApi";
import Navbar from "@/components/layout/Navbar";
import Footer from "@/components/layout/Footer";
import CardGrid from "@/components/cards/CardGrid";
import PokemonCardSearch from "@/components/pokemon/PokemonCardSearch";
import PokemonCardDetail from "@/components/pokemon/PokemonCardDetail";
import GlassCard from "@/components/ui/custom/GlassCard";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Search, Database, Star, Info, X } from "lucide-react";
import { CardItemProps } from "@/components/cards/CardItem";
import { useToast } from "@/hooks/use-toast";

const PokemonCards = () => {
  const [selectedCard, setSelectedCard] = useState<PokemonCard | null>(null);
  const [currentPage, setCurrentPage] = useState(1);
  const [dataSource, setDataSource] = useState<"pokemontcg" | "tcgdex">("pokemontcg");
  const { toast } = useToast();

  const { data, isLoading, isError } = useQuery({
    queryKey: ['pokemonCards', currentPage, dataSource],
    queryFn: async () => {
      if (dataSource === 'pokemontcg') {
        return await getPokemonTcgCards(currentPage, 20);
      } else {
        const tcgdexCards = await getTCGDexCards(currentPage, 20);
        // Convert TCGDex cards to PokemonCard format
        return {
          data: tcgdexCards.map((card: TCGDexCard) => ({
            id: card.id,
            name: card.name,
            supertype: "Pokémon",
            subtypes: [],
            hp: card.hp || "0",
            types: card.types || [],
            rarity: card.rarity || "",
            images: {
              small: card.variants?.normal || card.image,
              large: card.variants?.normal || card.image
            },
            set: {
              id: card.set.id,
              name: card.set.name,
              series: "",
              printedTotal: card.set.printedTotal || 0,
              total: card.set.total || 0,
              legalities: {},
              ptcgoCode: "",
              releaseDate: card.set.releaseDate || "",
              updatedAt: "",
              images: {
                symbol: card.set.symbol || "",
                logo: card.set.logo || ""
              }
            },
            number: card.localId || "",
            artist: card.illustrator || "",
            legalities: {
              standard: card.legal?.standard ? "Legal" : "Not Legal",
              expanded: card.legal?.expanded ? "Legal" : "Not Legal",
              unlimited: card.legal?.unlimited ? "Legal" : "Not Legal"
            }
          })),
          page: currentPage,
          pageSize: 20,
          count: tcgdexCards.length,
          totalCount: 100 // TCGDex doesn't provide a total count
        };
      }
    },
  });

  const handleCloseDetail = () => {
    setSelectedCard(null);
  };

  const mapToPokemonCardItems = (cards: PokemonCard[] = []): CardItemProps[] => {
    return cards.map(card => ({
      id: card.id,
      name: card.name,
      imageUrl: card.images.small,
      rarity: card.rarity || "Unknown",
      condition: "Near Mint",
      estimatedValue: card.tcgplayer?.prices?.holofoil?.market
        ? `$${card.tcgplayer.prices.holofoil.market.toFixed(2)}`
        : card.tcgplayer?.prices?.normal?.market
        ? `$${card.tcgplayer.prices.normal.market.toFixed(2)}`
        : "N/A"
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
          <h1 className="text-3xl font-bold mb-2">Pokémon Card Database</h1>
          <p className="text-muted-foreground">
            Browse and explore thousands of Pokémon cards from across all sets and generations.
            Use this data to help you value your collection and make fair trades.
          </p>
        </div>

        <div className="mb-4">
          <div className="flex items-center gap-4">
            <span className="text-sm font-medium">Data Source:</span>
            <Button 
              variant={dataSource === "pokemontcg" ? "default" : "outline"} 
              size="sm"
              onClick={() => setDataSource("pokemontcg")}
            >
              Pokemon TCG API
            </Button>
            <Button 
              variant={dataSource === "tcgdex" ? "default" : "outline"} 
              size="sm"
              onClick={() => setDataSource("tcgdex")}
            >
              TCGDex API
            </Button>
          </div>
        </div>

        <Tabs defaultValue="browse" className="space-y-6">
          <TabsList className="mb-6">
            <TabsTrigger value="browse">
              <Database className="h-4 w-4 mr-2" />
              Browse Cards
            </TabsTrigger>
            <TabsTrigger value="search">
              <Search className="h-4 w-4 mr-2" />
              Search
            </TabsTrigger>
            {selectedCard && (
              <TabsTrigger value="detail">
                <Info className="h-4 w-4 mr-2" />
                Card Details
              </TabsTrigger>
            )}
          </TabsList>

          <TabsContent value="browse" className="space-y-6">
            {isLoading ? (
              <div className="text-center py-12">
                <div className="animate-pulse text-xl">Loading cards...</div>
              </div>
            ) : isError ? (
              <GlassCard variant="dark" className="p-6 text-center">
                <h3 className="text-xl font-medium mb-2">Failed to load cards</h3>
                <p className="text-muted-foreground mb-4">
                  There was an error loading the Pokémon card database.
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
          </TabsContent>

          <TabsContent value="search">
            <GlassCard className="p-6">
              <PokemonCardSearch onSelect={(card) => {
                setSelectedCard(card);
                // Automatically switch to detail tab when a card is selected
                const tabsElement = document.querySelector('[data-radix-ui-tabs-trigger][value="detail"]') as HTMLElement;
                if (tabsElement) {
                  tabsElement.click();
                }
              }} />
            </GlassCard>
          </TabsContent>

          <TabsContent value="detail">
            {selectedCard && (
              <div className="space-y-4">
                <div className="flex justify-between items-center">
                  <h2 className="text-2xl font-bold">{selectedCard.name}</h2>
                  <Button variant="ghost" size="icon" onClick={handleCloseDetail}>
                    <X className="h-5 w-5" />
                  </Button>
                </div>
                <PokemonCardDetail card={selectedCard} />
              </div>
            )}
          </TabsContent>
        </Tabs>
      </div>

      <Footer />
    </div>
  );
};

export default PokemonCards;
