
import React, { useState, useEffect } from "react";
import { Link } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { ArrowRight } from "lucide-react";
import CardGrid from "@/components/cards/CardGrid";
import { getPokemonTcgIoUrl } from "@/services/cardImageService";

// Updated featured cards with correct IDs and information
const featuredCards = [
  {
    id: "swsh4-25",
    name: "Charizard VMAX",
    rarity: "Ultra Rare",
    condition: "Near Mint",
    estimatedValue: "$350-450"
  },
  {
    id: "swsh1-7",
    name: "Pikachu V",
    rarity: "Rare",
    condition: "Mint",
    estimatedValue: "$120-150"
  },
  {
    id: "sm12-222",
    name: "Mewtwo & Mew GX",
    rarity: "Ultra Rare",
    condition: "Excellent",
    estimatedValue: "$200-250"
  },
  {
    id: "swsh3-20",
    name: "Blastoise VMAX",
    rarity: "Rare Holo",
    condition: "Good",
    estimatedValue: "$80-120"
  }
];

const FeaturedCards = () => {
  const [processedCards, setProcessedCards] = useState(featuredCards.map(card => ({
    ...card,
    imageUrl: "" // Initial empty state for images
  })));
  
  useEffect(() => {
    // Get reliable image URLs for each card
    const updatedCards = featuredCards.map(card => {
      // Use the consistent format for card sets
      const imageUrl = getPokemonTcgIoUrl(card.id) || "";
      
      console.log(`Setting image URL for ${card.name}: ${imageUrl}`);
      
      return {
        ...card,
        imageUrl
      };
    });
    
    setProcessedCards(updatedCards);
  }, []);

  return (
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
          cards={processedCards} 
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
  );
};

export default FeaturedCards;
