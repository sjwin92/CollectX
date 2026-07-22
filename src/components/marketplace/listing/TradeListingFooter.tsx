
import React from "react";
import { CardFooter } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { ArrowRightLeft, Eye, Star } from "lucide-react";
import { Link } from "react-router-dom";
import { useToast } from "@/hooks/use-toast";
import { useUser } from "@/hooks/useUser";

interface TradeListingFooterProps {
  cardId: string;
  onProposeTrade: () => void;
  featured?: boolean;
  isOwnListing?: boolean;
}

const TradeListingFooter = ({ cardId, onProposeTrade, featured = false, isOwnListing = false }: TradeListingFooterProps) => {
  const { toast } = useToast();
  const { user } = useUser();

  const handleProposeTrade = () => {
    if (!user) {
      toast({
        title: "Authentication required",
        description: "Please sign in to propose trades",
        variant: "destructive"
      });
      return;
    }

    if (isOwnListing) return;

    onProposeTrade();
  };

  return (
    <CardFooter className="pt-3 pb-2 flex flex-col gap-2 border-t mt-2">
      <Button variant="outline" size="sm" asChild className="w-full">
        <Link to={`/card/${cardId}`}>
          <Eye className="h-4 w-4 mr-2" />
          View Card
        </Link>
      </Button>
      <Button 
        size="sm" 
        onClick={handleProposeTrade}
        disabled={isOwnListing}
        aria-label={isOwnListing ? "This is your listing" : "Propose a trade"}
        className={`w-full ${featured ? "bg-amber-600 hover:bg-amber-700" : ""}`}
      >
        <ArrowRightLeft className="h-4 w-4 mr-2" />
        {isOwnListing ? "Your Listing" : "Propose Trade"}
        {featured && !isOwnListing && <Star className="h-3 w-3 ml-1 text-amber-200" />}
      </Button>
    </CardFooter>
  );
};

export default TradeListingFooter;
