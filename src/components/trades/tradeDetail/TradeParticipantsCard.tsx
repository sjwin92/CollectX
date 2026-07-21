import { Package } from "lucide-react";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import Badge from "@/components/ui/custom/Badge";
import GlassCard from "@/components/ui/custom/GlassCard";
import { formatCurrency } from "@/utils/formatCurrency";
import type { TradeProposal } from "@/models/trade";

type Side = TradeProposal["initiator"] | TradeProposal["recipient"];

const Participant = ({ label, side }: { label: string; side: Side }) => (
  <div>
    <div className="text-xs text-muted-foreground mb-1">{label}</div>
    <div className="flex items-center gap-2">
      <div className="relative h-14 w-14 rounded-md overflow-hidden bg-muted">
        <img
          src={side.offeringCards[0]?.imageUrl}
          alt="Cards preview"
          className="object-cover h-full w-full"
        />
        {side.offeringCards.length > 1 && (
          <div className="absolute top-0.5 right-0.5 bg-primary/90 text-white text-[10px] font-medium h-4 w-4 rounded-full flex items-center justify-center">
            {side.offeringCards.length}
          </div>
        )}
      </div>
      <div>
        <Package className="h-4 w-4 text-muted-foreground mb-1" />
        {side.escrowAmount.finalAmount !== undefined && (
          <div className="text-xs font-medium">
            {formatCurrency(side.escrowAmount.finalAmount, side.escrowAmount.currency)}
          </div>
        )}
      </div>
    </div>
    <div className="mt-2">
      <div className="flex items-center gap-3">
        <Avatar>
          <AvatarImage src="" alt={side.username} />
          <AvatarFallback>{side.username.substring(0, 2).toUpperCase()}</AvatarFallback>
        </Avatar>
        <div className="flex items-center gap-2">
          <span className="font-medium">{side.username}</span>
          <Badge variant="reputation" reputation={side.reputation} size="sm">
            {side.reputation.charAt(0).toUpperCase() + side.reputation.slice(1)}
          </Badge>
        </div>
      </div>
    </div>
  </div>
);

export const TradeParticipantsCard = ({ trade }: { trade: TradeProposal }) => (
  <GlassCard className="mb-6">
    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
      <Participant label="You're giving:" side={trade.initiator} />
      <Participant label="You're receiving:" side={trade.recipient} />
    </div>
  </GlassCard>
);
