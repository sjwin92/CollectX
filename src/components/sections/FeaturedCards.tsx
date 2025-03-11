
import React, { useState, useEffect } from "react";
import { Link } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { ArrowRight } from "lucide-react";
import CardGrid from "@/components/cards/CardGrid";
import { findWorkingImageUrl, getTCGDexUrl } from "@/services/cardImageService";

const featuredCards = [
  {
    id: "swsh4-25",
    name: "Charizard VMAX",
    imageUrl: "https://images.pokemontcg.io/swsh4/25_hires.png",
    rarity: "Ultra Rare",
    condition: "Near Mint",
    estimatedValue: "$350-450"
  },
  {
    id: "swsh1-7",
    name: "Pikachu V",
    imageUrl: "https://images.pokemontcg.io/swsh1/7_hires.png",
    rarity: "Rare",
    condition: "Mint",
    estimatedValue: "$120-150"
  },
  {
    id: "sm12-222",
    name: "Mewtwo & Mew GX",
    imageUrl: "https://images.pokemontcg.io/sm12/222_hires.png",
    rarity: "Ultra Rare",
    condition: "Excellent",
    estimatedValue: "$200-250"
  },
  {
    id: "swsh3-20",
    name: "Blastoise VMAX",
    imageUrl: "https://images.pokemontcg.io/swsh3/20_hires.png",
    rarity: "Rare Holo",
    condition: "Good",
    estimatedValue: "$80-120"
  }
];

const FeaturedCards = () => {
  const [processedCards, setProcessedCards] = useState(featuredCards);
  
  useEffect(() => {
    const processImages = async () => {
      const processedCards = await Promise.all(
        featuredCards.map(async (card) => {
          try {
            // First try TCGDex directly, which is working for card sets
            const tcgdexUrl = getTCGDexUrl(card.id);
            if (tcgdexUrl) {
              return {
                ...card,
                imageUrl: tcgdexUrl
              };
            }
            
            // If TCGDex direct URL isn't available, find best working image
            const workingImageUrl = await findWorkingImageUrl({
              id: card.id,
              name: card.name,
              imageUrl: card.imageUrl
            });
            
            return {
              ...card,
              imageUrl: workingImageUrl
            };
          } catch (error) {
            console.error(`Error processing card image for ${card.name}:`, error);
            return card;
          }
        })
      );
      
      setProcessedCards(processedCards);
    };
    
    processImages();
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
