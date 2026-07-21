
import React from "react";
import { Link } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { 
  Shield, 
  TrendingUp, 
  Users, 
  Package, 
  Camera, 
  ListChecks,
  Truck,
  Check,
  Layers
} from "lucide-react";
import Navbar from "@/components/layout/Navbar";
import Footer from "@/components/layout/Footer";
import LiveTradeFeed from "@/components/trades/LiveTradeFeed";
import GlassCard from "@/components/ui/custom/GlassCard";

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
              <span className="text-primary">Card for Card</span>
            </h1>
            <p className="text-lg md:text-xl text-muted-foreground mb-8 animate-slide-down animation-delay-100">
              CollectX is a community platform for collectors to list, propose, and manage
              card-for-card Pokémon trades alongside their personal collections.
            </p>
            <div className="flex flex-col sm:flex-row gap-4 justify-center animate-slide-up animation-delay-200">
              <Button size="lg" asChild>
                <Link to="/auth">Start Trading</Link>
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
            <h2 className="text-3xl font-bold mb-4">Built for Card-for-Card Trading</h2>
            <p className="text-muted-foreground max-w-2xl mx-auto">
              A structured workflow for proposing, confirming, and completing
              collector-to-collector Pokémon card trades.
            </p>
          </div>
          
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {[
              {
                icon: <Shield className="h-6 w-6 text-primary" />,
                title: "Structured Trade Workflow",
                description: "Server-validated proposals from real collection cards, in-trade messaging, private fulfilment addresses, recorded carrier/tracking details, and two-party receipt confirmation. Either participant can pause an accepted or shipped trade by recording an issue."
              },
              {
                icon: <Users className="h-6 w-6 text-primary" />,
                title: "Reputation System",
                description: "Profiles show completed-trade counts and database-backed ratings left by prior trade partners."
              },
              {
                icon: <TrendingUp className="h-6 w-6 text-primary" />,
                title: "Value Estimation",
                description: "Indicative catalogue values and available market data to help you compare cards. Prices are approximate, not live."
              },
              {
                icon: <Camera className="h-6 w-6 text-primary" />,
                title: "Card Photos",
                description: "Upload and view condition photos so both sides can review a card before proposing or accepting a trade."
              },
              {
                icon: <ListChecks className="h-6 w-6 text-primary" />,
                title: "Collection Management",
                description: "Organize your collection by set, rarity, type, and more with intuitive tools."
              },
              {
                icon: <Truck className="h-6 w-6 text-primary" />,
                title: "Shipping Details",
                description: "Both participants record their carrier and tracking number for their outbound parcel so each side can look it up with the carrier directly."
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
      
      <section className="py-16 md:py-24">
        <div className="container">
          <LiveTradeFeed />
        </div>
      </section>
      
      <section className="py-16 md:py-24 bg-secondary/30">
        <div className="container">
          <div className="max-w-3xl mx-auto text-center">
            <h2 className="text-3xl font-bold mb-4">Ready to Start Trading?</h2>
            <p className="text-muted-foreground mb-8">
              Set up your collection, mark cards as available for trade, and start
              proposing card-for-card swaps with other collectors.
            </p>
            <Button size="lg" asChild>
              <Link to="/auth">Get Started Now</Link>
            </Button>
          </div>
        </div>
      </section>
      
      <Footer />
    </div>
  );
};

export default Index;
