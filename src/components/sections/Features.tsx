
import React from "react";
import { Shield, Users, TrendingUp, Camera, ListChecks, Truck } from "lucide-react";
import GlassCard from "@/components/ui/custom/GlassCard";

const Features = () => {
  const features = [
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
  ];

  return (
    <section className="py-16 md:py-24 bg-secondary/30">
      <div className="container">
        <div className="text-center mb-12">
          <h2 className="text-3xl font-bold mb-4">Safe Trading for Collectors</h2>
          <p className="text-muted-foreground max-w-2xl mx-auto">
            Our platform is built by collectors, for collectors, with features designed to make trading both safe and enjoyable.
          </p>
        </div>
        
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {features.map((feature, index) => (
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
  );
};

export default Features;
