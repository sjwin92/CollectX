
import React, { useState } from "react";
import Navbar from "@/components/layout/Navbar";
import Footer from "@/components/layout/Footer";
import GlassCard from "@/components/ui/custom/GlassCard";
import Badge from "@/components/ui/custom/Badge";
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
import UserDashboard from "@/components/analytics/UserDashboard";
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

// Placeholder user data
const userData = {
  name: "Alex Johnson",
  username: "alexj",
  joined: "January 2023",
  location: "Seattle, WA",
  reputation: "trusted" as const,
  bio: "Avid Pokémon card collector since 1999. Specializing in WoTC era cards and modern ultra rares. Looking for trades to complete my Base Set collection.",
  stats: {
    trades: 42,
    collectionSize: 384,
    reputationScore: 4.9,
    reviewCount: 38
  },
  badges: [
    "Verified Trader",
    "Fast Shipper",
    "Top Collector"
  ]
};

// Placeholder collection data
const userCollection: CardItemProps[] = [
  {
    id: "swsh4-25",
    name: "Charizard VMAX",
    imageUrl: "https://images.pokemontcg.io/swsh4/25.png",
    rarity: "Rare Ultra",
    condition: "Near Mint",
    estimatedValue: "$125-150"
  },
  {
    id: "base1-4",
    name: "Charizard Base Set",
    imageUrl: "https://images.pokemontcg.io/base1/4.png",
    rarity: "Rare Holo",
    condition: "Excellent",
    estimatedValue: "$350-500"
  },
  {
    id: "xy12-13",
    name: "Pikachu EX",
    imageUrl: "https://images.pokemontcg.io/xy12/13.png",
    rarity: "Rare Ultra",
    condition: "Mint",
    estimatedValue: "$40-60"
  },
  {
    id: "sm10-158",
    name: "Reshiram & Charizard GX",
    imageUrl: "https://images.pokemontcg.io/sm10/158.png",
    rarity: "Rare Rainbow",
    condition: "Near Mint",
    estimatedValue: "$180-220"
  },
  {
    id: "cel25c-12",
    name: "Blastoise",
    imageUrl: "https://images.pokemontcg.io/cel25c/12.png",
    rarity: "Classic Collection",
    condition: "Mint",
    estimatedValue: "$30-45"
  },
  {
    id: "dp7-130",
    name: "Gengar Lv.X",
    imageUrl: "https://images.pokemontcg.io/dp7/130.png",
    rarity: "Rare Holo Lv.X",
    condition: "Good",
    estimatedValue: "$85-115"
  },
];

// Rare cards that user might want to showcase
const showcaseCards = userCollection.slice(0, 4);

