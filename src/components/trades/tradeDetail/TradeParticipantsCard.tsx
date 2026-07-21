import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import Badge from "@/components/ui/custom/Badge";
import GlassCard from "@/components/ui/custom/GlassCard";
import type { TradeProposal } from "@/models/trade";

type Side = TradeProposal["initiator"] | TradeProposal["recipient"];

const Participant = ({ label, side }: { label: string; side: Side }) => {
  const cardCount = side.offeringCards.length;
  const preview = side.offeringCards[0]?.imageUrl;
  const repLabel = side.reputation.charAt(0).toUpperCase() + side.reputation.slice(1);
  return (
    <div>
      <div className="text-xs text-muted-foreground mb-1">{label}</div>
      <div className="flex items-center gap-3">
        <div className="relative h-14 w-14 rounded-md overflow-hidden bg-muted flex items-center justify-center">
          {preview ? (
            <img src={preview} alt="Cards preview" className="object-cover h-full w-full" />
          ) : (
            <span className="text-xs text-muted-foreground">No card</span>
          )}
          {cardCount > 1 && (
            <div className="absolute top-0.5 right-0.5 bg-primary/90 text-white text-[10px] font-medium h-4 w-4 rounded-full flex items-center justify-center">
              {cardCount}
            </div>
          )}
        </div>
        <div className="text-sm">
          <div className="font-medium">{cardCount} {cardCount === 1 ? "card" : "cards"}</div>
        </div>
      </div>
      <div className="mt-2 flex items-center gap-3">
        <Avatar>
          <AvatarImage src="" alt={side.username} />
          <AvatarFallback>{side.username.substring(0, 2).toUpperCase()}</AvatarFallback>
        </Avatar>
        <div className="flex items-center gap-2">
          <span className="font-medium">{side.username}</span>
          <Badge variant="reputation" reputation={side.reputation} size="sm">
            {repLabel}
          </Badge>
        </div>
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
  const [givingLabel, receivingLabel] = currentUserId
    ? ["You're giving:", "You're receiving:"]
    : ["Initiator offers:", "Recipient offers:"];

  return (
    <GlassCard className="mb-6">
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <Participant label={givingLabel} side={mySide} />
        <Participant label={receivingLabel} side={theirSide} />
      </div>
    </GlassCard>
  );
};
