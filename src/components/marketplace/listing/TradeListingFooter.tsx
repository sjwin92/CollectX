
import React, { useState } from "react";
import { CardFooter } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { ArrowRightLeft, Eye, Star, Heart, MessageCircle, ShoppingBag } from "lucide-react";
import { Link } from "react-router-dom";
import { useToast } from "@/hooks/use-toast";
import { useUser } from "@/hooks/useUser";
import { expressInterest, createCheckoutSession } from "@/services/supabaseMarketplaceService";
import SocialTradeHub from "@/components/trades/SocialTradeHub";

interface TradeListingFooterProps {
  cardId: string;
  listingId: string;
  listingOwnerId: string;
  onProposeTrade: () => void;
  featured?: boolean;
  listingType?: 'trade' | 'sale';
  askingPrice?: number;
  currency?: string;
}

const TradeListingFooter = ({
  cardId,
  listingId,
  listingOwnerId,
  onProposeTrade,
  featured = false,
  listingType = 'trade',
  askingPrice,
  currency = 'gbp',
}: TradeListingFooterProps) => {
  const { toast } = useToast();
  const { user } = useUser();
  const [interestSubmitting, setInterestSubmitting] = useState(false);
  const [interestSent, setInterestSent] = useState(false);
  const [isMessageOpen, setIsMessageOpen] = useState(false);
  const [isBuying, setIsBuying] = useState(false);

  const handleBuyNow = async () => {
    if (!user) {
      toast({
        title: "Authentication required",
        description: "Please sign in to buy this card",
        variant: "destructive"
      });
      return;
    }

    setIsBuying(true);
    try {
      const url = await createCheckoutSession(listingId);
      window.location.href = url;
    } catch (error) {
      toast({
        title: "Couldn't start checkout",
        description: (error as { message?: string })?.message || "This listing may no longer be available. Please try again.",
        variant: "destructive"
      });
      setIsBuying(false);
    }
  };

  const handleMessageSeller = () => {
    if (!user) {
      toast({
        title: "Authentication required",
        description: "Please sign in to message the seller",
        variant: "destructive"
      });
      return;
    }
    setIsMessageOpen(true);
  };

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

  const handleExpressInterest = async () => {
    if (!user) {
      toast({
        title: "Authentication required",
        description: "Please sign in to express interest",
        variant: "destructive"
      });
      return;
    }

    setInterestSubmitting(true);
    try {
      await expressInterest(listingId, 'trade');
      setInterestSent(true);
      toast({
        title: "Interest sent",
        description: "The listing owner has been notified."
      });
    } catch (error) {
      if ((error as { code?: string })?.code === '23505') {
        setInterestSent(true);
        toast({
          title: "Already sent",
          description: "You've already expressed interest in this listing."
        });
      } else {
        toast({
          title: "Something went wrong",
          description: "Could not send your interest. Please try again.",
          variant: "destructive"
        });
      }
    } finally {
      setInterestSubmitting(false);
    }
  };

  const isOwnListing = !!user && user.id === listingOwnerId;

  return (
    <CardFooter className="pt-3 pb-2 flex flex-col gap-2 border-t mt-2">
      <Button variant="outline" size="sm" asChild className="w-full">
        <Link to={`/card/${cardId}`}>
          <Eye className="h-4 w-4 mr-2" />
          View Card
        </Link>
      </Button>
      {listingType === 'sale' ? (
        !isOwnListing && (
          <Button
            size="sm"
            onClick={handleBuyNow}
            disabled={isBuying}
            className={`w-full ${featured ? "bg-amber-600 hover:bg-amber-700" : ""}`}
          >
            <ShoppingBag className="h-4 w-4 mr-2" />
            {isBuying ? "Redirecting..." : `Buy Now — ${currency.toUpperCase()} ${askingPrice?.toFixed(2)}`}
            {featured && <Star className="h-3 w-3 ml-1 text-amber-200" />}
          </Button>
        )
      ) : (
        <Button
          size="sm"
          onClick={handleProposeTrade}
          className={`w-full ${featured ? "bg-amber-600 hover:bg-amber-700" : ""}`}
        >
          <ArrowRightLeft className="h-4 w-4 mr-2" />
          Propose Trade
          {featured && <Star className="h-3 w-3 ml-1 text-amber-200" />}
        </Button>
      )}
      {!isOwnListing && (
        <>
          <Button
            variant="outline"
            size="sm"
            className="w-full"
            disabled={interestSubmitting || interestSent}
            onClick={handleExpressInterest}
          >
            <Heart className="h-4 w-4 mr-2" />
            {interestSent ? "Interest Sent" : "I'm Interested"}
          </Button>
          <Button variant="outline" size="sm" className="w-full" onClick={handleMessageSeller}>
            <MessageCircle className="h-4 w-4 mr-2" />
            Message Seller
          </Button>
          <SocialTradeHub
            isOpen={isMessageOpen}
            onClose={() => setIsMessageOpen(false)}
            otherUserId={listingOwnerId}
          />
        </>
      )}
    </CardFooter>
  );
};

export default TradeListingFooter;
