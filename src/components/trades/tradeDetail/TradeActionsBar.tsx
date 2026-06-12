import { Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import GlassCard from "@/components/ui/custom/GlassCard";

export type TradeActionsState = {
  canAccept: boolean;
  canDecline: boolean;
  canReleaseEscrow: boolean;
  isAccepting: boolean;
  isDeclining: boolean;
  isReleasing: boolean;
  onAccept: () => void;
  onDecline: () => void;
  onRelease: () => void;
};

export const TradeActionsBar = (props: TradeActionsState) => {
  const { canAccept, canDecline, canReleaseEscrow } = props;
  if (!canAccept && !canDecline && !canReleaseEscrow) return null;

  return (
    <GlassCard className="mb-6">
      <div className="flex items-center justify-around p-4">
        {canAccept && (
          <Button onClick={props.onAccept} disabled={props.isAccepting}>
            {props.isAccepting ? (
              <>Accepting...<Loader2 className="ml-2 h-4 w-4 animate-spin" /></>
            ) : "Accept Trade"}
          </Button>
        )}
        {canDecline && (
          <Button variant="destructive" onClick={props.onDecline} disabled={props.isDeclining}>
            {props.isDeclining ? (
              <>Declining...<Loader2 className="ml-2 h-4 w-4 animate-spin" /></>
            ) : "Decline Trade"}
          </Button>
        )}
        {canReleaseEscrow && (
          <Button onClick={props.onRelease} disabled={props.isReleasing}>
            {props.isReleasing ? (
              <>Releasing...<Loader2 className="ml-2 h-4 w-4 animate-spin" /></>
            ) : "Release Escrow"}
          </Button>
        )}
      </div>
    </GlassCard>
  );
};
