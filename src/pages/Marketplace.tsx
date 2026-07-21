import React, { useState } from "react";
import { useNavigate } from "react-router-dom";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import Navbar from "@/components/layout/Navbar";
import Footer from "@/components/layout/Footer";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import GlassCard from "@/components/ui/custom/GlassCard";
import { useToast } from "@/hooks/use-toast";
import TradeListing from "@/components/marketplace/TradeListing";
import { 
  Plus, 
  Search, 
  Filter,
  Star, 
  Clock, 
  TrendingUp,
  Heart,
  Check,
  ArrowRightLeft,
  ShoppingBag,
  PackageOpen
} from "lucide-react";
import { Input } from "@/components/ui/input";
import { CardItemProps } from "@/components/cards/CardItem";
import { useUser } from "@/hooks/useUser";
import { PokemonCard } from "@/services/pokemonTcgApi";
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
  const [isCreateListingOpen, setCreateListingOpen] = useState(false);
  const [isTradeModalOpen, setTradeModalOpen] = useState(false);
  const [selectedListing, setSelectedListing] = useState<string | null>(null);
  const queryClient = useQueryClient();

  const { data: dbListings = [], isLoading, error: listingsError } = useQuery({
    queryKey: ['marketplace_listings'],
    queryFn: async () => {
      const { data: rows, error } = await supabase
        .from('marketplace_listings')
        .select('*')
        .eq('status', 'active')
        .order('created_at', { ascending: false })
        .limit(50);
      if (error) throw error;
      const list = rows || [];
      const ownerIds = Array.from(new Set(list.map((r: any) => r.user_id).filter(Boolean)));
      let profileMap = new Map<string, any>();
      if (ownerIds.length) {
        const { data: profiles } = await supabase
          .from('profiles')
          .select('user_id, display_name, username')
          .in('user_id', ownerIds);
        profileMap = new Map((profiles || []).map((p: any) => [p.user_id, p]));
      }
      return list.map((r: any) => ({ ...r, _profile: profileMap.get(r.user_id) }));
    },
  });

  const listings: ListingType[] = dbListings.map((row: any) => ({
    id: row.id,
    userId: row.user_id,
    username: row._profile?.display_name || row._profile?.username || 'Anonymous',
    cardOffered: {
      id: row.card_id,
      name: row.card_name,
      imageUrl: row.image_url || '',
      rarity: row.rarity || 'Unknown',
      condition: row.condition,
      estimatedValue: '',
    },
    cardsWanted: row.trade_preferences ? [row.trade_preferences] : [],
    description: row.description || '',
    createdAt: new Date(row.created_at),
    featured: row.featured,
  }));
  const [searchQuery, setSearchQuery] = useState("");
  const [activeCategory, setActiveCategory] = useState<'featured' | 'recent' | 'trending'>('recent');
  const [selectedConditions, setSelectedConditions] = useState<string[]>([]);
  const [sortOrder, setSortOrder] = useState<string>("newest");
  const { toast } = useToast();
  const { user } = useUser();
  const navigate = useNavigate();

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
          (activeCategory === 'recent') ||
          (activeCategory === 'trending');

        const matchesCondition = selectedConditions.length === 0 ||
          selectedConditions.includes(listing.cardOffered.condition);

        return matchesSearch && matchesCategory && matchesCondition;
      })
      .sort((a, b) => {
        switch (sortOrder) {
          case "oldest":
            return new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime();
          case "newest":
          default:
            return new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime();
        }
      });
  }, [listings, searchQuery, activeCategory, selectedConditions, sortOrder]);


  const toggleConditionFilter = (condition: string) => {
    setSelectedConditions(prev => 
      prev.includes(condition) 
        ? prev.filter(c => c !== condition) 
        : [...prev, condition]
    );
  };

  const handleProposeTrade = (listingId: string) => {
    // Navigate to the trades page with the listing pre-selected
    navigate(`/trades?propose=true&listingId=${listingId}`);
  };

  const handleViewCard = (cardId: string) => {
    navigate(`/card/${cardId}`);
  };

  return (
    <div className="min-h-screen flex flex-col bg-gradient-to-b from-background to-background/95">
      <Navbar />

      <main className="container py-8 flex-1">
        <div className="mb-8 flex justify-between items-start">
          <div>
            <div className="flex items-center gap-2">
              <ArrowRightLeft className="h-6 w-6 text-primary" />
              <h1 className="text-3xl font-bold">Trading Marketplace</h1>
            </div>
            <p className="text-muted-foreground mt-2">
              Browse cards offered for trade, propose deals, or list your own cards for trade
            </p>
          </div>
          <Button className="hidden md:flex" onClick={() => setCreateListingOpen(true)}>
            <Plus className="h-4 w-4 mr-2" />
            Create Listing
          </Button>
        </div>

        <div className="flex flex-col md:flex-row justify-between gap-4 mb-6">
          <div className="relative flex-1 max-w-md">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              type="text"
              placeholder="Search for cards, traders, or descriptions..."
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

            <Button className="md:hidden" onClick={() => setCreateListingOpen(true)}>
              <Plus className="h-4 w-4 mr-2" />
              Create
            </Button>
          </div>
        </div>

        <div className="border rounded-lg p-1 bg-background/50 mb-6 overflow-hidden">
          <div className="flex space-x-2 items-center overflow-x-auto scrollbar-hide pb-1">
            <button
              className={`py-2 px-4 rounded-md font-medium flex items-center gap-1.5 transition-colors shrink-0 ${activeCategory === 'featured' ? 'bg-primary text-primary-foreground' : 'text-muted-foreground hover:bg-muted'}`}
              onClick={() => setActiveCategory('featured')}
            >
              <Star className="h-4 w-4" />
              <span>Featured</span>
            </button>
            <button
              className={`py-2 px-4 rounded-md font-medium flex items-center gap-1.5 transition-colors shrink-0 ${activeCategory === 'recent' ? 'bg-primary text-primary-foreground' : 'text-muted-foreground hover:bg-muted'}`}
              onClick={() => setActiveCategory('recent')}
            >
              <Clock className="h-4 w-4" />
              <span>New Listings</span>
            </button>
            <button
              className={`py-2 px-4 rounded-md font-medium flex items-center gap-1.5 transition-colors shrink-0 ${activeCategory === 'trending' ? 'bg-primary text-primary-foreground' : 'text-muted-foreground hover:bg-muted'}`}
              onClick={() => setActiveCategory('trending')}
            >
              <TrendingUp className="h-4 w-4" />
              <span>Hot Trades</span>
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
            <PackageOpen className="h-12 w-12 mx-auto mb-4 text-muted-foreground" />
            <h3 className="text-xl font-medium mb-2">
              {listings.length === 0 ? "No trade listings yet" : "No trade listings match your criteria"}
            </h3>
            <p className="text-muted-foreground mb-4">
              {listings.length === 0 
                ? "Be the first to create a listing and start the trading community!"
                : "Try adjusting your filters or create your own listing to start trading!"
              }
            </p>
            <Button onClick={() => setCreateListingOpen(true)}>
              <Plus className="h-4 w-4 mr-2" />
              Create First Listing
            </Button>
          </GlassCard>
        )}

        <div className="fixed bottom-6 right-6 md:hidden">
          <Button size="lg" className="h-14 w-14 rounded-full shadow-lg" onClick={() => setCreateListingOpen(true)}>
            <Plus className="h-6 w-6" />
          </Button>
        </div>

        {isCreateListingOpen && (
          <CreateListingModal
            isOpen={isCreateListingOpen}
            onClose={() => setCreateListingOpen(false)}
            selectedCard={null}
            onListingCreated={() => {
              queryClient.invalidateQueries({ queryKey: ['marketplace_listings'] });
              toast({ title: "Listing created", description: "Your listing has been added to the marketplace" });
            }}
          />
        )}

      </main>

      <Footer />
    </div>
  );
};

export default Marketplace;
