
import React from "react";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { CardItemProps } from "@/components/cards/CardItem";
import { ArrowRightLeft, Calendar, MessageSquare, User } from "lucide-react";
import { format } from "date-fns";
import { Link } from "react-router-dom";

interface TradeListingProps {
  listing: {
    id: string;
    userId: string;
    username: string;
    cardOffered: CardItemProps;
    cardsWanted: string[];
    description: string;
    createdAt: Date;
  };
  onProposeTrade: () => void;
}

const TradeListing = ({ listing, onProposeTrade }: TradeListingProps) => {
  return (
    <Card className="overflow-hidden">
      <CardHeader className="pb-3">
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
          <Badge variant="outline">
            {listing.cardOffered.estimatedValue}
          </Badge>
        </div>
      </CardHeader>

      <CardContent className="py-2">
        <div className="flex gap-6 items-center">
          <div className="w-1/3 relative group">
            <img 
              src={listing.cardOffered.imageUrl} 
              alt={listing.cardOffered.name}
              className="w-full h-auto rounded-md transition-transform duration-300 group-hover:scale-105"
              onError={(e) => {
                (e.target as HTMLImageElement).src = "/placeholder.svg";
              }}
            />
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
        <Button size="sm" onClick={onProposeTrade}>
          <ArrowRightLeft className="h-4 w-4 mr-2" />
          Propose Trade
        </Button>
      </CardFooter>
    </Card>
  );
};

export default TradeListing;
