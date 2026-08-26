
import React, { useState, useEffect } from "react";
import Navbar from "@/components/layout/Navbar";
import Footer from "@/components/layout/Footer";
import GlassCard from "@/components/ui/custom/GlassCard";
import TraderTrustBadge from "@/components/common/TraderTrustBadge";
import { getTierProgress } from "@/lib/traderTrust";
import { Button } from "@/components/ui/button";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import CardGrid from "@/components/cards/CardGrid";
import { CardItemProps } from "@/components/cards/CardItem";
import { Input } from "@/components/ui/input";
import { 
  Tabs, 
  TabsContent, 
  TabsList, 
  TabsTrigger 
} from "@/components/ui/tabs";
import { useUser } from "@/hooks/useUser";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";
import UserDashboard from "@/components/analytics/UserDashboard";
import { getSellerStripeStatus, startSellerOnboarding, type SellerStripeStatus } from "@/services/supabaseMarketplaceService";
import { 
  Star, 
  Mail, 
  MapPin, 
  Calendar, 
  Package, 
  ArrowLeftRight, 
  ShieldCheck,
  Award,
  Settings,
  ListChecks,
  Plus,
  Search
} from "lucide-react";

// Empty user data for fresh spawn
const userData = {
  name: "New User",
  username: "newuser", 
  joined: "Just now",
  location: "",
  reputation: "new" as const,
  bio: "",
  stats: {
    trades: 0,
    collectionSize: 0,
    reputationScore: 0,
    reviewCount: 0
  },
  badges: []
};

