
import React from "react";
import { CardFooter } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { ArrowRightLeft, Eye, Star } from "lucide-react";
import { Link } from "react-router-dom";
import { useToast } from "@/hooks/use-toast";

interface TradeListingFooterProps {
  cardId: string;
  onProposeTrade: () => void;
  featured?: boolean;
}

const TradeListingFooter = ({ cardId, onProposeTrade, featured = false }: TradeListingFooterProps) => {
  const { toast } = useToast();

  const handleProposeTrade = () => {
    toast({
      title: "Preparing trade proposal",
      description: "Opening trade proposal form..."
    });
    
    onProposeTrade();
  };

  return (
    <CardFooter className="pt-3 flex flex-col gap-3 border-t mt-2">
      <Button variant="outline" size="sm" asChild className="w-full">
        <Link to={`/card/${cardId}`}>
          <Eye className="h-4 w-4 mr-2" />
          View Card
        </Link>
      </Button>
      <Button 
        size="sm" 
        onClick={handleProposeTrade} 
        className={`w-full ${featured ? "bg-amber-600 hover:bg-amber-700" : ""}`}
      >
        <ArrowRightLeft className="h-4 w-4 mr-2" />
        Propose Trade
        {featured && <Star className="h-3 w-3 ml-1 text-amber-200" />}
      </Button>
    </CardFooter>
  );
};

export default TradeListingFooter;
