import React from "react";
import { Link, useNavigate } from "react-router-dom";
import { format } from "date-fns";
import { ArrowRightLeft, ShoppingBag, Star, Shield } from "lucide-react";
import { CardItemProps } from "@/components/cards/CardItem";
import TradeListingImage from "./listing/TradeListingImage";
import TradeListingFooter from "./listing/TradeListingFooter";
import TraderTrustBadge from "@/components/common/TraderTrustBadge";
import CardTypeBadge from "@/components/pokemon/CardTypeBadge";
import type { CardTypeMeta } from "@/lib/cardTypeLabel";

interface TradeListingProps {
  listing: {
    id: string;
    userId: string;
    username: string;
    cardOffered: CardItemProps;
    cardsWanted: string[];
    description: string;
    createdAt: Date;
    featured?: boolean;
    listingType?: 'trade' | 'sale';
    askingPrice?: number;
    currency?: string;
    sellerTotalTrades?: number;
    sellerReputationScore?: number;
  };
  onProposeTrade: () => void;
  featured?: boolean;
  cardMeta?: CardTypeMeta | null;
  /** Live TCGplayer market price (GBP) for the offered card, if known. */
  marketPriceGbp?: number | null;
}

const TradeListing = ({ listing, onProposeTrade, featured = false, cardMeta, marketPriceGbp }: TradeListingProps) => {
  const navigate = useNavigate();
  const isSale = (listing.listingType ?? 'trade') === 'sale';

  const handleProposeTrade = () => {
    onProposeTrade();
    navigate(`/listings/${listing.id}`);
  };

  return (
    <article
      className={`group relative overflow-hidden rounded-2xl border bg-card shadow-[0_26px_54px_-24px_rgba(0,0,0,0.8)] hover-lift ${
        featured ? 'border-gold/40' : 'border-border'
      }`}
    >
      {featured && (
        <div
          className="flex items-center gap-1.5 px-4 py-2 font-display text-[11px] font-semibold uppercase tracking-wide text-gold"
          style={{ background: 'linear-gradient(90deg, hsl(var(--gold) / 0.16), hsl(var(--gold) / 0.02))' }}
        >
          <Star className="h-3 w-3 fill-current" />
          Featured listing
        </div>
      )}

      <div className="flex gap-5 p-5">
        <TradeListingImage
          cardId={listing.cardOffered.id}
          imageUrl={listing.cardOffered.imageUrl}
          cardName={listing.cardOffered.name}
          condition={listing.cardOffered.condition}
          isFeatured={featured}
        />

        <div className="flex min-w-0 flex-1 flex-col">
          <div className="flex flex-wrap items-center gap-2">
            <Link
              to={`/listings/${listing.id}`}
              className="font-display text-lg font-bold leading-tight transition-colors hover:text-primary"
            >
              {listing.cardOffered.name}
            </Link>
            <CardTypeBadge meta={cardMeta} />
          </div>

          <div className="mt-1.5 flex flex-wrap items-center gap-x-2 gap-y-1 text-xs text-muted-foreground">
            <span>@{listing.username}</span>
            <span aria-hidden>·</span>
            <span>{format(listing.createdAt, 'MMM d')}</span>
            <TraderTrustBadge
              totalTrades={listing.sellerTotalTrades ?? 0}
              reputationScore={listing.sellerReputationScore ?? 0}
            />
          </div>

          {isSale ? (
            <div className="mt-4 flex items-center gap-1.5 text-xs font-semibold text-muted-foreground">
              <ShoppingBag className="h-3.5 w-3.5 text-gold" />
              For sale
            </div>
          ) : (
            listing.cardsWanted.length > 0 && (
              <div className="mt-4">
                <div className="mb-2 flex items-center gap-1.5 text-xs font-semibold text-muted-foreground">
                  <ArrowRightLeft className="h-3.5 w-3.5 text-primary" />
                  Wants in trade
                </div>
                <div className="flex flex-wrap gap-1.5">
                  {listing.cardsWanted.slice(0, 4).map((card, i) => (
                    <span
                      key={i}
                      className="rounded-full border border-border bg-secondary px-2.5 py-1 text-[11px] text-foreground"
                    >
                      {card}
                    </span>
                  ))}
                  {listing.cardsWanted.length > 4 && (
                    <span className="rounded-full border border-border bg-secondary px-2.5 py-1 text-[11px] text-muted-foreground">
                      +{listing.cardsWanted.length - 4}
                    </span>
                  )}
                </div>
              </div>
            )
          )}

          {listing.description && (
            <p className="mt-3 line-clamp-2 text-xs leading-relaxed text-muted-foreground">
              {listing.description}
            </p>
          )}

          <div className="mt-auto flex items-center gap-1.5 pt-3 text-[11px] text-muted-foreground/70">
            <Shield className="h-3 w-3" />
            {isSale ? 'Payment held until delivery is confirmed' : 'Both sides confirm receipt'}
          </div>
        </div>
      </div>

      <TradeListingFooter
        cardId={listing.cardOffered.id}
        listingId={listing.id}
        listingOwnerId={listing.userId}
        onProposeTrade={handleProposeTrade}
        featured={featured}
        listingType={listing.listingType ?? 'trade'}
        askingPrice={listing.askingPrice}
        currency={listing.currency}
        estimatedValue={listing.cardOffered.estimatedValue}
        marketPriceGbp={marketPriceGbp}
      />
    </article>
  );
};

export default TradeListing;