const Profile = () => {
  const { user, profile } = useUser();
  const { toast } = useToast();
  const [searchQuery, setSearchQuery] = useState("");
  const [userCollection, setUserCollection] = useState<CardItemProps[]>([]);
  const [filteredCards, setFilteredCards] = useState<CardItemProps[]>([]);
  const [sellerStatus, setSellerStatus] = useState<SellerStripeStatus | null>(null);
  const [isConnectingPayouts, setIsConnectingPayouts] = useState(false);

  useEffect(() => {
    if (!user) return;
    getSellerStripeStatus().then(setSellerStatus).catch(() => setSellerStatus(null));
  }, [user]);

  const handleConnectPayouts = async () => {
    setIsConnectingPayouts(true);
    try {
      const url = await startSellerOnboarding();
      window.location.href = url;
    } catch (error) {
      setIsConnectingPayouts(false);
      toast({
        title: "Couldn't start payout setup",
        description: error instanceof Error ? error.message : "Please try again in a moment.",
        variant: "destructive",
      });
    }
  };

  useEffect(() => {
    if (!user) return;
    supabase
      .from('user_cards')
      .select('*')
      .eq('user_id', user.id)
      .eq('product_type', 'single')
      .then(({ data }) => {
        if (!data) return;
        const cards: CardItemProps[] = data.map(c => ({
          id: c.card_id,
          name: c.card_name || 'Unknown Card',
          imageUrl: c.card_image || '',
          rarity: c.rarity || 'Unknown',
          condition: c.condition || 'Near Mint',
          estimatedValue: c.trade_value ? `£${Number(c.trade_value).toFixed(2)}` : 'N/A',
          forTrade: c.for_trade,
          quantity: c.quantity,
          graded: c.is_graded,
          gradingCompany: c.grading_company || undefined,
          gradeScore: c.grade_score || undefined,
          set: c.set_id ? { id: c.set_id, name: c.set_name || '' } : undefined,
          number: c.card_number || undefined,
          dbId: c.id,
        }));
        setUserCollection(cards);
        setFilteredCards(cards);
      });
  }, [user]);

  // Official card counts per set, needed to compute completion % below.
  // Fetched only for the sets the user actually owns cards from.
  const [setTotals, setSetTotals] = useState<Record<string, number>>({});

  useEffect(() => {
    const setIds = Array.from(
      new Set(userCollection.map((c) => c.set?.id).filter((id): id is string => !!id))
    );
    if (setIds.length === 0) return;

    supabase
      .from('pokemon_sets')
      .select('id, printed_total, total')
      .in('id', setIds)
      .then(({ data }) => {
        if (!data) return;
        const totals: Record<string, number> = {};
        for (const row of data) {
          totals[row.id] = row.printed_total ?? row.total ?? 0;
        }
        setSetTotals(totals);
      });
  }, [userCollection]);

  const NON_RARE = new Set(['common', 'uncommon']);

  const collectionStats = React.useMemo(() => {
    const tradableCards = userCollection.filter((c) => c.forTrade).length;
    const rareCards = userCollection.filter(
      (c) => c.rarity && !NON_RARE.has(c.rarity.toLowerCase())
    ).length;
    const estValue = userCollection.reduce((sum, c) => {
      const parsed = parseFloat((c.estimatedValue || '').replace(/[^0-9.]/g, ''));
      return sum + (Number.isFinite(parsed) ? parsed : 0);
    }, 0);
    return { tradableCards, rareCards, estValue };
  }, [userCollection]);

  const setCompletion = React.useMemo(() => {
    const bySet = new Map<string, { name: string; owned: Set<string> }>();
    for (const card of userCollection) {
      if (!card.set?.id) continue;
      const entry = bySet.get(card.set.id) ?? { name: card.set.name || card.set.id, owned: new Set<string>() };
      entry.owned.add(card.id);
      bySet.set(card.set.id, entry);
    }
    return Array.from(bySet.entries())
      .map(([setId, { name, owned }]) => {
        const total = setTotals[setId];
        return {
          setId,
          name,
          owned: owned.size,
          total: total || null,
          pct: total ? Math.min(100, Math.round((owned.size / total) * 100)) : null,
        };
      })
      .sort((a, b) => (b.pct ?? 0) - (a.pct ?? 0));
  }, [userCollection, setTotals]);

  const badges = React.useMemo(() => {
    const list: string[] = [];
    const trades = profile?.total_trades || 0;
    if (trades >= 1) list.push('First Trade');
    if (trades >= 5) list.push('Active Trader');
    if (trades >= 20) list.push('Veteran Trader');
    if (userCollection.length >= 10) list.push('Collector');
    if (userCollection.length >= 50) list.push('Master Collector');
    if (collectionStats.rareCards >= 5) list.push('Rare Hunter');
    if ((profile?.reputation_score || 0) >= 4.5 && (profile?.total_trades || 0) >= 3) list.push('Highly Rated');
    if (setCompletion.some((s) => s.pct === 100)) list.push('Set Completionist');
    return list;
  }, [profile, userCollection, collectionStats, setCompletion]);

  // Use actual user data when available
  const displayData = {
    name: profile?.display_name || user?.email?.split('@')[0] || "New User",
    username: profile?.username || "newuser",
    joined: profile?.created_at ? new Date(profile.created_at).toLocaleDateString('en-US', { month: 'long', year: 'numeric' }) : "Just now",
    location: profile?.location || "",
    bio: profile?.bio || "",
    stats: {
      trades: profile?.total_trades || 0,
      collectionSize: userCollection.length,
      reputationScore: profile?.reputation_score || 0,
      reviewCount: 0
    },
    badges,
  };

  const tierProgress = getTierProgress(displayData.stats.trades, displayData.stats.reputationScore);

  // Function to render reputation stars
  const renderReputationStars = (score: number) => {
    const stars = [];
    const fullStars = Math.floor(score);
    const hasHalfStar = score % 1 >= 0.5;
    
    for (let i = 0; i < 5; i++) {
      if (i < fullStars) {
        stars.push(<Star key={i} className="h-4 w-4 fill-yellow-400 text-yellow-400" />);
      } else if (i === fullStars && hasHalfStar) {
        stars.push(<Star key={i} className="h-4 w-4 fill-yellow-400 text-yellow-400 half-filled" />);
      } else {
        stars.push(<Star key={i} className="h-4 w-4 text-muted" />);
      }
    }
    
    return stars;
  };
  
  // Filter cards based on search query
  const handleSearchChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const query = e.target.value.toLowerCase();
    setSearchQuery(query);
    
    if (query.trim() === "") {
      setFilteredCards(userCollection);
    } else {
      const filtered = userCollection.filter(card => 
        card.name.toLowerCase().includes(query) || 
        card.rarity.toLowerCase().includes(query) ||
        card.condition.toLowerCase().includes(query) ||
        (card.id && card.id.toLowerCase().includes(query)) ||
        (card.estimatedValue && card.estimatedValue.toLowerCase().includes(query))
      );
      setFilteredCards(filtered);
    }
  };

  const handleAddCards = () => {
    // Navigate to Pokemon sets instead of generic sets
    window.location.href = '/pokemon-sets';
  };

  return (
    <div className="min-h-screen flex flex-col">
      <Navbar />
      
      <main className="flex-1 pt-24 pb-16">
        <div className="container">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            {/* Profile sidebar */}
            <div className="md:col-span-1 space-y-6">
              <GlassCard className="p-6 text-center">
                <div className="mx-auto mb-4">
                  <Avatar className="h-24 w-24 mx-auto">
                    <AvatarImage src={profile?.avatar_url} alt={displayData.name} />
                    <AvatarFallback className="text-2xl">
                      {displayData.name.substring(0, 2).toUpperCase()}
                    </AvatarFallback>
                  </Avatar>
                </div>
                
                <h1 className="text-2xl font-bold mb-1">{displayData.name}</h1>
                <div className="flex flex-col items-center gap-1 mb-3">
                  <TraderTrustBadge
                    totalTrades={displayData.stats.trades}
                    reputationScore={displayData.stats.reputationScore}
                  />
                  {tierProgress && (
                    <span className="text-xs text-muted-foreground">
                      {tierProgress.tradesToNext} more {tierProgress.tradesToNext === 1 ? "trade" : "trades"} to {tierProgress.nextLabel}
                    </span>
                  )}
                </div>
                
                <div className="flex items-center justify-center mb-4">
                  <div className="flex">
                    {renderReputationStars(displayData.stats.reputationScore)}
                  </div>
                  <span className="ml-2 text-sm font-medium">
                    {displayData.stats.reputationScore} ({displayData.stats.reviewCount})
                  </span>
                </div>
                
                <div className="space-y-2 text-sm mb-4">
                  {displayData.location && (
                    <div className="flex items-center justify-center gap-2 text-muted-foreground">
                      <MapPin className="h-4 w-4" />
                      <span>{displayData.location}</span>
                    </div>
                  )}
                  <div className="flex items-center justify-center gap-2 text-muted-foreground">
                    <Calendar className="h-4 w-4" />
                    <span>Joined {displayData.joined}</span>
                  </div>
                </div>
                
                <div className="flex justify-center gap-2 mb-4">
                  <Button>
                    <Mail className="h-4 w-4 mr-2" />
                    Message
                  </Button>
                  <Button variant="outline" onClick={() => window.location.href = '/account-settings'}>
                    <Settings className="h-4 w-4" />
                  </Button>
                </div>
                
                <div className="border-t border-border pt-4 mt-4">
                  <div className="grid grid-cols-3 gap-2 text-center">
                    <div>
                      <div className="text-xl font-bold">{displayData.stats.trades}</div>
                      <div className="text-xs text-muted-foreground">Trades</div>
                    </div>
                    <div>
                      <div className="text-xl font-bold">{displayData.stats.collectionSize}</div>
                      <div className="text-xs text-muted-foreground">Cards</div>
                    </div>
                    <div>
                      <div className="text-xl font-bold">{displayData.stats.reviewCount}</div>
                      <div className="text-xs text-muted-foreground">Reviews</div>
                    </div>
                  </div>
                </div>
              </GlassCard>
              
              <GlassCard className="p-6">
                <h2 className="text-lg font-bold mb-4">About Me</h2>
                {displayData.bio ? (
                  <p className="text-sm text-muted-foreground mb-6">{displayData.bio}</p>
                ) : (
                  <p className="text-sm text-muted-foreground mb-6 italic">No bio added yet.</p>
                )}
                
                <h3 className="text-sm font-medium mb-2">Badges</h3>
                <div className="flex flex-wrap gap-2">
                  {displayData.badges.length > 0 ? (
                    displayData.badges.map((badge, index) => (
                      <div key={index} className="flex items-center gap-1.5 bg-primary/10 text-primary px-2 py-1 rounded-full text-xs">
                        <Award className="h-3 w-3" />
                        <span>{badge}</span>
                      </div>
                    ))
                  ) : (
                    <p className="text-sm text-muted-foreground italic">No badges earned yet.</p>
                  )}
                </div>
              </GlassCard>

              <GlassCard className="p-6">
                <h2 className="text-lg font-bold mb-2">Get paid for card sales</h2>
                {sellerStatus?.onboarding_status === 'complete' ? (
                  <p className="text-sm text-muted-foreground">Payouts connected — you can list cards for sale in the marketplace.</p>
                ) : (
                  <>
                    <p className="text-sm text-muted-foreground mb-4">
                      Connect a payout account to start selling cards for cash on the marketplace.
                    </p>
                    <Button size="sm" onClick={handleConnectPayouts} disabled={isConnectingPayouts}>
                      {isConnectingPayouts ? "Redirecting..." : sellerStatus?.onboarding_status === 'pending' || sellerStatus?.onboarding_status === 'restricted' ? "Finish setup" : "Connect payouts"}
                    </Button>
                  </>
                )}
              </GlassCard>
            </div>

            {/* Profile main content */}
            <div className="md:col-span-2">
              <Tabs defaultValue="collection">
                <TabsList className="mb-6">
                  <TabsTrigger value="activity">Activity</TabsTrigger>
                  <TabsTrigger value="collection">Collection</TabsTrigger>
                  <TabsTrigger value="analytics">Analytics</TabsTrigger>
                  <TabsTrigger value="reviews">Reviews</TabsTrigger>
                </TabsList>
                
                <TabsContent value="activity">
                  <GlassCard className="p-6">
                    <h2 className="text-lg font-bold mb-4">Recent Activity</h2>
                    <div className="text-center py-8">
                      <h3 className="text-xl font-medium mb-2">No recent activity</h3>
                      <p className="text-muted-foreground mb-4">Start trading to see your activity here</p>
                      <Button onClick={() => window.location.href = '/marketplace'}>
                        <ArrowLeftRight className="h-4 w-4 mr-2" />
                        Browse Marketplace
                      </Button>
                    </div>
                  </GlassCard>
                </TabsContent>
                
                <TabsContent value="collection">
                  <GlassCard className="p-6 mb-6">
                    <div className="flex justify-between items-center mb-6">
                      <h2 className="text-lg font-bold">My Card Collection</h2>
                      <Button size="sm" onClick={handleAddCards}>
                        <Plus className="h-4 w-4 mr-2" />
                        Add Cards
                      </Button>
                    </div>
                    
                    <div className="relative mb-6">
                      <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-muted-foreground h-4 w-4" />
                      <Input 
                        placeholder="Search by name, rarity, condition, ID, or value..." 
                        className="pl-9"
                        value={searchQuery}
                        onChange={handleSearchChange}
                      />
                    </div>
                    
                    {filteredCards.length > 0 ? (
                      <CardGrid 
                        cards={filteredCards} 
                        columns={{ sm: 1, md: 2, lg: 3 }} 
                        animated
                      />
                    ) : searchQuery ? (
                      <div className="text-center py-8">
                        <p className="text-muted-foreground">No cards matching "{searchQuery}"</p>
                        <Button variant="outline" className="mt-2" onClick={() => setSearchQuery("")}>
                          Clear Search
                        </Button>
                      </div>
                    ) : (
                      <div className="text-center py-10">
                        <h3 className="text-xl font-medium mb-2">Your collection is empty</h3>
                        <p className="text-muted-foreground mb-4">Start adding cards to showcase your collection</p>
                        <Button onClick={handleAddCards}>
                          <Plus className="h-4 w-4 mr-2" />
                          Add Your First Card
                        </Button>
                      </div>
                    )}
                  </GlassCard>
                  
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <GlassCard className="p-6">
                      <h3 className="text-lg font-medium mb-4">Collection Stats</h3>
                      <div className="space-y-4">
                        <div className="flex justify-between items-center">
                          <span className="text-muted-foreground">Total Cards</span>
                          <span className="font-medium">{userCollection.length}</span>
                        </div>
                        <div className="flex justify-between items-center">
                          <span className="text-muted-foreground">Tradable Cards</span>
                          <span className="font-medium">{collectionStats.tradableCards}</span>
                        </div>
                        <div className="flex justify-between items-center">
                          <span className="text-muted-foreground">Rare Cards</span>
                          <span className="font-medium">{collectionStats.rareCards}</span>
                        </div>
                        <div className="flex justify-between items-center">
                          <span className="text-muted-foreground">Est. Collection Value</span>
                          <span className="font-medium">£{collectionStats.estValue.toFixed(2)}</span>
                        </div>
                      </div>
                    </GlassCard>
                    
                    <GlassCard className="p-6">
                      <h3 className="text-lg font-medium mb-4">Set Completion</h3>
                      {setCompletion.length > 0 ? (
                        <div className="space-y-4">
                          {setCompletion.slice(0, 5).map((s) => (
                            <div key={s.setId}>
                              <div className="flex justify-between items-center mb-1 text-sm">
                                <span className="truncate mr-2">{s.name}</span>
                                <span className="text-muted-foreground shrink-0">
                                  {s.total ? `${s.owned}/${s.total} · ${s.pct}%` : `${s.owned} owned`}
                                </span>
                              </div>
                              <div className="h-2 w-full rounded-full bg-muted overflow-hidden">
                                <div
                                  className="h-full rounded-full bg-primary transition-all"
                                  style={{ width: `${s.pct ?? 0}%` }}
                                />
                              </div>
                            </div>
                          ))}
                        </div>
                      ) : (
                        <div className="text-center py-4">
                          <p className="text-muted-foreground text-sm">No sets in collection yet</p>
                          <p className="text-muted-foreground text-xs mt-1">Add cards to see set completion progress</p>
                        </div>
                      )}
                    </GlassCard>
                  </div>
                </TabsContent>
                
                <TabsContent value="analytics">
                  <UserDashboard />
                </TabsContent>
                
                <TabsContent value="reviews">
                  <GlassCard className="p-6">
                    <h2 className="text-lg font-bold mb-4">Trading Reviews</h2>
                    <div className="text-center py-8">
                      <h3 className="text-xl font-medium mb-2">No reviews yet</h3>
                      <p className="text-muted-foreground mb-4">Complete trades to receive reviews from other traders</p>
                      <Button onClick={() => window.location.href = '/marketplace'}>
                        <ArrowLeftRight className="h-4 w-4 mr-2" />
                        Start Trading
                      </Button>
                    </div>
                  </GlassCard>
                </TabsContent>
              </Tabs>
            </div>
          </div>
        </div>
      </main>
      
      <Footer />
    </div>
  );
};

export default Profile;
