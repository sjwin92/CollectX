
import React from "react";
import { Badge } from "@/components/ui/badge";
import { ArrowRightLeft, ArrowRight } from "lucide-react";

interface TradeListingDetailsProps {
  cardsWanted: string[];
  description: string;
}

const TradeListingDetails = ({ cardsWanted, description }: TradeListingDetailsProps) => {
  return (
    <div className="w-full md:w-2/3 space-y-3">
      <div className="border-b pb-2">
        <div className="flex items-center gap-2 mb-1">
          <ArrowRightLeft className="h-4 w-4 text-primary" />
          <h4 className="text-sm font-semibold">Looking to trade for:</h4>
        </div>
        <div className="flex flex-wrap gap-2">
          {cardsWanted.map((card, index) => (
            <Badge key={index} variant="secondary" className="text-xs">
              {card}
            </Badge>
          ))}
        </div>
      </div>
      
      <div>
        <h4 className="text-sm font-semibold mb-1">Trader's Notes:</h4>
        <p className="text-sm text-muted-foreground">
          {description}
        </p>
      </div>
    </div>
  );
};

export default TradeListingDetails;
