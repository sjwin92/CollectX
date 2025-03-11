import React, { useState, useEffect } from "react";
import { useQuery } from "@tanstack/react-query";
import { getCards, PokemonCard, getReliableImageUrl, mapToTradeCard } from "@/services/pokemonTcgApi";
import { findWorkingImageUrl } from "@/services/cardImageService";
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
import { 
  Plus, 
  Search, 
  Filter, 
  ListFilter, 
  LayoutGrid, 
  Star, 
  Clock, 
  TrendingUp,
  Tag,
  Sparkles,
  Heart,
  Check
} from "lucide-react";
import { Input } from "@/components/ui/input";
import { CardItemProps } from "@/components/cards/CardItem";
import { Link } from "react-router-dom";
import { useUser } from "@/hooks/useUser";
import CreateListingModal from "@/components/marketplace/CreateListingModal";
import { 
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuGroup,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger
} from "@/components/ui/dropdown-menu";
import { Badge } from "@/components/ui/badge";
import { Checkbox } from "@/components/ui/checkbox";
import { 
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue
} from "@/components/ui/select";
import { Label } from "@/components/ui/label";

interface ListingType {
  id: string;
  userId: string;
  username: string;
  cardOffered: CardItemProps;
  cardsWanted: string[];
  description: string;
  createdAt: Date;
  featured?: boolean;
}

