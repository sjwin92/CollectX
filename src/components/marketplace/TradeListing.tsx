
import React from "react";
import { Card, CardContent } from "@/components/ui/card";
import { CardItemProps } from "@/components/cards/CardItem";
import TradeListingHeader from "./listing/TradeListingHeader";
import TradeListingImage from "./listing/TradeListingImage";
import TradeListingDetails from "./listing/TradeListingDetails";
import TradeListingFooter from "./listing/TradeListingFooter";
import TradeListingProtection from "./listing/TradeListingProtection";
import FeaturedBadge from "./listing/FeaturedBadge";
import { useNavigate } from "react-router-dom";

interface TradeListingProps {
  listing: {
    id: string;
    userId: string;
    username: string;
    cardOffered: CardItemProps;
    cardsWanted: string[];
    description: string;
    createdAt: Date;
    featured?: boolean;
  };
  onProposeTrade: () => void;
  featured?: boolean;
}

const TradeListing = ({ listing, onProposeTrade, featured = false }: TradeListingProps) => {
  const navigate = useNavigate();

  const handleProposeTrade = () => {
    // Call the parent component's handler first
    onProposeTrade();
    
    // In a real app, this would navigate to a trade proposal form with the listing ID
    // For now we'll just navigate to the trades page
    navigate(`/trades?propose=true&listingId=${listing.id}`);
  };

  return (
    <Card className={`overflow-hidden transition-all hover:shadow-md ${featured ? 'border-amber-400 shadow-lg dark:border-amber-500 bg-gradient-to-br from-transparent to-amber-50/5' : ''}`}>
      {featured && <FeaturedBadge />}
      
      <TradeListingHeader 
        cardName={listing.cardOffered.name}
        username={listing.username}
        createdAt={listing.createdAt}
        estimatedValue={listing.cardOffered.estimatedValue}
        featured={featured}
      />

      <CardContent className="py-2">
        <div className="flex flex-col gap-4 md:flex-row md:gap-6 md:items-center">
          <div className="flex justify-center md:block">
            <TradeListingImage 
              cardId={listing.cardOffered.id}
              imageUrl={listing.cardOffered.imageUrl}
              cardName={listing.cardOffered.name}
              condition={listing.cardOffered.condition}
              isFeatured={featured}
            />
          </div>
          
          <TradeListingDetails 
            cardsWanted={listing.cardsWanted}
            description={listing.description}
          />
        </div>
      </CardContent>

      <TradeListingFooter 
        cardId={listing.cardOffered.id}
        onProposeTrade={handleProposeTrade}
        featured={featured}
      />
      
      <TradeListingProtection />
    </Card>
  );
};

export default TradeListing;
