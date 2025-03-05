
import React from "react";
import { Link } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { 
  Shield, 
  TrendingUp, 
  Users, 
  Package, 
  ArrowRight, 
  Camera, 
  ListChecks,
  Star,
  Truck,
  Database
} from "lucide-react";
import Navbar from "@/components/layout/Navbar";
import Footer from "@/components/layout/Footer";
import CardGrid from "@/components/cards/CardGrid";
import TradeOffer from "@/components/trades/TradeOffer";
import GlassCard from "@/components/ui/custom/GlassCard";

// Placeholder data
const featuredCards = [
  {
    id: "1",
    name: "Charizard GX Rainbow Rare",
    imageUrl: "https://images.unsplash.com/photo-1605979257913-1704eb7b6246?q=80&w=1470&auto=format&fit=crop",
    rarity: "Ultra Rare",
    condition: "Near Mint",
    estimatedValue: "$350-450"
  },
  {
    id: "2",
    name: "Pikachu V-Max",
    imageUrl: "https://images.unsplash.com/photo-1607736703050-d0666c1d1278?q=80&w=1470&auto=format&fit=crop",
    rarity: "Rare",
    condition: "Mint",
    estimatedValue: "$120-150"
  },
  {
    id: "3",
    name: "Mewtwo EX",
    imageUrl: "https://images.unsplash.com/photo-1613771404721-1f92d799e49f?q=80&w=1469&auto=format&fit=crop",
    rarity: "Ultra Rare",
    condition: "Excellent",
    estimatedValue: "$200-250"
  },
  {
    id: "4",
    name: "Blastoise Holo",
    imageUrl: "https://images.unsplash.com/photo-1638075528746-8b5f9c2b6c9c?q=80&w=1480&auto=format&fit=crop",
    rarity: "Rare Holo",
    condition: "Good",
    estimatedValue: "$80-120"
  }
];

const recentTrades = [
  {
    id: "t1",
    status: "completed" as const,
    date: "2 days ago",
    user: {
      id: "u1",
      name: "Alex Morgan",
      reputation: "trusted" as const
    },
    giving: {
      count: 2,
      preview: "https://images.unsplash.com/photo-1605979257913-1704eb7b6246?q=80&w=1470&auto=format&fit=crop"
    },
    receiving: {
      count: 3,
      preview: "https://images.unsplash.com/photo-1607736703050-d0666c1d1278?q=80&w=1470&auto=format&fit=crop"
    }
  },
  {
    id: "t2",
    status: "proposed" as const,
    date: "5 hours ago",
    user: {
      id: "u2",
      name: "Jordan Lee",
      reputation: "established" as const
    },
    giving: {
      count: 1,
      preview: "https://images.unsplash.com/photo-1638075528746-8b5f9c2b6c9c?q=80&w=1480&auto=format&fit=crop"
    },
    receiving: {
      count: 1,
      preview: "https://images.unsplash.com/photo-1613771404721-1f92d799e49f?q=80&w=1469&auto=format&fit=crop"
    }
  }
];

