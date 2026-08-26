import React, { useState, useEffect } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import Navbar from "@/components/layout/Navbar";
import Footer from "@/components/layout/Footer";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import GlassCard from "@/components/ui/custom/GlassCard";
import { useToast } from "@/hooks/use-toast";
import TradeListing from "@/components/marketplace/TradeListing";
import { useCardTypeMeta } from "@/hooks/useCardTypeMeta";
import { useCardPrices } from "@/hooks/useCardPrices";
import { useActiveStores } from "@/hooks/useActiveStores";
import {
  Plus,
  Search,
  Filter,
  Clock,
  TrendingUp,
  BadgeCheck,
  ArrowRightLeft,
  PackageOpen,
  Store
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
  interestedCount: number;
  viewsCount: number;
  listingType: 'trade' | 'sale';
  askingPrice?: number;
  currency: string;
  sellerTotalTrades: number;
  sellerReputationScore: number;
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
          .select('user_id, display_name, username, total_trades, reputation_score')
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
    interestedCount: row.interested_count || 0,
    viewsCount: row.views_count || 0,
    listingType: row.listing_type === 'sale' ? 'sale' : 'trade',
    askingPrice: row.asking_price != null ? Number(row.asking_price) : undefined,
    currency: row.currency || 'gbp',
    sellerTotalTrades: row._profile?.total_trades || 0,
    sellerReputationScore: Number(row._profile?.reputation_score || 0),
  }));
  const [searchQuery, setSearchQuery] = useState("");
  const [activeCategory, setActiveCategory] = useState<'recent' | 'trending' | 'stores' | 'sellers'>('recent');
  const [selectedConditions, setSelectedConditions] = useState<string[]>([]);
  const [sortOrder, setSortOrder] = useState<string>("newest");
  const { toast } = useToast();
  const { user } = useUser();
  const navigate = useNavigate();
  const [searchParams, setSearchParams] = useSearchParams();

  useEffect(() => {
    if (searchParams.get('checkout') === 'cancelled') {
      toast({
        title: "Checkout cancelled",
        description: "No payment was taken. The listing is available again.",
      });
      queryClient.invalidateQueries({ queryKey: ['marketplace_listings'] });
      setSearchParams((prev) => {
        prev.delete('checkout');
        return prev;
      }, { replace: true });
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [searchParams]);

  const storeMap = useActiveStores(listings.map((l) => l.userId));
  const storeSellerIds = React.useMemo(() => new Set(storeMap.keys()), [storeMap]);

  const filteredListings = React.useMemo(() => {
    return listings
      .filter(listing => {
        const matchesSearch = searchQuery === "" ||
          listing.cardOffered.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
          listing.description.toLowerCase().includes(searchQuery.toLowerCase()) ||
          listing.username.toLowerCase().includes(searchQuery.toLowerCase()) ||
          listing.cardsWanted.some(card => card.toLowerCase().includes(searchQuery.toLowerCase()));

        const matchesCategory =
          activeCategory === 'recent' ||
          activeCategory === 'sellers' ||
          (activeCategory === 'stores' && storeSellerIds.has(listing.userId)) ||
          (activeCategory === 'trending' && (listing.interestedCount > 0 || listing.viewsCount > 0));

        const matchesCondition = selectedConditions.length === 0 ||
          selectedConditions.includes(listing.cardOffered.condition);

        return matchesSearch && matchesCategory && matchesCondition;
      })
      .sort((a, b) => {
        if (activeCategory === 'trending') {
          const engagementDiff = (b.interestedCount + b.viewsCount) - (a.interestedCount + a.viewsCount);
          if (engagementDiff !== 0) return engagementDiff;
        }
        switch (sortOrder) {
          case "oldest":
            return new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime();
          case "newest":
          default:
            return new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime();
        }
      });
  }, [listings, searchQuery, activeCategory, selectedConditions, sortOrder, storeSellerIds]);


  const sellerGroups = React.useMemo(() => {
    const groups = new Map<string, { userId: string; username: string; listings: ListingType[] }>();
    for (const listing of filteredListings) {
      const existing = groups.get(listing.userId);
      if (existing) {
        existing.listings.push(listing);
      } else {
        groups.set(listing.userId, { userId: listing.userId, username: listing.username, listings: [listing] });
      }
    }
    return Array.from(groups.values()).sort((a, b) => b.listings.length - a.listings.length);
  }, [filteredListings]);

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

      <main className="relative container flex-1 pb-16 pt-24">
        <div className="aura pointer-events-none absolute left-1/2 top-8 h-[380px] w-[760px] -translate-x-1/2" aria-hidden />

        <div className="anim-rise mb-8 flex items-end justify-between gap-4">
          <div>
            <div className="mb-3 flex items-center gap-2 text-xs font-semibold uppercase tracking-[0.1em] text-primary">
              <ArrowRightLeft className="h-3.5 w-3.5" />
              Marketplace
            </div>
            <h1 className="font-display text-4xl font-extrabold leading-[1.02] md:text-[46px]">
              Trade &amp; buy singles
            </h1>
            <p className="mt-3 max-w-lg text-sm leading-relaxed text-muted-foreground">
              Browse cards offered by collectors. Propose a card-for-card swap, buy outright, or list your own.
            </p>
          </div>
          <Button
            className="hidden shrink-0 rounded-full px-5 shadow-[0_12px_30px_-12px_hsl(var(--primary)/0.65)] md:flex"
            onClick={() => setCreateListingOpen(true)}
          >
            <Plus className="mr-2 h-4 w-4" />
            Create listing
          </Button>
        </div>

        <div className="anim-rise mb-6 flex flex-col justify-between gap-4 md:flex-row" style={{ animationDelay: '80ms' }}>
          <div className="relative max-w-md flex-1">
            <Search className="absolute left-4 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
            <Input
              type="text"
              placeholder="Search cards, sets, or traders"
              className="h-10 rounded-full pl-10"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
            />
          </div>
          <div className="flex gap-2">
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="outline" className="rounded-full">
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
              <SelectTrigger className="w-[170px] rounded-full">
                <SelectValue placeholder="Sort by..." />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="newest">Newest first</SelectItem>
                <SelectItem value="oldest">Oldest first</SelectItem>
              </SelectContent>
            </Select>

            <Button className="rounded-full md:hidden" onClick={() => setCreateListingOpen(true)}>
              <Plus className="h-4 w-4 mr-2" />
              Create
            </Button>
          </div>
        </div>

        <div className="anim-rise mb-6 w-max max-w-full overflow-x-auto scrollbar-hide rounded-full border border-white/5 bg-card p-1.5" style={{ animationDelay: '140ms' }}>
          <div className="flex items-center gap-1.5">
            {([
              { key: 'recent', label: 'New listings', icon: Clock },
              { key: 'trending', label: 'Hot trades', icon: TrendingUp },
              { key: 'stores', label: 'Stores', icon: BadgeCheck },
              { key: 'sellers', label: 'Browse sellers', icon: Store },
            ] as const).map(({ key, label, icon: Icon }) => (
              <button
                key={key}
                className={`flex shrink-0 items-center gap-2 rounded-full px-4 py-2 text-[13px] font-medium transition-colors ${
                  activeCategory === key
                    ? 'bg-primary text-primary-foreground'
                    : 'text-muted-foreground hover:bg-muted'
                }`}
                onClick={() => setActiveCategory(key)}
              >
                <Icon className="h-4 w-4" />
                {label}
              </button>
            ))}
          </div>
        </div>

        {listingsError ? (
          <GlassCard className="p-8 text-center">
            <PackageOpen className="h-12 w-12 mx-auto mb-4 text-destructive" />
            <h3 className="text-xl font-medium mb-2">Couldn't load listings</h3>
            <p className="text-muted-foreground mb-4">
              {(listingsError as any)?.message || "Please try again in a moment."}
            </p>
          </GlassCard>
        ) : activeCategory === 'sellers' ? (
          sellerGroups.length > 0 ? (
            <div className="grid gap-4 grid-cols-1 sm:grid-cols-2 lg:grid-cols-3">
              {sellerGroups.map(group => (
                <button
                  key={group.userId}
                  onClick={() => navigate(`/sellers/${group.userId}`)}
                  className="text-left"
                >
                  <GlassCard className="p-5 hover:border-primary transition-colors h-full">
                    <div className="flex items-center gap-3 mb-2">
                      <Store className="h-5 w-5 text-primary shrink-0" />
                      <h3 className="font-semibold truncate">{group.username}'s Stall</h3>
                    </div>
                    <p className="text-sm text-muted-foreground">
                      {group.listings.length} listing{group.listings.length === 1 ? "" : "s"}
                    </p>
                  </GlassCard>
                </button>
              ))}
            </div>
          ) : (
            <GlassCard className="p-8 text-center">
              <PackageOpen className="h-12 w-12 mx-auto mb-4 text-muted-foreground" />
              <h3 className="text-xl font-medium mb-2">No sellers yet</h3>
            </GlassCard>
          )
        ) : filteredListings.length > 0 ? (
          <ListingsGrid listings={filteredListings} onPropose={handleProposeTrade} />
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

/** Renders the listings grid; loads card type metadata + live prices for every visible card in one query each. */
const ListingsGrid = ({
  listings,
  onPropose,
}: {
  listings: ListingType[];
  onPropose: (id: string) => void;
}) => {
  const cardIds = listings.map((l) => l.cardOffered.id);
  const cardMeta = useCardTypeMeta(cardIds);
  const cardPrices = useCardPrices(cardIds);
  const stores = useActiveStores(listings.map((l) => l.userId));
  return (
    <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
      {listings.map((listing, i) => (
        <div key={listing.id} className="anim-rise" style={{ animationDelay: `${Math.min(i, 8) * 60 + 180}ms` }}>
          <TradeListing
            listing={listing}
            onProposeTrade={() => onPropose(listing.id)}
            featured={!!listing.featured}
            cardMeta={cardMeta.get(listing.cardOffered.id) ?? null}
            marketPriceGbp={cardPrices.get(listing.cardOffered.id) ?? null}
            store={stores.get(listing.userId) ?? null}
          />
        </div>
      ))}
    </div>
  );
};

export default Marketplace;
