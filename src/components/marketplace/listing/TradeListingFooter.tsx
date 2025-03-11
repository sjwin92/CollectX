
import React from "react";
import { CardFooter } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { ArrowRightLeft } from "lucide-react";
import { Link } from "react-router-dom";
import { useToast } from "@/hooks/use-toast";

interface TradeListingFooterProps {
  cardId: string;
  tradeId?: string;
  onProposeTrade: () => void;
  featured?: boolean;
}

const TradeListingFooter = ({ cardId, tradeId, onProposeTrade, featured = false }: TradeListingFooterProps) => {
  const { toast } = useToast();
  
  const handleProposeTrade = () => {
    onProposeTrade();
    toast({
      title: "Trade Proposal Initiated",
      description: "You can now select cards to offer in exchange.",
    });
  };

  return (
    <>
      <CardFooter className="pt-3 flex justify-between">
        <Button variant="outline" size="sm" asChild>
          <Link to={`/card/${cardId}`}>
            View Card Details
          </Link>
        </Button>
        {tradeId ? (
          <Button size="sm" variant="secondary" asChild>
            <Link to={`/trades/${tradeId}`}>
              View Trade Details
            </Link>
          </Button>
        ) : (
          <Button 
            size="sm" 
            onClick={handleProposeTrade} 
            className={featured ? "bg-amber-600 hover:bg-amber-700" : ""}
          >
            <ArrowRightLeft className="h-4 w-4 mr-2" />
            Propose Trade
          </Button>
        )}
      </CardFooter>
    </>
  );
};

export default TradeListingFooter;
