import React, { useState } from "react";
import { Button } from "@/components/ui/button";
import { ArrowRightLeft, Eye, Heart, MessageCircle, ShoppingBag } from "lucide-react";
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
  estimatedValue?: string;
  /** Live TCGplayer market price (GBP) for the offered card, if known. */
  marketPriceGbp?: number | null;
}

const iconBtnClass =
  "flex h-9 w-9 items-center justify-center rounded-full border border-border bg-secondary text-muted-foreground transition-all hover:-translate-y-0.5 hover:border-white/20 hover:text-foreground disabled:opacity-50 disabled:hover:translate-y-0";

const IconButton = ({ label, onClick, children, disabled }: {
  label: string;
  onClick?: () => void;
  children: React.ReactNode;
  disabled?: boolean;
}) => (
  <button type="button" title={label} aria-label={label} onClick={onClick} disabled={disabled} className={iconBtnClass}>
    {children}
  </button>
);

const TradeListingFooter = ({
  cardId,
  listingId,
  listingOwnerId,
  onProposeTrade,
  featured = false,
  listingType = 'trade',
  askingPrice,
  currency = 'gbp',
  estimatedValue,
  marketPriceGbp,
}: TradeListingFooterProps) => {
  const { toast } = useToast();
  const { user } = useUser();
  const [interestSubmitting, setInterestSubmitting] = useState(false);
  const [interestSent, setInterestSent] = useState(false);
  const [isMessageOpen, setIsMessageOpen] = useState(false);
  const [isBuying, setIsBuying] = useState(false);

  const requireAuth = (action: string) => {
    toast({ title: "Sign in required", description: `Please sign in to ${action}.`, variant: "destructive" });
  };

  const handleBuyNow = async () => {
    if (!user) return requireAuth("buy this card");
    setIsBuying(true);
    try {
      const url = await createCheckoutSession(listingId);
      window.location.href = url;
    } catch (error) {
      toast({
        title: "Couldn't start checkout",
        description: (error as { message?: string })?.message || "This listing may no longer be available. Please try again.",
        variant: "destructive",
      });
      setIsBuying(false);
    }
  };

  const handleMessageSeller = () => {
    if (!user) return requireAuth("message the seller");
    setIsMessageOpen(true);
  };

  const handleProposeTrade = () => {
    if (!user) return requireAuth("propose trades");
    onProposeTrade();
  };

  const handleExpressInterest = async () => {
    if (!user) return requireAuth("express interest");
    setInterestSubmitting(true);
    try {
      await expressInterest(listingId, 'trade');
      setInterestSent(true);
      toast({ title: "Interest sent", description: "The listing owner has been notified." });
    } catch (error) {
      if ((error as { code?: string })?.code === '23505') {
        setInterestSent(true);
        toast({ title: "Already sent", description: "You've already expressed interest in this listing." });
      } else {
        toast({ title: "Something went wrong", description: "Could not send your interest. Please try again.", variant: "destructive" });
      }
    } finally {
      setInterestSubmitting(false);
    }
  };

  const isOwnListing = !!user && user.id === listingOwnerId;
  const isSale = listingType === 'sale';
  const hasMarketPrice = !isSale && marketPriceGbp != null && marketPriceGbp > 0;
  const priceCaption = isSale ? "Price" : hasMarketPrice ? "Market price" : "Est. value";
  const priceLabel = isSale
    ? `${currency.toUpperCase()} ${askingPrice != null ? askingPrice.toFixed(2) : "—"}`
    : hasMarketPrice
      ? `£${marketPriceGbp!.toFixed(2)}`
      : (estimatedValue && estimatedValue.toLowerCase() !== "unknown" ? estimatedValue : "—");

  return (
    <div className="flex flex-wrap items-center justify-between gap-x-3 gap-y-2 border-t border-border bg-muted/40 px-5 py-3.5">
      <div className="flex flex-col">
        <span className="text-[10px] uppercase tracking-wider text-muted-foreground/70">
          {priceCaption}
        </span>
        <span className="font-display text-lg font-extrabold text-gold tabular-nums">{priceLabel}</span>
        {hasMarketPrice && (
          <span className="text-[9px] text-muted-foreground/60">TCGplayer, live</span>
        )}
      </div>

      <div className="flex flex-1 items-center justify-end gap-2">
        <Link to={`/card/${cardId}`} title="View card" aria-label="View card" className={iconBtnClass}>
          <Eye className="h-4 w-4" />
        </Link>

        {!isOwnListing && (
          <>
            <IconButton
              label={interestSent ? "Interest sent" : "I'm interested"}
              onClick={handleExpressInterest}
              disabled={interestSubmitting || interestSent}
            >
              <Heart className={`h-4 w-4 ${interestSent ? "fill-current text-primary" : ""}`} />
            </IconButton>
            <IconButton label="Message seller" onClick={handleMessageSeller}>
              <MessageCircle className="h-4 w-4" />
            </IconButton>
          </>
        )}

        {isSale ? (
          !isOwnListing && (
            <Button
              size="sm"
              onClick={handleBuyNow}
              disabled={isBuying}
              className="rounded-full bg-gold px-4 font-semibold text-black shadow-[0_12px_30px_-12px_hsl(var(--gold)/0.6)] hover:bg-gold/90"
            >
              <ShoppingBag className="mr-1.5 h-4 w-4" />
              {isBuying ? "Redirecting…" : "Buy now"}
            </Button>
          )
        ) : (
          <Button
            size="sm"
            onClick={handleProposeTrade}
            className="rounded-full px-4 font-semibold shadow-[0_12px_30px_-12px_hsl(var(--primary)/0.6)]"
          >
            <ArrowRightLeft className="mr-1.5 h-4 w-4" />
            Propose trade
          </Button>
        )}
      </div>

      <SocialTradeHub
        isOpen={isMessageOpen}
        onClose={() => setIsMessageOpen(false)}
        otherUserId={listingOwnerId}
      />
    </div>
  );
};

export default TradeListingFooter;