const Profile = () => {
  const { user } = useUser();
  const [searchQuery, setSearchQuery] = useState("");
  const [filteredCards, setFilteredCards] = useState<CardItemProps[]>(userCollection);
  
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
                    <AvatarImage src="/placeholder.svg" alt={userData.name} />
                    <AvatarFallback className="text-2xl">
                      {userData.name.substring(0, 2).toUpperCase()}
                    </AvatarFallback>
                  </Avatar>
                </div>
                
                <h1 className="text-2xl font-bold mb-1">{userData.name}</h1>
                <div className="flex items-center justify-center mb-3">
                  <Badge variant="reputation" reputation={userData.reputation} size="md">
                    {userData.reputation.charAt(0).toUpperCase() + userData.reputation.slice(1)} Trader
                  </Badge>
                </div>
                
                <div className="flex items-center justify-center mb-4">
                  <div className="flex">
                    {renderReputationStars(userData.stats.reputationScore)}
                  </div>
                  <span className="ml-2 text-sm font-medium">
                    {userData.stats.reputationScore} ({userData.stats.reviewCount})
                  </span>
                </div>
                
                <div className="space-y-2 text-sm mb-4">
                  <div className="flex items-center justify-center gap-2 text-muted-foreground">
                    <MapPin className="h-4 w-4" />
                    <span>{userData.location}</span>
                  </div>
                  <div className="flex items-center justify-center gap-2 text-muted-foreground">
                    <Calendar className="h-4 w-4" />
                    <span>Joined {userData.joined}</span>
                  </div>
                </div>
                
                <div className="flex justify-center gap-2 mb-4">
                  <Button>
                    <Mail className="h-4 w-4 mr-2" />
                    Message
                  </Button>
                  <Button variant="outline">
                    <Settings className="h-4 w-4" />
                  </Button>
                </div>
                
                <div className="border-t border-border pt-4 mt-4">
                  <div className="grid grid-cols-3 gap-2 text-center">
                    <div>
                      <div className="text-xl font-bold">{userData.stats.trades}</div>
                      <div className="text-xs text-muted-foreground">Trades</div>
                    </div>
                    <div>
                      <div className="text-xl font-bold">{userData.stats.collectionSize}</div>
                      <div className="text-xs text-muted-foreground">Cards</div>
                    </div>
                    <div>
                      <div className="text-xl font-bold">{userData.stats.reviewCount}</div>
                      <div className="text-xs text-muted-foreground">Reviews</div>
                    </div>
                  </div>
                </div>
              </GlassCard>
              
              <GlassCard className="p-6">
                <h2 className="text-lg font-bold mb-4">About Me</h2>
                <p className="text-sm text-muted-foreground mb-6">{userData.bio}</p>
                
                <h3 className="text-sm font-medium mb-2">Badges</h3>
                <div className="flex flex-wrap gap-2">
                  {userData.badges.map((badge, index) => (
                    <div key={index} className="flex items-center gap-1.5 bg-primary/10 text-primary px-2 py-1 rounded-full text-xs">
                      <Award className="h-3 w-3" />
                      <span>{badge}</span>
                    </div>
                  ))}
                </div>
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
                  <GlassCard className="p-6 mb-6">
                    <h2 className="text-lg font-bold mb-4">Recent Activity</h2>
                    
                    <div className="space-y-6">
                      {[
                        {
                          icon: <ArrowLeftRight className="h-5 w-5 text-blue-500" />,
                          title: "Completed trade with Jamie Rivera",
                          description: "2 days ago",
                          action: "View Trade"
                        },
                        {
                          icon: <Package className="h-5 w-5 text-green-500" />,
                          title: "Added 12 new cards to collection",
                          description: "1 week ago",
                          action: "View Cards"
                        },
                        {
                          icon: <ShieldCheck className="h-5 w-5 text-purple-500" />,
                          title: "Achieved Trusted Trader status",
                          description: "2 weeks ago",
                          action: null
                        },
                        {
                          icon: <ArrowLeftRight className="h-5 w-5 text-blue-500" />,
                          title: "Started trade with Alex Morgan",
                          description: "3 weeks ago",
                          action: "View Trade"
                        }
                      ].map((item, index) => (
                        <div key={index} className="flex">
                          <div className="mr-4 flex h-10 w-10 items-center justify-center rounded-full bg-muted">
                            {item.icon}
                          </div>
                          <div className="flex-1">
                            <h3 className="text-base font-medium">{item.title}</h3>
                            <p className="text-sm text-muted-foreground">{item.description}</p>
                          </div>
                          {item.action && (
                            <Button variant="ghost" size="sm">
                              {item.action}
                            </Button>
                          )}
                        </div>
                      ))}
                    </div>
                  </GlassCard>
                  
                  <GlassCard className="p-6">
                    <h2 className="text-lg font-bold mb-4">Trading Statistics</h2>
                    
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mb-6">
                      <div className="bg-muted/50 rounded-lg p-4">
                        <h3 className="text-sm font-medium mb-2">Completed Trades</h3>
                        <div className="text-3xl font-bold">42</div>
                        <div className="text-xs text-muted-foreground">+3 this month</div>
                      </div>
                      <div className="bg-muted/50 rounded-lg p-4">
                        <h3 className="text-sm font-medium mb-2">Avg. Response Time</h3>
                        <div className="text-3xl font-bold">2.5h</div>
                        <div className="text-xs text-muted-foreground">Faster than 85% of users</div>
                      </div>
                    </div>
                    
                    <div className="space-y-3">
                      <div>
                        <div className="flex justify-between text-sm mb-1">
                          <span>Successful Trades</span>
                          <span className="font-medium">98%</span>
                        </div>
                        <div className="h-2 bg-muted rounded-full overflow-hidden">
                          <div className="h-full bg-green-500 rounded-full" style={{ width: "98%" }} />
                        </div>
                      </div>
                      
                      <div>
                        <div className="flex justify-between text-sm mb-1">
                          <span>Shipping On-Time</span>
                          <span className="font-medium">95%</span>
                        </div>
                        <div className="h-2 bg-muted rounded-full overflow-hidden">
                          <div className="h-full bg-green-500 rounded-full" style={{ width: "95%" }} />
                        </div>
                      </div>
                      
                      <div>
                        <div className="flex justify-between text-sm mb-1">
                          <span>Card Condition Accuracy</span>
                          <span className="font-medium">100%</span>
                        </div>
                        <div className="h-2 bg-muted rounded-full overflow-hidden">
                          <div className="h-full bg-green-500 rounded-full" style={{ width: "100%" }} />
                        </div>
                      </div>
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
                          <span className="font-medium">12</span>
                        </div>
                        <div className="flex justify-between items-center">
                          <span className="text-muted-foreground">Rare Cards</span>
                          <span className="font-medium">28</span>
                        </div>
                        <div className="flex justify-between items-center">
                          <span className="text-muted-foreground">Est. Collection Value</span>
                          <span className="font-medium">$1,250-1,800</span>
                        </div>
                      </div>
                    </GlassCard>
                    
                    <GlassCard className="p-6">
                      <h3 className="text-lg font-medium mb-4">Set Completion</h3>
                      <div className="space-y-3">
                        <div>
                          <div className="flex justify-between text-sm mb-1">
                            <span>Base Set</span>
                            <span className="font-medium">85%</span>
                          </div>
                          <div className="h-2 bg-muted rounded-full overflow-hidden">
                            <div className="h-full bg-primary rounded-full" style={{ width: "85%" }} />
                          </div>
                        </div>
                        
                        <div>
                          <div className="flex justify-between text-sm mb-1">
                            <span>Jungle</span>
                            <span className="font-medium">100%</span>
                          </div>
                          <div className="h-2 bg-muted rounded-full overflow-hidden">
                            <div className="h-full bg-primary rounded-full" style={{ width: "100%" }} />
                          </div>
                        </div>
                        
                        <div>
                          <div className="flex justify-between text-sm mb-1">
                            <span>Team Rocket</span>
                            <span className="font-medium">62%</span>
                          </div>
                          <div className="h-2 bg-muted rounded-full overflow-hidden">
                            <div className="h-full bg-primary rounded-full" style={{ width: "62%" }} />
                          </div>
                        </div>
                        
                        <div>
                          <div className="flex justify-between text-sm mb-1">
                            <span>Sword & Shield</span>
                            <span className="font-medium">34%</span>
                          </div>
                          <div className="h-2 bg-muted rounded-full overflow-hidden">
                            <div className="h-full bg-primary rounded-full" style={{ width: "34%" }} />
                          </div>
                        </div>
                      </div>
                    </GlassCard>
                  </div>
                </TabsContent>
                
                <TabsContent value="analytics">
                  <UserDashboard />
                </TabsContent>
                
                <TabsContent value="reviews">
                  <GlassCard className="p-6">
                    <h2 className="text-lg font-bold mb-4">Trader Reviews</h2>
                    
                    <div className="space-y-6">
                      {[
                        {
                          name: "Jamie Rivera",
                          rating: 5,
                          date: "2 weeks ago",
                          comment: "Great trader! Cards arrived quickly and in perfect condition. Communication was excellent throughout the trade process."
                        },
                        {
                          name: "Casey Zhang",
                          rating: 5,
                          date: "1 month ago",
                          comment: "Alex is a trusted trader. Cards were exactly as described and shipping was fast. Would definitely trade again!"
                        },
                        {
                          name: "Jordan Lee",
                          rating: 4,
                          date: "2 months ago",
                          comment: "Good experience trading with Alex. Cards were in the condition described. Shipping took a bit longer than expected but overall satisfied."
                        }
                      ].map((review, index) => (
                        <div key={index} className="pb-6 border-b border-border last:border-0 last:pb-0">
                          <div className="flex justify-between items-start mb-2">
                            <div>
                              <h3 className="font-medium">{review.name}</h3>
                              <div className="flex mt-1">
                                {Array(5).fill(0).map((_, i) => (
                                  <Star 
                                    key={i} 
                                    className={`h-4 w-4 ${i < review.rating ? 'fill-yellow-400 text-yellow-400' : 'text-muted'}`} 
                                  />
                                ))}
                              </div>
                            </div>
                            <span className="text-xs text-muted-foreground">{review.date}</span>
                          </div>
                          <p className="text-sm text-muted-foreground mt-2">{review.comment}</p>
                        </div>
                      ))}
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