const Marketplace = () => {
  const [currentPage, setCurrentPage] = useState(1);
  const [searchQuery, setSearchQuery] = useState("");
  const [isCreateListingOpen, setCreateListingOpen] = useState(false);
  const [selectedCard, setSelectedCard] = useState<PokemonCard | null>(null);
  const [listings, setListings] = useState<ListingType[]>([]);
  const [activeCategory, setActiveCategory] = useState<'featured' | 'recent' | 'trending'>('featured');
  const [selectedConditions, setSelectedConditions] = useState<string[]>([]);
  const [priceRange, setPriceRange] = useState<string>("all");
  const [sortOrder, setSortOrder] = useState<string>("newest");
  const { toast } = useToast();
  const { user } = useUser();

  const { data: featuredCardsData } = useQuery({
    queryKey: ['featured-cards'],
    queryFn: async () => {
      return await getCards(1, 4, 'rarity:"Ultra Rare" OR rarity:"Hyper Rare"');
    },
  });

  const { data: recentCardsData } = useQuery({
    queryKey: ['recent-cards'],
    queryFn: async () => {
      return await getCards(1, 8, 'set.releaseDate:>2023-01-01');
    },
  });

  const { data: trendingCardsData } = useQuery({
    queryKey: ['trending-cards'],
    queryFn: async () => {
      return await getCards(1, 8, 'name:"Charizard" OR name:"Pikachu" OR name:"Mewtwo" OR name:"Gengar" OR name:"Mew"');
    },
  });

  useEffect(() => {
    const generateListings = async () => {
      const newListings: ListingType[] = [];
      
      if (featuredCardsData?.data) {
        for (const card of featuredCardsData.data.slice(0, 4)) {
          const imageUrl = await findWorkingImageUrl(card.id);
          const cardValue = card.tcgplayer?.prices?.holofoil?.market || 
                          card.tcgplayer?.prices?.normal?.market || 
                          card.tcgplayer?.prices?.reverseHolofoil?.market || 100;
          
          newListings.push({
            id: `featured-${card.id}`,
            userId: `user-premium-${newListings.length}`,
            username: `RarityHunter${newListings.length + 1}`,
            cardOffered: {
              id: card.id,
              name: card.name,
              imageUrl: imageUrl,
              rarity: card.rarity || "Ultra Rare",
              condition: "Near Mint",
              estimatedValue: `$${cardValue.toFixed(2)}`
            },
            cardsWanted: [
              "Base Set Charizard", 
              "Shadowless Blastoise", 
              `${card.name} Alt Art`
            ],
            description: `Mint condition ${card.name}. Looking to trade for other rare cards of similar value.`,
            createdAt: new Date(Date.now() - (newListings.length * 24 * 60 * 60 * 1000)),
            featured: true
          });
        }
      }
      
      if (recentCardsData?.data) {
        for (const card of recentCardsData.data.slice(0, 8)) {
          const imageUrl = await findWorkingImageUrl(card.id);
          const cardValue = card.tcgplayer?.prices?.holofoil?.market || 
                          card.tcgplayer?.prices?.normal?.market || 
                          card.tcgplayer?.prices?.reverseHolofoil?.market || 25;
          
          newListings.push({
            id: `recent-${card.id}`,
            userId: `user-${100 + newListings.length}`,
            username: `NewSetCollector${newListings.length + 1}`,
            cardOffered: {
              id: card.id,
              name: card.name,
              imageUrl: imageUrl,
              rarity: card.rarity || "Rare",
              condition: ["Near Mint", "Excellent", "Good"][Math.floor(Math.random() * 3)],
              estimatedValue: `$${cardValue.toFixed(2)}`
            },
            cardsWanted: [
              "Any Ex or GX cards", 
              "Full Art Trainers",
              `${card.name} Alt Art`
            ],
            description: `Fresh pull from a ${card.set?.name} pack! Looking for cards from other recent sets.`,
            createdAt: new Date(Date.now() - (newListings.length * 12 * 60 * 60 * 1000)),
          });
        }
      }
      
      if (trendingCardsData?.data) {
        for (const card of trendingCardsData.data.slice(0, 8)) {
          const imageUrl = await findWorkingImageUrl(card.id);
          const cardValue = card.tcgplayer?.prices?.holofoil?.market || 
                          card.tcgplayer?.prices?.normal?.market || 
                          card.tcgplayer?.prices?.reverseHolofoil?.market || 50;
          
          newListings.push({
            id: `trending-${card.id}`,
            userId: `user-${200 + newListings.length}`,
            username: `TrendCollector${newListings.length + 1}`,
            cardOffered: {
              id: card.id,
              name: card.name,
              imageUrl: imageUrl,
              rarity: card.rarity || "Ultra Rare",
              condition: ["Near Mint", "Excellent"][Math.floor(Math.random() * 2)],
              estimatedValue: `$${cardValue.toFixed(2)}`
            },
            cardsWanted: [
              "Popular Pokémon Alt Arts", 
              "Eeveelution Cards",
              "Full Art Trainers"
            ],
            description: `Trending ${card.name} card for trade! Looking for other popular Pokémon cards.`,
            createdAt: new Date(Date.now() - (newListings.length * 36 * 60 * 60 * 1000)),
          });
        }
      }
      
      setListings(newListings);
    };
    
    generateListings();
  }, [featuredCardsData, recentCardsData, trendingCardsData]);

  const filteredListings = React.useMemo(() => {
    return listings
      .filter(listing => {
        const matchesSearch = searchQuery === "" || 
          listing.cardOffered.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
          listing.description.toLowerCase().includes(searchQuery.toLowerCase()) ||
          listing.username.toLowerCase().includes(searchQuery.toLowerCase()) ||
          listing.cardsWanted.some(card => card.toLowerCase().includes(searchQuery.toLowerCase()));
        
        const matchesCategory = 
          (activeCategory === 'featured' && listing.featured) ||
          (activeCategory === 'recent' && listing.id.startsWith('recent-')) ||
          (activeCategory === 'trending' && listing.id.startsWith('trending-'));
        
        const matchesCondition = selectedConditions.length === 0 || 
          selectedConditions.includes(listing.cardOffered.condition);
        
        let matchesPrice = true;
        if (priceRange !== "all") {
          const price = parseFloat(listing.cardOffered.estimatedValue.replace(/[^0-9.]/g, ''));
          switch (priceRange) {
            case "under-10":
              matchesPrice = price < 10;
              break;
            case "10-50":
              matchesPrice = price >= 10 && price <= 50;
              break;
            case "50-100":
              matchesPrice = price >= 50 && price <= 100;
              break;
            case "over-100":
              matchesPrice = price > 100;
              break;
          }
        }
        
        return matchesSearch && matchesCategory && matchesCondition && matchesPrice;
      })
      .sort((a, b) => {
        switch (sortOrder) {
          case "newest":
            return new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime();
          case "oldest":
            return new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime();
          case "price-high":
            return parseFloat(b.cardOffered.estimatedValue.replace(/[^0-9.]/g, '')) - 
                  parseFloat(a.cardOffered.estimatedValue.replace(/[^0-9.]/g, ''));
          case "price-low":
            return parseFloat(a.cardOffered.estimatedValue.replace(/[^0-9.]/g, '')) - 
                  parseFloat(b.cardOffered.estimatedValue.replace(/[^0-9.]/g, ''));
          default:
            return 0;
        }
      });
  }, [listings, searchQuery, activeCategory, selectedConditions, priceRange, sortOrder]);

  const { data, isLoading, isError } = useQuery({
    queryKey: ['marketplace-cards', currentPage, searchQuery],
    queryFn: async () => {
      return await getCards(currentPage, 20, searchQuery);
    },
  });

  const mapToPokemonCardItems = async (cards: PokemonCard[] = []): Promise<CardItemProps[]> => {
    const mappedCards = await Promise.all(cards.map(async card => ({
      id: card.id,
      name: card.name,
      imageUrl: await findWorkingImageUrl(card.id),
      rarity: card.rarity || "Unknown",
      condition: "Near Mint",
      estimatedValue: card.tcgplayer?.prices?.holofoil?.market
        ? `$${card.tcgplayer.prices.holofoil.market.toFixed(2)}`
        : card.tcgplayer?.prices?.normal?.market
        ? `$${card.tcgplayer.prices.normal.market.toFixed(2)}`
        : "N/A"
    })));
    
    return mappedCards;
  };

  const createNewListing = async (cardOffered: PokemonCard, cardsWanted: string[], description: string) => {
    const imageUrl = await findWorkingImageUrl(cardOffered.id);
    const newListing: ListingType = {
      id: `listing-${Date.now()}`,
      userId: user.id,
      username: user.username,
      cardOffered: {
        id: cardOffered.id,
        name: cardOffered.name,
        imageUrl: imageUrl,
        rarity: cardOffered.rarity || "Unknown",
        condition: "Near Mint",
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

  const toggleConditionFilter = (condition: string) => {
    setSelectedConditions(prev => 
      prev.includes(condition) 
        ? prev.filter(c => c !== condition) 
        : [...prev, condition]
    );
  };

  const handleProposeTrade = (listingId: string) => {
    toast({
      title: "Coming soon!",
      description: "Trade proposal functionality is coming soon.",
    });
  };

  return (
    <div className="min-h-screen flex flex-col bg-gradient-to-b from-background to-background/95">
      <Navbar />

      <main className="container py-8 flex-1">
        <div className="mb-8">
          <h1 className="text-3xl font-bold mb-2">Pokémon Card Marketplace</h1>
          <p className="text-muted-foreground">
            Browse trade listings, propose trades, or list your own cards for trade with our secure escrow system
          </p>
        </div>

        <Tabs defaultValue="browse" className="space-y-6">
          <TabsList className="mb-6">
            <TabsTrigger value="browse">
              <LayoutGrid className="h-4 w-4 mr-2" />
              Browse Listings
            </TabsTrigger>
            <TabsTrigger value="search">
              <Search className="h-4 w-4 mr-2" />
              Search Cards
            </TabsTrigger>
            <TabsTrigger value="my-wishlist">
              <Heart className="h-4 w-4 mr-2" />
              My Wishlist
            </TabsTrigger>
          </TabsList>

          <TabsContent value="browse" className="space-y-6">
            <div className="flex flex-col md:flex-row justify-between gap-4 mb-6">
              <div className="relative flex-1 max-w-md">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input
                  type="text"
                  placeholder="Search listings by card name, description, or username..."
                  className="pl-9"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                />
              </div>
              <div className="flex gap-2">
                <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                    <Button variant="outline">
                      <Filter className="h-4 w-4 mr-2" />
                      Filters
                    </Button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent className="w-56">
                    <DropdownMenuLabel>Filter by Condition</DropdownMenuLabel>
                    <DropdownMenuSeparator />
                    <DropdownMenuGroup>
                      {["Mint", "Near Mint", "Excellent", "Good", "Played", "Poor"].map((condition) => (
                        <DropdownMenuItem key={condition} className="flex items-center gap-2">
                          <Checkbox 
                            id={`condition-${condition}`} 
                            checked={selectedConditions.includes(condition)}
                            onCheckedChange={() => toggleConditionFilter(condition)}
                          />
                          <Label htmlFor={`condition-${condition}`}>{condition}</Label>
                        </DropdownMenuItem>
                      ))}
                    </DropdownMenuGroup>
                    <DropdownMenuSeparator />
                    <DropdownMenuLabel>Price Range</DropdownMenuLabel>
                    <DropdownMenuGroup>
                      {[
                        {id: "all", label: "All Prices"},
                        {id: "under-10", label: "Under $10"},
                        {id: "10-50", label: "$10 - $50"},
                        {id: "50-100", label: "$50 - $100"},
                        {id: "over-100", label: "Over $100"}
                      ].map((range) => (
                        <DropdownMenuItem 
                          key={range.id} 
                          className="flex items-center gap-2"
                          onClick={() => setPriceRange(range.id)}
                        >
                          <div className="w-4 h-4 flex items-center justify-center">
                            {priceRange === range.id && <Check className="h-3 w-3" />}
                          </div>
                          <span>{range.label}</span>
                        </DropdownMenuItem>
                      ))}
                    </DropdownMenuGroup>
                  </DropdownMenuContent>
                </DropdownMenu>

                <Select
                  value={sortOrder}
                  onValueChange={(value) => setSortOrder(value)}
                >
                  <SelectTrigger className="w-[180px]">
                    <SelectValue placeholder="Sort by..." />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="newest">Newest First</SelectItem>
                    <SelectItem value="oldest">Oldest First</SelectItem>
                    <SelectItem value="price-high">Price: High to Low</SelectItem>
                    <SelectItem value="price-low">Price: Low to High</SelectItem>
                  </SelectContent>
                </Select>

                <Button onClick={() => setCreateListingOpen(true)}>
                  <Plus className="h-4 w-4 mr-2" />
                  Create Listing
                </Button>
              </div>
            </div>

            <div className="border-b mb-6">
              <div className="flex space-x-6">
                <button
                  className={`pb-2 font-medium flex items-center gap-1 ${activeCategory === 'featured' ? 'border-b-2 border-primary text-primary' : 'text-muted-foreground'}`}
                  onClick={() => setActiveCategory('featured')}
                >
                  <Sparkles className="h-4 w-4" />
                  <span>Featured Listings</span>
                </button>
                <button
                  className={`pb-2 font-medium flex items-center gap-1 ${activeCategory === 'recent' ? 'border-b-2 border-primary text-primary' : 'text-muted-foreground'}`}
                  onClick={() => setActiveCategory('recent')}
                >
                  <Clock className="h-4 w-4" />
                  <span>Recent Trades</span>
                </button>
                <button
                  className={`pb-2 font-medium flex items-center gap-1 ${activeCategory === 'trending' ? 'border-b-2 border-primary text-primary' : 'text-muted-foreground'}`}
                  onClick={() => setActiveCategory('trending')}
                >
                  <TrendingUp className="h-4 w-4" />
                  <span>Trending Cards</span>
                </button>
              </div>
            </div>

            {filteredListings.length > 0 ? (
              <div className="grid gap-6 grid-cols-1 lg:grid-cols-2">
                {filteredListings.map(listing => (
                  <TradeListing 
                    key={listing.id}
                    listing={listing}
                    onProposeTrade={() => handleProposeTrade(listing.id)}
                    featured={!!listing.featured}
                  />
                ))}
              </div>
            ) : (
              <GlassCard className="p-8 text-center">
                <h3 className="text-xl font-medium mb-2">No trade listings match your criteria</h3>
                <p className="text-muted-foreground mb-4">
                  Try adjusting your filters or create your own listing!
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
                <div className="h-12 w-12 animate-spin rounded-full border-4 border-primary border-t-transparent mx-auto"></div>
                <p className="mt-4 text-lg font-medium">Loading cards...</p>
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
                    onClick={() => setCurrentPage(prev => Math.max(prev - 1, 1))}
                    disabled={currentPage <= 1}
                  >
                    Previous Page
                  </Button>
                  <span className="text-muted-foreground">
                    Page {currentPage} of {Math.ceil((data?.totalCount || 0) / 20) || 1}
                  </span>
                  <Button
                    variant="outline"
                    onClick={() => setCurrentPage(prev => prev + 1)}
                    disabled={!data || currentPage >= Math.ceil(data.totalCount / 20)}
                  >
                    Next Page
                  </Button>
                </div>
              </>
            )}
          </TabsContent>

          <TabsContent value="my-wishlist" className="space-y-6">
            <GlassCard className="p-8 text-center">
              <h3 className="text-xl font-medium mb-2">Your Wishlist</h3>
              <p className="text-muted-foreground mb-6">
                Add cards to your wishlist to keep track of cards you're looking for.
                Other traders can see your wishlist and propose trades directly.
              </p>
              <div className="flex justify-center">
                <Button onClick={() => setCreateListingOpen(true)}>
                  <Plus className="h-4 w-4 mr-2" />
                  Add Cards to Wishlist
                </Button>
              </div>
            </GlassCard>
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
