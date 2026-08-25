
import React from "react";
import { CardTitle, CardDescription, CardHeader } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Calendar, User } from "lucide-react";
import { format } from "date-fns";
import TraderTrustBadge from "@/components/common/TraderTrustBadge";

interface TradeListingHeaderProps {
  cardName: string;
  username: string;
  createdAt: Date;
  estimatedValue: string;
  featured?: boolean;
  sellerTotalTrades?: number;
  sellerReputationScore?: number;
}

const TradeListingHeader = ({
  cardName,
  username,
  createdAt,
  estimatedValue,
  featured = false,
  sellerTotalTrades = 0,
  sellerReputationScore = 0,
}: TradeListingHeaderProps) => {
  return (
    <CardHeader className={`pb-3 ${featured ? 'pt-3' : 'pt-5'}`}>
      <div className="flex justify-between items-start">
        <div>
          <CardTitle>{cardName}</CardTitle>
          <CardDescription>
            <div className="flex items-center gap-1 text-sm mt-1 flex-wrap">
              <User className="h-3 w-3" />
              <span>{username}</span>
              <span className="mx-1">•</span>
              <Calendar className="h-3 w-3" />
              <span>{format(createdAt, 'MMM d')}</span>
              <TraderTrustBadge
                totalTrades={sellerTotalTrades}
                reputationScore={sellerReputationScore}
                className="ml-1"
              />
            </div>
          </CardDescription>
        </div>
        <Badge variant="outline" className={featured ? "bg-amber-400/10" : ""}>
          {estimatedValue}
        </Badge>
      </div>
    </CardHeader>
  );
};

export default TradeListingHeader;
