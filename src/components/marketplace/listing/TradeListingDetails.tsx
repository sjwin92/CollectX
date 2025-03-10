
import React from "react";
import { Badge } from "@/components/ui/badge";

interface TradeListingDetailsProps {
  cardsWanted: string[];
  description: string;
}

const TradeListingDetails = ({ cardsWanted, description }: TradeListingDetailsProps) => {
  return (
    <div className="w-2/3 space-y-3">
      <div>
        <h4 className="text-sm font-medium mb-1">Looking for:</h4>
        <div className="flex flex-wrap gap-2">
          {cardsWanted.map((card, index) => (
            <Badge key={index} variant="outline" className="text-xs">
              {card}
            </Badge>
          ))}
        </div>
      </div>
      
      <div>
        <h4 className="text-sm font-medium mb-1">Description:</h4>
        <p className="text-sm text-muted-foreground">
          {description}
        </p>
      </div>
    </div>
  );
};

export default TradeListingDetails;
