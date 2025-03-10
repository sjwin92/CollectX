import React, { useState } from "react";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { CardItemProps } from "@/components/cards/CardItem";
import { ArrowRightLeft, Calendar, MessageSquare, User, Star, Shield, AlertTriangle, RefreshCw } from "lucide-react";
import { format } from "date-fns";
import { Link } from "react-router-dom";
import { getReliableImageUrl } from "@/services/pokemonTcgApi";

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
  const [imageError, setImageError] = useState(false);
  const [imageSrc, setImageSrc] = useState(() => {
    if (listing.cardOffered.id) {
      return getReliableImageUrl(listing.cardOffered.id, 'small');
    }
    return listing.cardOffered.imageUrl;
  });
  
  const handleImageError = () => {
    if (imageError) return;
    
    if (listing.cardOffered.id) {
      const newSrc = getReliableImageUrl(listing.cardOffered.id, 'large');
      console.log(`Trying alternative image source: ${newSrc}`);
      setImageSrc(newSrc);
    } else {
      setImageError(true);
    }
  };
  
  const retryImage = () => {
    setImageError(false);
    if (listing.cardOffered.id) {
      setImageSrc(getReliableImageUrl(listing.cardOffered.id, 'small'));
    } else {
      setImageSrc(listing.cardOffered.imageUrl);
    }
  };
  
  return (
    <Card className={`overflow-hidden transition-all ${featured ? 'border-amber-400 shadow-lg dark:border-amber-500 bg-gradient-to-br from-transparent to-amber-50/5' : ''}`}>
      {featured && (
        <div className="bg-amber-400 dark:bg-amber-500 text-primary-foreground px-3 py-1 text-xs font-medium flex items-center justify-center">
          <Star className="h-3 w-3 mr-1 fill-current" /> Featured Listing
        </div>
      )}
      
      <CardHeader className={`pb-3 ${featured ? 'pt-3' : 'pt-5'}`}>
        <div className="flex justify-between items-start">
          <div>
            <CardTitle>{listing.cardOffered.name}</CardTitle>
            <CardDescription>
              <div className="flex items-center gap-1 text-sm mt-1">
                <User className="h-3 w-3" /> 
                <span>{listing.username}</span>
                <span className="mx-1">•</span>
                <Calendar className="h-3 w-3" /> 
                <span>{format(listing.createdAt, 'MMM d')}</span>
              </div>
            </CardDescription>
          </div>
          <Badge variant="outline" className={featured ? "bg-amber-400/10" : ""}>
            {listing.cardOffered.estimatedValue}
          </Badge>
        </div>
      </CardHeader>

      <CardContent className="py-2">
        <div className="flex gap-6 items-center">
          <div className="w-1/3 relative group">
            {!imageError ? (
              <img 
                src={imageSrc} 
                alt={listing.cardOffered.name}
                className="w-full h-auto rounded-md transition-transform duration-300 group-hover:scale-105"
                onError={handleImageError}
              />
            ) : (
              <div className="w-full aspect-[2/3] bg-muted flex flex-col items-center justify-center rounded-md">
                <AlertTriangle className="h-5 w-5 text-amber-500 mb-1" />
                <span className="text-xs text-muted-foreground mb-2">Image unavailable</span>
                <Button 
                  size="sm" 
                  variant="outline" 
                  className="text-xs" 
                  onClick={(e) => {
                    e.stopPropagation();
                    retryImage();
                  }}
                >
                  <RefreshCw className="h-3 w-3 mr-1" /> Retry
                </Button>
              </div>
            )}
            <div className="absolute top-2 right-2">
              <Badge variant="secondary" className="text-xs">
                {listing.cardOffered.condition}
              </Badge>
            </div>
          </div>
          
          <div className="w-2/3 space-y-3">
            <div>
              <h4 className="text-sm font-medium mb-1">Looking for:</h4>
              <div className="flex flex-wrap gap-2">
                {listing.cardsWanted.map((card, index) => (
                  <Badge key={index} variant="outline" className="text-xs">
                    {card}
                  </Badge>
                ))}
              </div>
            </div>
            
            <div>
              <h4 className="text-sm font-medium mb-1">Description:</h4>
              <p className="text-sm text-muted-foreground">
                {listing.description}
              </p>
            </div>
          </div>
        </div>
      </CardContent>

      <CardFooter className="pt-3 flex justify-between">
        <Button variant="outline" size="sm" asChild>
          <Link to={`/card/${listing.cardOffered.id}`}>
            View Card Details
          </Link>
        </Button>
        <Button size="sm" onClick={onProposeTrade} className={featured ? "bg-amber-600 hover:bg-amber-700" : ""}>
          <ArrowRightLeft className="h-4 w-4 mr-2" />
          Propose Trade
        </Button>
      </CardFooter>
      
      <div className="px-4 pb-3 pt-0 flex items-center justify-center">
        <div className="flex items-center gap-1 text-xs text-muted-foreground">
          <Shield className="h-3 w-3" />
          <span>Protected by CollectX Escrow</span>
        </div>
      </div>
    </Card>
  );
};

export default TradeListing;
