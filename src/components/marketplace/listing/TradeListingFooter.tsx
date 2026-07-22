
import React, { useState } from "react";
import { CardFooter } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { ArrowRightLeft, Eye, Star, MessageCircle, Loader2 } from "lucide-react";
import { Link, useNavigate } from "react-router-dom";
import { useToast } from "@/hooks/use-toast";
import { useUser } from "@/hooks/useUser";
import { getOrCreateConversation } from "@/services/supabaseNotificationService";

interface TradeListingFooterProps {
  cardId: string;
  onProposeTrade: () => void;
  featured?: boolean;
  sellerId?: string;
}

const TradeListingFooter = ({ cardId, onProposeTrade, featured = false, sellerId }: TradeListingFooterProps) => {
  const { toast } = useToast();
  const { user } = useUser();
  const navigate = useNavigate();
  const [messaging, setMessaging] = useState(false);

  const handleProposeTrade = () => {
    if (!user) {
      toast({
        title: "Authentication required",
        description: "Please sign in to propose trades",
        variant: "destructive"
      });
      return;
    }

    toast({
      title: "Preparing trade proposal",
      description: "Opening trade proposal form..."
    });

    onProposeTrade();
  };

  const handleMessageSeller = async () => {
    if (!user) {
      toast({
        title: "Authentication required",
        description: "Please sign in to message the seller",
        variant: "destructive"
      });
      return;
    }
    if (!sellerId) return;

    setMessaging(true);
    try {
      const conversationId = await getOrCreateConversation(sellerId);
      navigate(`/messages?conversation=${conversationId}`);
    } catch (error) {
      toast({
        variant: "destructive",
        title: "Couldn't start conversation",
        description: error instanceof Error ? error.message : "Please try again.",
      });
    } finally {
      setMessaging(false);
    }
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
        className={`w-full ${featured ? "bg-amber-600 hover:bg-amber-700" : ""}`}
      >
        <ArrowRightLeft className="h-4 w-4 mr-2" />
        Propose Trade
        {featured && <Star className="h-3 w-3 ml-1 text-amber-200" />}
      </Button>
      {sellerId && sellerId !== user?.id && (
        <Button variant="outline" size="sm" className="w-full" onClick={handleMessageSeller} disabled={messaging}>
          {messaging ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : <MessageCircle className="h-4 w-4 mr-2" />}
          Message Seller
        </Button>
      )}
    </CardFooter>
  );
};

export default TradeListingFooter;
