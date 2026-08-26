import React, { useEffect, useState } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { Link, useParams } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { CheckCircle, Loader2, Shield, Star, XCircle, AlertTriangle } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import Navbar from "@/components/layout/Navbar";
import GlassCard from "@/components/ui/custom/GlassCard";
import { supabase } from "@/integrations/supabase/client";
import { useUser } from "@/hooks/useUser";
import { getTradeById, hasRatedTrade } from "@/services/tradeService";
import { TradeDetailHeader } from "@/components/trades/tradeDetail/TradeDetailHeader";
import { TradeParticipantsCard } from "@/components/trades/tradeDetail/TradeParticipantsCard";
import { TradeProgressBar } from "@/components/trades/tradeDetail/TradeProgressBar";
import { ShippingInfoCard } from "@/components/trades/tradeDetail/ShippingInfoCard";
import { TradeChat } from "@/components/trades/tradeDetail/TradeChat";
import { ImageLightbox } from "@/components/trades/tradeDetail/ImageLightbox";
import { useTradeMutations } from "@/components/trades/tradeDetail/useTradeMutations";
import TradeRatingModal from "@/components/trades/TradeRatingModal";
import { uniqueChannelSuffix } from "@/lib/utils";

const TradeDetail: React.FC = () => {
  const { tradeId } = useParams<{ tradeId: string }>();
  const { user } = useUser();
  const queryClient = useQueryClient();
  const [lightbox, setLightbox] = useState<string | null>(null);
  const [ratingOpen, setRatingOpen] = useState(false);
  const [disputeOpen, setDisputeOpen] = useState(false);
  const [disputeReason, setDisputeReason] = useState("");

  const { data: trade, isLoading, isError, refetch } = useQuery({
    queryKey: ["trade", tradeId],
    queryFn: () => getTradeById(tradeId!),
    enabled: !!tradeId,
  });

  // Hook-order safety: keep every hook above conditional returns.
  const { data: alreadyRated } = useQuery({
    queryKey: ["trade-rated", tradeId, user?.id],
    queryFn: () => hasRatedTrade(tradeId!),
    enabled: !!tradeId && !!user && trade?.status === "completed",
  });

  // Realtime: refetch on message or trade update
  useEffect(() => {
    if (!tradeId) return;
    const channel = (supabase as any)
      .channel(`trade-${tradeId}-${uniqueChannelSuffix()}`)
      .on("postgres_changes",
        { event: "*", schema: "public", table: "trade_messages", filter: `trade_id=eq.${tradeId}` },
        () => refetch())
      .on("postgres_changes",
        { event: "UPDATE", schema: "public", table: "trades", filter: `id=eq.${tradeId}` },
        () => refetch())
      .subscribe();
    return () => (supabase as any).removeChannel(channel);
  }, [tradeId, refetch]);

  const m = useTradeMutations(tradeId ?? "", refetch);

  if (isLoading) {
    return (
      <div>
        <Navbar />
        <div className="container py-12 flex flex-col items-center">
          <Loader2 className="h-8 w-8 animate-spin text-primary mb-4" />
          <p className="text-muted-foreground">Loading trade details...</p>
        </div>
      </div>
    );
  }

  if (isError || !trade) {
    return (
      <div>
        <Navbar />
        <div className="container py-12 text-center">
          <XCircle className="h-12 w-12 text-destructive mx-auto mb-4" />
          <h2 className="text-xl font-semibold mb-2">Trade Not Found</h2>
          <Button asChild><Link to="/trades">Back to Trades</Link></Button>
        </div>
      </div>
    );
  }

  const isInitiator = trade.initiator.userId === user?.id;
  const isRecipient = trade.recipient.userId === user?.id;
  if (user && !isInitiator && !isRecipient) {
    return (
      <div>
        <Navbar />
        <div className="container py-12 text-center">
          <Shield className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
          <h2 className="text-xl font-semibold mb-2">Access Denied</h2>
          <Button asChild><Link to="/trades">Back to Trades</Link></Button>
        </div>
      </div>
    );
  }

  const canAccept  = trade.status === "proposed" && isRecipient;
  const canDecline = trade.status === "proposed" && isRecipient;
  const canCancel  = trade.status === "proposed" && isInitiator;
  const iConfirmed = isInitiator
    ? !!(trade as any).initiator_confirmed_at
    : !!(trade as any).recipient_confirmed_at;
  const canConfirm = trade.status === "shipped" && !iConfirmed;
  const canDispute = ["accepted", "shipped"].includes(trade.status);

  const otherParty = isInitiator ? trade.recipient : trade.initiator;
  const canRate = trade.status === "completed" && !!user && !alreadyRated;

  return (
    <div>
      <Navbar />
      <div className="container pb-16 pt-24">
      <ImageLightbox src={lightbox} onClose={() => setLightbox(null)} />

      <TradeDetailHeader status={trade.status} />
      <TradeParticipantsCard trade={trade} currentUserId={user?.id} />
      <TradeProgressBar status={trade.status} />

      <ShippingInfoCard
        trade={trade}
        tradeId={tradeId!}
        currentUserId={user?.id}
        onUpdated={refetch}
      />

      {/* Actions */}
      <GlassCard className="mb-6">
        <div className="flex flex-wrap items-center gap-3 p-5">
          <div className="min-w-[10rem] flex-1 text-sm text-muted-foreground">
            {canAccept && "This trade is waiting for your response."}
            {canConfirm && "Confirm receipt once your card is in hand — both sides must confirm to complete."}
            {trade.status === "completed" && (
              <span className="inline-flex items-center gap-2 font-medium text-emerald-400">
                <CheckCircle className="h-5 w-5" /> Trade complete{alreadyRated ? " — you’ve rated this trade." : "."}
              </span>
            )}
            {trade.status === "shipped" && iConfirmed && !canConfirm && "You confirmed receipt. Waiting for the other side."}
            {trade.status === "disputed" && "An issue was reported on this trade."}
          </div>

          <div className="flex flex-wrap items-center gap-2">
            {canDecline && (
              <Button
                variant="outline"
                className="rounded-full border-red-500/40 text-red-300 hover:bg-red-500/10 hover:text-red-200"
                onClick={() => m.decline.mutate()}
                disabled={m.decline.isPending}
              >
                {m.decline.isPending ? <>Declining…<Loader2 className="ml-2 h-4 w-4 animate-spin" /></> : "Decline"}
              </Button>
            )}
            {canCancel && (
              <Button variant="outline" className="rounded-full" onClick={() => m.cancel.mutate()} disabled={m.cancel.isPending}>
                {m.cancel.isPending ? <>Cancelling…<Loader2 className="ml-2 h-4 w-4 animate-spin" /></> : "Cancel"}
              </Button>
            )}
            {canDispute && (
              <Button
                variant="outline"
                className="rounded-full border-red-500/40 text-red-300 hover:bg-red-500/10 hover:text-red-200"
                onClick={() => setDisputeOpen(true)}
                disabled={m.dispute.isPending}
              >
                <AlertTriangle className="mr-2 h-4 w-4" />
                Report an issue
              </Button>
            )}
            {canRate && (
              <Button variant="outline" className="rounded-full" onClick={() => setRatingOpen(true)}>
                <Star className="mr-2 h-4 w-4" /> Rate trade
              </Button>
            )}
            {canAccept && (
              <Button
                className="rounded-full px-5 shadow-[0_12px_30px_-12px_hsl(var(--primary)/0.6)]"
                onClick={() => m.accept.mutate()}
                disabled={m.accept.isPending}
              >
                {m.accept.isPending ? <>Accepting…<Loader2 className="ml-2 h-4 w-4 animate-spin" /></> : "Accept trade"}
              </Button>
            )}
            {canConfirm && (
              <Button
                className="rounded-full px-5 shadow-[0_12px_30px_-12px_hsl(var(--primary)/0.6)]"
                onClick={() => m.confirmReceipt.mutate()}
                disabled={m.confirmReceipt.isPending}
              >
                {m.confirmReceipt.isPending ? <>Confirming…<Loader2 className="ml-2 h-4 w-4 animate-spin" /></> : (<><CheckCircle className="mr-2 h-4 w-4" />Confirm receipt</>)}
              </Button>
            )}
          </div>
        </div>
      </GlassCard>

      <Dialog open={disputeOpen} onOpenChange={setDisputeOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <AlertTriangle className="h-5 w-5 text-red-400" />
              Report an issue
            </DialogTitle>
          </DialogHeader>
          <p className="text-sm text-muted-foreground">
            Describe what went wrong. This pauses the trade and flags it for review — try to resolve it with the other
            trader in chat first where you can.
          </p>
          <Textarea
            autoFocus
            rows={4}
            maxLength={2000}
            value={disputeReason}
            onChange={(e) => setDisputeReason(e.target.value)}
            placeholder="e.g. The card arrived with a bent corner that wasn't in the photos."
          />
          <DialogFooter>
            <Button variant="outline" className="rounded-full" onClick={() => setDisputeOpen(false)}>
              Cancel
            </Button>
            <Button
              variant="destructive"
              className="rounded-full"
              disabled={!disputeReason.trim() || m.dispute.isPending}
              onClick={() => {
                m.dispute.mutate(disputeReason.trim());
                setDisputeOpen(false);
                setDisputeReason("");
              }}
            >
              {m.dispute.isPending ? <>Reporting…<Loader2 className="ml-2 h-4 w-4 animate-spin" /></> : "Submit report"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {tradeId && user && (
        <TradeRatingModal
          isOpen={ratingOpen}
          onClose={() => {
            setRatingOpen(false);
            queryClient.invalidateQueries({ queryKey: ["trade-rated", tradeId, user.id] });
            refetch();
          }}
          tradeId={tradeId}
          tradedWithUserId={otherParty.userId}
          tradedWithUsername={otherParty.username}
        />
      )}

      <TradeChat
        trade={trade}
        tradeId={tradeId!}
        currentUserId={user?.id}
        onMessageSent={refetch}
        onOpenLightbox={setLightbox}
      />
      </div>
    </div>
  );
};

export default TradeDetail;