const Index = () => {
  return (
    <div className="min-h-screen flex flex-col">
      <Navbar />
      
      {/* Hero section */}
      <section className="relative pt-24 pb-16 md:pt-32 md:pb-24 overflow-hidden">
        <div className="absolute inset-0 bg-gradient-to-b from-primary/5 to-transparent" />
        <div className="container relative z-10">
          <div className="max-w-3xl mx-auto text-center">
            <h1 className="text-4xl md:text-5xl lg:text-6xl font-bold tracking-tight mb-6 animate-slide-down">
              Trade Pokémon Cards <br className="hidden sm:block" />
              <span className="text-primary">Safely and Securely</span>
            </h1>
            <p className="text-lg md:text-xl text-muted-foreground mb-8 animate-slide-down animation-delay-100">
              CollectX is a community-focused platform that helps collectors find, 
              trade, and manage their Pokémon card collections with confidence.
            </p>
            <div className="flex flex-col sm:flex-row gap-4 justify-center animate-slide-up animation-delay-200">
              <Button size="lg" asChild>
                <Link to="/collection">Start Trading</Link>
              </Button>
              <Button size="lg" variant="outline" asChild>
                <Link to="/pokemons">Browse Pokémon Cards</Link>
              </Button>
            </div>
          </div>
        </div>
      </section>
      
      {/* Features section */}
      <section className="py-16 md:py-24 bg-secondary/30">
        <div className="container">
          <div className="text-center mb-12">
            <h2 className="text-3xl font-bold mb-4">Safe Trading for Collectors</h2>
            <p className="text-muted-foreground max-w-2xl mx-auto">
              Our platform is built by collectors, for collectors, with features designed to make trading both safe and enjoyable.
            </p>
          </div>
          
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {[
              {
                icon: <Shield className="h-6 w-6 text-primary" />,
                title: "Trade Protection",
                description: "Our escrow system ensures both parties fulfill their obligations before a trade is completed."
              },
              {
                icon: <Users className="h-6 w-6 text-primary" />,
                title: "Reputation System",
                description: "Trade with confidence using our tiered reputation system that recognizes trusted collectors."
              },
              {
                icon: <TrendingUp className="h-6 w-6 text-primary" />,
                title: "Value Estimation",
                description: "Get approximate values for your cards based on condition and recent market data."
              },
              {
                icon: <Camera className="h-6 w-6 text-primary" />,
                title: "Card Photos",
                description: "Upload and view high-quality photos of cards to verify condition before trading."
              },
              {
                icon: <ListChecks className="h-6 w-6 text-primary" />,
                title: "Collection Management",
                description: "Organize your collection by set, rarity, type, and more with our intuitive tools."
              },
              {
                icon: <Truck className="h-6 w-6 text-primary" />,
                title: "Shipping Tracking",
                description: "Integrate shipping information for real-time tracking of your trades."
              }
            ].map((feature, index) => (
              <GlassCard 
                key={index} 
                className="p-6"
                animation="scale"
              >
                <div className="mb-4">{feature.icon}</div>
                <h3 className="text-xl font-medium mb-2">{feature.title}</h3>
                <p className="text-muted-foreground">{feature.description}</p>
              </GlassCard>
            ))}
          </div>
        </div>
      </section>
      
      {/* Pokémon TCG Database Section */}
      <section className="py-16 md:py-24">
        <div className="container">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-12 items-center">
            <div className="space-y-6">
              <div>
                <Badge variant="outline" className="mb-4">
                  <Database className="h-3 w-3 mr-1" /> NEW FEATURE
                </Badge>
                <h2 className="text-3xl font-bold mb-4">Comprehensive Pokémon Card Database</h2>
                <p className="text-muted-foreground mb-6">
                  Access our integrated Pokémon TCG API with data on thousands of cards 
                  spanning all sets and generations. Get accurate market prices, view high-resolution 
                  card images, and find detailed information to help with trading decisions.
                </p>
              </div>
              
              <div className="space-y-3">
                {[
                  "Search for any Pokémon card by name, type, or set",
                  "Get market prices from TCGplayer",
                  "View detailed card information and attacks",
                  "Browse cards by set and rarity"
                ].map((feature, i) => (
                  <div key={i} className="flex items-start gap-2">
                    <div className="h-5 w-5 rounded-full bg-primary/20 flex items-center justify-center mt-0.5">
                      <Check className="h-3 w-3 text-primary" />
                    </div>
                    <span>{feature}</span>
                  </div>
                ))}
              </div>
              
              <Button asChild>
                <Link to="/pokemons" className="inline-flex items-center gap-2">
                  Explore Pokémon Card Database <ArrowRight className="h-4 w-4" />
                </Link>
              </Button>
            </div>
            
            <div className="grid grid-cols-2 gap-4 relative">
              <div className="absolute inset-0 bg-gradient-to-tr from-primary/30 to-transparent rounded-xl -z-10 blur-xl opacity-30" />
              {[
                {
                  image: "https://images.unsplash.com/photo-1605979257913-1704eb7b6246?q=80&w=1470&auto=format&fit=crop",
                  className: "translate-y-8 animate-float"
                },
                {
                  image: "https://images.unsplash.com/photo-1613771404721-1f92d799e49f?q=80&w=1469&auto=format&fit=crop",
                  className: "animate-float animation-delay-300"
                },
                {
                  image: "https://images.unsplash.com/photo-1607736703050-d0666c1d1278?q=80&w=1470&auto=format&fit=crop",
                  className: "animate-float animation-delay-100"
                },
                {
                  image: "https://images.unsplash.com/photo-1638075528746-8b5f9c2b6c9c?q=80&w=1480&auto=format&fit=crop",
                  className: "translate-y-8 animate-float animation-delay-200"
                }
              ].map((card, i) => (
                <div key={i} className={`rounded-lg overflow-hidden shadow-lg ${card.className}`}>
                  <img 
                    src={card.image} 
                    alt="Pokémon card" 
                    className="w-full h-full object-cover" 
                  />
                </div>
              ))}
            </div>
          </div>
        </div>
      </section>
      
      {/* Featured Cards */}
      <section className="py-16 md:py-24 bg-secondary/30">
        <div className="container">
          <div className="flex items-center justify-between mb-8">
            <div>
              <h2 className="text-3xl font-bold mb-2">Featured Cards</h2>
              <p className="text-muted-foreground">
                Discover popular cards that are available for trading right now
              </p>
            </div>
            <Button variant="ghost" className="hidden md:flex" asChild>
              <Link to="/collection" className="flex items-center gap-1">
                View All <ArrowRight className="h-4 w-4" />
              </Link>
            </Button>
          </div>
          
          <CardGrid 
            cards={featuredCards} 
            columns={{ sm: 2, md: 3, lg: 4 }}
            animated
          />
          
          <div className="mt-8 text-center md:hidden">
            <Button asChild>
              <Link to="/collection">View All Cards</Link>
            </Button>
          </div>
        </div>
      </section>
      
      {/* Recent Trades */}
      <section className="py-16 md:py-24">
        <div className="container">
          <div className="flex items-center justify-between mb-8">
            <div>
              <h2 className="text-3xl font-bold mb-2">Recent Trades</h2>
              <p className="text-muted-foreground">
                See the latest successful trades happening on the platform
              </p>
            </div>
            <Button variant="ghost" className="hidden md:flex" asChild>
              <Link to="/trades" className="flex items-center gap-1">
                All Trades <ArrowRight className="h-4 w-4" />
              </Link>
            </Button>
          </div>
          
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {recentTrades.map((trade) => (
              <TradeOffer key={trade.id} {...trade} />
            ))}
          </div>
          
          <div className="mt-8 text-center md:hidden">
            <Button asChild>
              <Link to="/trades">View All Trades</Link>
            </Button>
          </div>
        </div>
      </section>
      
      {/* Call to Action */}
      <section className="py-16 md:py-24 bg-secondary/30">
        <div className="container">
          <div className="max-w-3xl mx-auto text-center">
            <h2 className="text-3xl font-bold mb-4">Ready to Start Trading?</h2>
            <p className="text-muted-foreground mb-8">
              Join thousands of Pokémon card collectors already trading safely on our platform.
              It only takes a minute to set up your collection and start making trades.
            </p>
            <Button size="lg" asChild>
              <Link to="/collection">Get Started Now</Link>
            </Button>
          </div>
        </div>
      </section>
      
      <Footer />
    </div>
  );
};

export default Index;
