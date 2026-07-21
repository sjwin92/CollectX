
import React from "react";
import { CardTitle, CardDescription, CardHeader } from "@/components/ui/card";
import { Calendar, User } from "lucide-react";
import { format } from "date-fns";

interface TradeListingHeaderProps {
  cardName: string;
  username: string;
  createdAt: Date;
  featured?: boolean;
}

const TradeListingHeader = ({ 
  cardName, 
  username, 
  createdAt, 
  featured = false 
}: TradeListingHeaderProps) => {
  return (
    <CardHeader className={`pb-3 ${featured ? 'pt-3' : 'pt-5'}`}>
      <div className="flex justify-between items-start">
        <div>
          <CardTitle>{cardName}</CardTitle>
          <CardDescription>
            <div className="flex items-center gap-1 text-sm mt-1">
              <User className="h-3 w-3" /> 
              <span>{username}</span>
              <span className="mx-1">•</span>
              <Calendar className="h-3 w-3" /> 
              <span>{format(createdAt, 'MMM d')}</span>
            </div>
          </CardDescription>
        </div>
      </div>
    </CardHeader>
  );
};

export default TradeListingHeader;
