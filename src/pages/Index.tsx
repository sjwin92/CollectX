
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
  Database,
  Check,
  Layers
} from "lucide-react";
import Navbar from "@/components/layout/Navbar";
import Footer from "@/components/layout/Footer";
import CardGrid from "@/components/cards/CardGrid";
import TradeOffer from "@/components/trades/TradeOffer";
import GlassCard from "@/components/ui/custom/GlassCard";
import Badge from "@/components/ui/custom/Badge";

const featuredCards = [
  {
    id: "swsh4-25",  // Charizard VMAX from Vivid Voltage
    name: "Charizard VMAX",
    imageUrl: "https://images.pokemontcg.io/swsh4/25.png",
    rarity: "Ultra Rare",
    condition: "Near Mint",
    estimatedValue: "$350-450"
  },
  {
    id: "swsh1-190", // Pikachu VMAX from Sword & Shield Base
    name: "Pikachu VMAX",
    imageUrl: "https://images.pokemontcg.io/swsh1/190.png",
    rarity: "Rare",
    condition: "Mint",
    estimatedValue: "$120-150"
  },
  {
    id: "sm12-222", // Mewtwo & Mew GX from Cosmic Eclipse
    name: "Mewtwo & Mew GX",
    imageUrl: "https://images.pokemontcg.io/sm12/222.png",
    rarity: "Ultra Rare",
    condition: "Excellent",
    estimatedValue: "$200-250"
  },
  {
    id: "swsh9-25", // Blastoise VMAX from Brilliant Stars
    name: "Blastoise VMAX",
    imageUrl: "https://images.pokemontcg.io/swsh9/25.png",
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
      preview: featuredCards[0].imageUrl
    },
    receiving: {
      count: 3,
      preview: featuredCards[1].imageUrl
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
      preview: featuredCards[3].imageUrl
    },
    receiving: {
      count: 1,
      preview: featuredCards[2].imageUrl
    }
  }
];

const Index = () => {
  return (
    <div className="min-h-screen flex flex-col">
      <Navbar />
      
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
                <Link to="/pokemons">Browse Cards</Link>
              </Button>
              <Button size="lg" variant="secondary" asChild>
                <Link to="/pokemon-sets">
                  <Layers className="h-4 w-4 mr-2" />
                  Browse Sets
                </Link>
              </Button>
            </div>
          </div>
        </div>
      </section>
      
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
