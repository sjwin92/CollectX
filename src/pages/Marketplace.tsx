
import React, { useState, useEffect } from "react";
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

// Define the interface for listing objects with the 'featured' property
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

// Mock featured listings for demo purposes
const FEATURED_LISTINGS: ListingType[] = [
  {
    id: "featured-1",
    userId: "user-premium-1",
    username: "RarityHunter",
    cardOffered: {
      id: "base1-4",
      name: "Charizard Base Set",
      imageUrl: "https://images.pokemontcg.io/base1/4.png",
      rarity: "Holo Rare",
      condition: "Near Mint",
      estimatedValue: "$500"
    },
    cardsWanted: ["Blastoise Base Set", "Venusaur Base Set", "Shadowless Raichu"],
    description: "Original 1999 Base Set Charizard in Near Mint condition. Looking for other Base Set holos or shadowless cards.",
    createdAt: new Date(Date.now() - 1 * 24 * 60 * 60 * 1000),
    featured: true
  },
  {
    id: "featured-2",
    userId: "user-premium-2",
    username: "VintageCollector",
    cardOffered: {
      id: "sm12-190",
      name: "Mewtwo & Mew GX (Rainbow)",
      imageUrl: "https://images.pokemontcg.io/sm12/190.png",
      rarity: "Ultra Rare",
      condition: "Mint",
      estimatedValue: "$120"
    },
    cardsWanted: ["Charizard & Reshiram GX", "Pikachu VMAX", "Rayquaza VMAX"],
    description: "Perfect condition Rainbow rare Mewtwo & Mew GX. Straight from pack to sleeve. Looking for other recent high-value cards.",
    createdAt: new Date(Date.now() - 3 * 24 * 60 * 60 * 1000),
    featured: true
  }
];

// Combined with the existing mock listings from your code
const INITIAL_LISTINGS: ListingType[] = [
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
  },
  // Additional listings for a better browsing experience
  {
    id: "listing-4",
    userId: "user-4",
    username: "VintageVibes",
    cardOffered: {
      id: "base2-4",
      name: "Blastoise",
      imageUrl: "https://images.pokemontcg.io/base2/4.png",
      rarity: "Holo Rare",
      condition: "Played",
      estimatedValue: "$75"
    },
    cardsWanted: ["Fossil Zapdos", "Jungle Jolteon", "Base Raichu"],
    description: "Original Base Set 2 Blastoise with some edge wear. Looking for similar era electrics.",
    createdAt: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000)
  },
  {
    id: "listing-5",
    userId: "user-5",
    username: "ModernCollector",
    cardOffered: {
      id: "swsh8-188",
      name: "Umbreon VMAX (Alternate Art)",
      imageUrl: "https://images.pokemontcg.io/swsh8/188.png",
      rarity: "Secret Rare",
      condition: "Mint",
      estimatedValue: "$280"
    },
    cardsWanted: ["Charizard VMAX (Rainbow)", "Rayquaza VMAX (Alt Art)", "Gengar VMAX (Alt Art)"],
    description: "PSA 9 worthy Umbreon VMAX Alt Art. Looking for other high-end modern cards in similar condition.",
    createdAt: new Date(Date.now() - 9 * 24 * 60 * 60 * 1000)
  }
];

const Marketplace = () => {
  const [currentPage, setCurrentPage] = useState(1);
  const [searchQuery, setSearchQuery] = useState("");
  const [isCreateListingOpen, setCreateListingOpen] = useState(false);
  const [selectedCard, setSelectedCard] = useState<PokemonCard | null>(null);
  const [listings, setListings] = useState<ListingType[]>([...FEATURED_LISTINGS, ...INITIAL_LISTINGS]);
  const [activeCategory, setActiveCategory] = useState<'featured' | 'recent' | 'trending'>('featured');
  const [selectedConditions, setSelectedConditions] = useState<string[]>([]);
  const [priceRange, setPriceRange] = useState<string>("all");
  const [sortOrder, setSortOrder] = useState<string>("newest");
  const { toast } = useToast();
  const { user } = useUser();

  // Filter listings based on search query, category, conditions, etc.
  const filteredListings = React.useMemo(() => {
    return listings
      .filter(listing => {
        // Search query filter
        const matchesSearch = searchQuery === "" || 
          listing.cardOffered.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
          listing.description.toLowerCase().includes(searchQuery.toLowerCase()) ||
          listing.username.toLowerCase().includes(searchQuery.toLowerCase()) ||
          listing.cardsWanted.some(card => card.toLowerCase().includes(searchQuery.toLowerCase()));
        
        // Category filter
        const matchesCategory = 
          (activeCategory === 'featured' && listing.featured) ||
          (activeCategory === 'recent') ||
          (activeCategory === 'trending');
        
        // Condition filter
        const matchesCondition = selectedConditions.length === 0 || 
          selectedConditions.includes(listing.cardOffered.condition);
        
        // Price filter
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
        // Sort listings
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
    const newListing: ListingType = {
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

  const toggleConditionFilter = (condition: string) => {
    setSelectedConditions(prev => 
      prev.includes(condition) 
        ? prev.filter(c => c !== condition) 
        : [...prev, condition]
    );
  };

  const handleProposeTrade = (listingId: string) => {
    // In a real app, this would open the trade proposal form
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
            {/* Top Action Bar */}
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

            {/* Category tabs for Featured, Recent, Trending */}
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
