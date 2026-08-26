import { formatGbp } from "@/lib/cardPrice";
import { useCardPrices } from "@/hooks/useCardPrices";

interface CardPriceProps {
  /** Pre-resolved GBP price (preferred — pass from a page-level useCardPrices). */
  priceGbp?: number | null;
  /** Or a card id to fetch on its own (fine for a single card view). */
  cardId?: string;
  /** Show the small "Market" caption above the figure. */
  label?: boolean;
  className?: string;
}

/**
 * Live TCGplayer market price for a card, shown in gold. Renders nothing when
 * the card has no price on record so callers can drop it in unconditionally.
 */
const CardPrice = ({ priceGbp, cardId, label = false, className }: CardPriceProps) => {
  const fetched = useCardPrices(priceGbp === undefined && cardId ? [cardId] : []);
  const resolved = priceGbp ?? (cardId ? fetched.get(cardId) : undefined);
  if (!resolved || resolved <= 0) return null;

  return (
    <span className={`inline-flex flex-col leading-none ${className ?? ""}`}>
      {label && (
        <span className="text-[9px] uppercase tracking-wider text-muted-foreground/70">Market</span>
      )}
      <span className="font-display text-sm font-extrabold text-gold tabular-nums">
        {formatGbp(resolved)}
      </span>
    </span>
  );
};

export default CardPrice;
