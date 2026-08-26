import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import GlassCard from "@/components/ui/custom/GlassCard";
import TraderTrustBadge from "@/components/common/TraderTrustBadge";
import CardTypeBadge from "@/components/pokemon/CardTypeBadge";
import CardPrice from "@/components/pokemon/CardPrice";
import { useCardTypeMeta } from "@/hooks/useCardTypeMeta";
import { useCardPrices } from "@/hooks/useCardPrices";
import { formatGbp } from "@/lib/cardPrice";
import { conditionTone } from "@/components/marketplace/listing/conditionTone";
import { SmartImage } from "@/components/common/SmartImage";
import { ArrowUp, ArrowDown } from "lucide-react";
import type { TradeProposal } from "@/models/trade";
import type { CardTypeMeta } from "@/lib/cardTypeLabel";

type Side = TradeProposal["initiator"] | TradeProposal["recipient"];

const SidePanel = ({
  label,
  direction,
  side,
  ownerCaption,
  metaFor,
  priceFor,
}: {
  label: string;
  direction: "send" | "receive";
  side: Side;
  ownerCaption: string;
  metaFor: (id: string) => CardTypeMeta | undefined;
  priceFor: (id: string) => number | undefined;
}) => {
  const cards = side.offeringCards;
  const sideTotal = cards.reduce(
    (sum, card) => sum + (priceFor(card.id) ?? 0) * (card.quantity ?? 1),
    0,
  );
  return (
    <div className="rounded-2xl border border-border bg-secondary/30 p-4">
      <div className="flex items-center justify-between">
        <span
          className={`inline-flex items-center gap-1.5 font-display text-[13px] font-extrabold ${
            direction === "send" ? "text-red-300" : "text-emerald-300"
          }`}
        >
          {direction === "send" ? <ArrowUp className="h-4 w-4" /> : <ArrowDown className="h-4 w-4" />}
          {label}
        </span>
        <span className="text-[11px] text-muted-foreground">{ownerCaption}</span>
      </div>

      <div className="mt-3 space-y-3">
        {cards.length === 0 && <p className="text-sm text-muted-foreground">No cards on this side.</p>}
        {cards.map((card) => (
          <div key={card.id} className="flex gap-3">
            <div className="relative h-24 w-[68px] shrink-0 overflow-hidden rounded-lg border border-white/10 bg-muted shadow-[0_14px_26px_-16px_rgba(0,0,0,0.8)]">
              {card.imageUrl ? (
                <SmartImage src={card.imageUrl} alt={card.name} className="h-full w-full object-cover" />
              ) : (
                <span className="flex h-full items-center justify-center text-[10px] text-muted-foreground">No image</span>
              )}
              {(card.quantity ?? 1) > 1 && (
                <span className="absolute right-1 top-1 flex h-4 min-w-4 items-center justify-center rounded-full bg-primary px-1 text-[10px] font-bold text-primary-foreground">
                  {card.quantity}
                </span>
              )}
            </div>
            <div className="min-w-0 flex-1">
              <div className="flex items-start justify-between gap-2">
                <div className="font-display text-sm font-bold leading-tight">{card.name}</div>
                <CardPrice priceGbp={priceFor(card.id) ?? null} />
              </div>
              <div className="mt-1.5 flex flex-wrap items-center gap-1.5">
                <CardTypeBadge meta={metaFor(card.id) ?? null} />
                {card.condition && (
                  <span className={`inline-flex items-center rounded-full border px-2 py-[3px] text-[10px] font-semibold ${conditionTone(card.condition)}`}>
                    {card.condition}
                  </span>
                )}
                {card.graded && card.gradingCompany && (
                  <span className="inline-flex items-center rounded-full border border-border bg-secondary px-2 py-[3px] text-[10px] font-semibold text-muted-foreground">
                    {card.gradingCompany} {card.grade}
                  </span>
                )}
              </div>
            </div>
          </div>
        ))}
      </div>

      {sideTotal > 0 && (
        <div className="mt-3 flex items-center justify-between border-t border-border/60 pt-3 text-xs">
          <span className="uppercase tracking-wider text-muted-foreground/70">Market value</span>
          <span className="font-display text-sm font-extrabold text-gold tabular-nums">
            ≈ {formatGbp(sideTotal)}
          </span>
        </div>
      )}

      <div className="mt-4 flex items-center gap-2.5 border-t border-border/60 pt-3">
        <Avatar className="h-8 w-8">
          <AvatarImage src="" alt={side.username} />
          <AvatarFallback className="text-[11px]">{side.username.substring(0, 2).toUpperCase()}</AvatarFallback>
        </Avatar>
        <span className="text-sm font-semibold">{side.username}</span>
        <TraderTrustBadge totalTrades={side.tradeCount} reputationScore={side.reputationScore} />
      </div>
    </div>
  );
};

export const TradeParticipantsCard = ({
  trade,
  currentUserId,
}: {
  trade: TradeProposal;
  currentUserId?: string;
}) => {
  const iAmRecipient = !!currentUserId && trade.recipient.userId === currentUserId;
  const mySide = iAmRecipient ? trade.recipient : trade.initiator;
  const theirSide = iAmRecipient ? trade.initiator : trade.recipient;

  const allCardIds = [
    ...mySide.offeringCards.map((c) => c.id),
    ...theirSide.offeringCards.map((c) => c.id),
  ];
  const cardMeta = useCardTypeMeta(allCardIds);
  const cardPrices = useCardPrices(allCardIds);
  const metaFor = (id: string) => cardMeta.get(id);
  const priceFor = (id: string) => cardPrices.get(id);

  const [giveLabel, getLabel] = currentUserId
    ? ["You send", "You receive"]
    : ["Initiator offers", "Recipient offers"];

  return (
    <GlassCard className="mb-6">
      <div className="grid grid-cols-1 gap-4 p-4 md:grid-cols-2">
        <SidePanel
          label={giveLabel}
          direction="send"
          side={mySide}
          ownerCaption={currentUserId ? "from your collection" : `from ${mySide.username}`}
          metaFor={metaFor}
          priceFor={priceFor}
        />
        <SidePanel
          label={getLabel}
          direction="receive"
          side={theirSide}
          ownerCaption={`from ${theirSide.username}`}
          metaFor={metaFor}
          priceFor={priceFor}
        />
      </div>
    </GlassCard>
  );
};
