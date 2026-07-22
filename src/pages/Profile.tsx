
import React, { useState, useEffect, useMemo } from "react";
import Navbar from "@/components/layout/Navbar";
import Footer from "@/components/layout/Footer";
import GlassCard from "@/components/ui/custom/GlassCard";
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
import { supabase } from "@/integrations/supabase/client";
import UserDashboard from "@/components/analytics/UserDashboard";
import { 
  Star, 
  MapPin, 
  Calendar, 
  ArrowLeftRight, 
  Settings,
  Plus,
  Search
} from "lucide-react";

type Review = {
  id: string;
  rating: number;
  review: string | null;
  created_at: string;
};

const Profile = () => {
  const { user, profile } = useUser();
  const [searchQuery, setSearchQuery] = useState("");
  const [userCollection, setUserCollection] = useState<CardItemProps[]>([]);
  const [reviews, setReviews] = useState<Review[]>([]);

  useEffect(() => {
    if (!user) {
      setUserCollection([]);
      setReviews([]);
      return;
    }

    let cancelled = false;
    Promise.all([
      supabase
        .from('user_cards')
        .select('*')
        .eq('user_id', user.id)
        .eq('product_type', 'single'),
      supabase
        .from('trade_ratings')
        .select('id,rating,review,created_at')
        .eq('rated_user_id', user.id)
        .order('created_at', { ascending: false }),
    ]).then(([cardsResult, reviewsResult]) => {
      if (cancelled) return;
      if (cardsResult.error) throw cardsResult.error;
      if (reviewsResult.error) throw reviewsResult.error;

      const cards: CardItemProps[] = (cardsResult.data ?? []).map(c => ({
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
      setReviews(reviewsResult.data ?? []);
    }).catch((error) => {
      if (!cancelled) console.error('Error loading profile data:', error);
    });

    return () => {
      cancelled = true;
    };
  }, [user]);

  const totalCards = userCollection.reduce((sum, card) => sum + (card.quantity ?? 1), 0);
  const tradableCards = userCollection.reduce(
    (sum, card) => sum + (card.forTrade ? card.quantity ?? 1 : 0),
    0,
  );
  const rareCards = userCollection.reduce(
    (sum, card) => sum + (card.rarity.toLowerCase().includes('rare') ? card.quantity ?? 1 : 0),
    0,
  );
  const collectionValue = userCollection.reduce((sum, card) => {
    const value = Number.parseFloat(card.estimatedValue.replace(/[£,]/g, ''));
    return sum + (Number.isFinite(value) ? value * (card.quantity ?? 1) : 0);
  }, 0);
  const representedSets = new Set(
    userCollection.map(card => card.set?.id).filter((setId): setId is string => !!setId),
  ).size;

  const filteredCards = useMemo(() => {
    const query = searchQuery.trim().toLowerCase();
    if (!query) return userCollection;
    return userCollection.filter(card =>
      card.name.toLowerCase().includes(query) ||
      card.rarity.toLowerCase().includes(query) ||
      card.condition.toLowerCase().includes(query) ||
      card.id.toLowerCase().includes(query) ||
      card.estimatedValue.toLowerCase().includes(query)
    );
  }, [searchQuery, userCollection]);
  
  // Use actual user data when available
  const displayData = {
    name: profile?.display_name || user?.email?.split('@')[0] || "New User",
    joined: profile?.created_at ? new Date(profile.created_at).toLocaleDateString('en-GB', { month: 'long', year: 'numeric' }) : "Recently",
    location: profile?.location || "",
    reputation: "new" as const,
    bio: profile?.bio || "",
    stats: {
      trades: profile?.total_trades || 0,
      collectionSize: totalCards,
      reputationScore: profile?.reputation_score || 0,
      reviewCount: reviews.length
    },
  };
  
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
    setSearchQuery(e.target.value);
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
                <p className="text-sm text-muted-foreground mb-3">
                  {displayData.stats.trades === 0
                    ? 'New collector'
                    : `${displayData.stats.trades} completed ${displayData.stats.trades === 1 ? 'trade' : 'trades'}`}
                </p>
                
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
                
                <div className="flex justify-center mb-4">
                  <Button variant="outline" onClick={() => window.location.href = '/account-settings'}>
                    <Settings className="h-4 w-4 mr-2" />
                    Edit profile
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
                          <span className="font-medium">{tradableCards}</span>
                        </div>
                        <div className="flex justify-between items-center">
                          <span className="text-muted-foreground">Rare Cards</span>
                          <span className="font-medium">{rareCards}</span>
                        </div>
                        <div className="flex justify-between items-center">
                          <span className="text-muted-foreground">Est. Collection Value</span>
                          <span className="font-medium">
                            {collectionValue > 0 ? `£${collectionValue.toFixed(2)}` : 'N/A'}
                          </span>
                        </div>
                      </div>
                    </GlassCard>
                    
                    <GlassCard className="p-6">
                      <h3 className="text-lg font-medium mb-4">Collection Coverage</h3>
                      <div className="text-center py-4">
                        <p className="text-2xl font-bold">{representedSets}</p>
                        <p className="text-muted-foreground text-sm">
                          {representedSets === 1 ? 'set represented' : 'sets represented'}
                        </p>
                      </div>
                    </GlassCard>
                  </div>
                </TabsContent>
                
                <TabsContent value="analytics">
                  <UserDashboard />
                </TabsContent>
                
                <TabsContent value="reviews">
                  <GlassCard className="p-6">
                    <h2 className="text-lg font-bold mb-4">Trading Reviews</h2>
                    {reviews.length > 0 ? (
                      <div className="space-y-4">
                        {reviews.map(review => (
                          <div key={review.id} className="rounded-lg border p-4">
                            <div className="flex items-center justify-between gap-4 mb-2">
                              <div className="flex">{renderReputationStars(review.rating)}</div>
                              <span className="text-xs text-muted-foreground">
                                {new Date(review.created_at).toLocaleDateString('en-GB')}
                              </span>
                            </div>
                            <p className="text-sm text-muted-foreground">
                              {review.review || 'Rating left without a written review.'}
                            </p>
                          </div>
                        ))}
                      </div>
                    ) : (
                      <div className="text-center py-8">
                        <h3 className="text-xl font-medium mb-2">No reviews yet</h3>
                        <p className="text-muted-foreground mb-4">Complete trades to receive reviews from other traders</p>
                        <Button onClick={() => window.location.href = '/marketplace'}>
                          <ArrowLeftRight className="h-4 w-4 mr-2" />
                          Start Trading
                        </Button>
                      </div>
                    )}
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
