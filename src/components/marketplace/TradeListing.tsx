
import React from "react";
import { Card, CardContent } from "@/components/ui/card";
import { CardItemProps } from "@/components/cards/CardItem";
import TradeListingHeader from "./listing/TradeListingHeader";
import TradeListingImage from "./listing/TradeListingImage";
import TradeListingDetails from "./listing/TradeListingDetails";
import TradeListingFooter from "./listing/TradeListingFooter";
import TradeListingProtection from "./listing/TradeListingProtection";
import FeaturedBadge from "./listing/FeaturedBadge";

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
  return (
    <Card className={`overflow-hidden transition-all ${featured ? 'border-amber-400 shadow-lg dark:border-amber-500 bg-gradient-to-br from-transparent to-amber-50/5' : ''}`}>
      {featured && <FeaturedBadge />}
      
      <TradeListingHeader 
        cardName={listing.cardOffered.name}
        username={listing.username}
        createdAt={listing.createdAt}
        estimatedValue={listing.cardOffered.estimatedValue}
        featured={featured}
      />

      <CardContent className="py-2">
        <div className="flex gap-6 items-center">
          <TradeListingImage 
            cardId={listing.cardOffered.id}
            imageUrl={listing.cardOffered.imageUrl}
            cardName={listing.cardOffered.name}
            condition={listing.cardOffered.condition}
          />
          
          <TradeListingDetails 
            cardsWanted={listing.cardsWanted}
            description={listing.description}
          />
        </div>
      </CardContent>

      <TradeListingFooter 
        cardId={listing.cardOffered.id}
        onProposeTrade={onProposeTrade}
        featured={featured}
      />
      
      <TradeListingProtection />
    </Card>
  );
};

export default TradeListing;
