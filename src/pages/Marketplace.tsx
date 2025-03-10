
import React, { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { getCards, PokemonCard } from "@/services/pokemonTcgApi";
import Navbar from "@/components/layout/Navbar";
import Footer from "@/components/layout/Footer";
import CardGrid from "@/components/cards/CardGrid";
import PokemonCardSearch from "@/components/pokemon/PokemonCardSearch";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import GlassCard from "@/components/ui/custom/GlassCard";
import { useToast } from "@/hooks/use-toast";
import TradeProposalForm from "@/components/marketplace/TradeProposalForm";
import TradeListing from "@/components/marketplace/TradeListing";
import { Plus, Search, Filter, ListFilter, LayoutGrid } from "lucide-react";
import { Input } from "@/components/ui/input";
import { CardItemProps } from "@/components/cards/CardItem";
import { Link } from "react-router-dom";
import { useUser } from "@/hooks/useUser";
import CreateListingModal from "@/components/marketplace/CreateListingModal";

const Marketplace = () => {
  const [currentPage, setCurrentPage] = useState(1);
  const [searchQuery, setSearchQuery] = useState("");
  const [isCreateListingOpen, setCreateListingOpen] = useState(false);
  const [selectedCard, setSelectedCard] = useState<PokemonCard | null>(null);
  const { toast } = useToast();
  const { user } = useUser();

  // Mock trade listings for now
  const [listings, setListings] = useState([
    {
      id: "listing-1",
      userId: "user-1",
      username: "PokeMaster99",
      cardOffered: {
        id: "sm9-60",
        name: "Charizard GX",
        imageUrl: "https://images.pokemontcg.io/sm9/60.png",
        rarity: "Ultra Rare",
        condition: "Near Mint",
        estimatedValue: "$120"
      },
      cardsWanted: ["Blastoise", "Venusaur GX", "Mew"],
      description: "Looking to trade my Charizard GX for any of the cards listed. Prefer Near Mint condition only.",
      createdAt: new Date(Date.now() - 2 * 24 * 60 * 60 * 1000)
    },
    {
      id: "listing-2",
      userId: "user-2",
      username: "PikachuFan22",
      cardOffered: {
        id: "swsh4-25",
        name: "Pikachu V",
        imageUrl: "https://images.pokemontcg.io/swsh4/25.png",
        rarity: "Rare",
        condition: "Excellent",
        estimatedValue: "$15"
      },
      cardsWanted: ["Raichu", "Alolan Raichu", "Pikachu GX"],
      description: "Trading my Pikachu V for other Pikachu evolution line cards.",
      createdAt: new Date(Date.now() - 5 * 24 * 60 * 60 * 1000)
    },
    {
      id: "listing-3",
      userId: "user-3",
      username: "CardCollector44",
      cardOffered: {
        id: "swsh12-179",
        name: "Mewtwo V",
        imageUrl: "https://images.pokemontcg.io/swsh12/179.png",
        rarity: "Ultra Rare",
        condition: "Mint",
        estimatedValue: "$35"
      },
      cardsWanted: ["Any Legendary Pokémon cards", "Rayquaza V", "Lugia V"],
      description: "Looking to trade my mint condition Mewtwo V for other Legendary Pokémon cards.",
      createdAt: new Date(Date.now() - 1 * 24 * 60 * 60 * 1000)
    }
  ]);

  // Get latest cards for marketplace browsing
  const { data, isLoading, isError } = useQuery({
    queryKey: ['marketplace-cards', currentPage, searchQuery],
    queryFn: async () => {
      return await getCards(currentPage, 20, searchQuery);
    },
  });

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

  const createNewListing = (cardOffered: PokemonCard, cardsWanted: string[], description: string) => {
    const newListing = {
      id: `listing-${Date.now()}`,
      userId: user.id,
      username: user.username,
      cardOffered: {
        id: cardOffered.id,
        name: cardOffered.name,
        imageUrl: cardOffered.images.small,
        rarity: cardOffered.rarity || "Unknown",
        condition: "Near Mint", // Would come from form in real app
        estimatedValue: cardOffered.tcgplayer?.prices?.holofoil?.market
          ? `$${cardOffered.tcgplayer.prices.holofoil.market.toFixed(2)}`
          : cardOffered.tcgplayer?.prices?.normal?.market
          ? `$${cardOffered.tcgplayer.prices.normal.market.toFixed(2)}`
          : "N/A"
      },
      cardsWanted,
      description,
      createdAt: new Date()
    };

    setListings(prev => [newListing, ...prev]);
    setCreateListingOpen(false);
    
    toast({
      title: "Listing created!",
      description: "Your card is now listed for trade.",
    });
  };

  const handleCardSelect = (card: PokemonCard) => {
    setSelectedCard(card);
    setCreateListingOpen(true);
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

      <main className="container py-8 flex-1">
        <div className="mb-8">
          <h1 className="text-3xl font-bold mb-2">Pokémon Card Marketplace</h1>
          <p className="text-muted-foreground">
            Browse trade listings, propose trades, or list your own cards for trade
          </p>
        </div>

        <Tabs defaultValue="listings" className="space-y-6">
          <TabsList className="mb-6">
            <TabsTrigger value="listings">
              <LayoutGrid className="h-4 w-4 mr-2" />
              Trade Listings
            </TabsTrigger>
            <TabsTrigger value="search">
              <Search className="h-4 w-4 mr-2" />
              Search Cards
            </TabsTrigger>
          </TabsList>

          <TabsContent value="listings" className="space-y-6">
            <div className="flex justify-between mb-6">
              <div className="relative flex-1 max-w-md">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input
                  type="text"
                  placeholder="Filter listings..."
                  className="pl-9"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                />
              </div>
              <Button onClick={() => setCreateListingOpen(true)}>
                <Plus className="h-4 w-4 mr-2" />
                Create Listing
              </Button>
            </div>

            {listings.length > 0 ? (
              <div className="grid gap-6 grid-cols-1 lg:grid-cols-2">
                {listings.map(listing => (
                  <TradeListing 
                    key={listing.id}
                    listing={listing}
                    onProposeTrade={() => {
                      // Would open trade proposal form in real app
                      toast({
                        title: "Coming soon!",
                        description: "Trade proposal functionality is coming soon.",
                      });
                    }}
                  />
                ))}
              </div>
            ) : (
              <GlassCard className="p-8 text-center">
                <h3 className="text-xl font-medium mb-2">No trade listings available</h3>
                <p className="text-muted-foreground mb-4">
                  Be the first to create a trade listing!
                </p>
                <Button onClick={() => setCreateListingOpen(true)}>
                  <Plus className="h-4 w-4 mr-2" />
                  Create Listing
                </Button>
              </GlassCard>
            )}
          </TabsContent>

          <TabsContent value="search" className="space-y-6">
            <GlassCard className="p-6 mb-6">
              <h3 className="text-lg font-semibold mb-4">Search for cards to trade</h3>
              <PokemonCardSearch onSelect={handleCardSelect} />
            </GlassCard>

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
                <div className="flex items-center justify-between mb-4">
                  <h3 className="text-lg font-semibold">Browse Available Cards</h3>
                  <Button variant="outline" size="sm">
                    <Filter className="h-4 w-4 mr-2" />
                    Filter
                  </Button>
                </div>

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
        </Tabs>

        {isCreateListingOpen && (
          <CreateListingModal 
            isOpen={isCreateListingOpen}
            onClose={() => setCreateListingOpen(false)}
            selectedCard={selectedCard}
            onCreateListing={createNewListing}
          />
        )}
      </main>

      <Footer />
    </div>
  );
};

export default Marketplace;
