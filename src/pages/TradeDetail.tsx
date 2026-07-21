import React, { useEffect, useState } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { Link, useParams } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { CheckCircle, Loader2, Shield, Star, XCircle } from "lucide-react";
import { Button } from "@/components/ui/button";
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

const TradeDetail: React.FC = () => {
  const { tradeId } = useParams<{ tradeId: string }>();
  const { user } = useUser();
  const queryClient = useQueryClient();
  const [lightbox, setLightbox] = useState<string | null>(null);
  const [ratingOpen, setRatingOpen] = useState(false);

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
      .channel(`trade-${tradeId}`)
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
      <div className="container py-12 flex flex-col items-center">
        <Loader2 className="h-8 w-8 animate-spin text-primary mb-4" />
        <p className="text-muted-foreground">Loading trade details...</p>
      </div>
    );
  }

  if (isError || !trade) {
    return (
      <div className="container py-12 text-center">
        <XCircle className="h-12 w-12 text-destructive mx-auto mb-4" />
        <h2 className="text-xl font-semibold mb-2">Trade Not Found</h2>
        <Button asChild><Link to="/trades">Back to Trades</Link></Button>
      </div>
    );
  }

  const isInitiator = trade.initiator.userId === user?.id;
  const isRecipient = trade.recipient.userId === user?.id;
  if (user && !isInitiator && !isRecipient) {
    return (
      <div className="container py-12 text-center">
        <Shield className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
        <h2 className="text-xl font-semibold mb-2">Access Denied</h2>
        <Button asChild><Link to="/trades">Back to Trades</Link></Button>
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
  const { data: alreadyRated } = useQuery({
    queryKey: ["trade-rated", tradeId, user?.id],
    queryFn: () => hasRatedTrade(tradeId!),
    enabled: !!tradeId && !!user && trade.status === "completed",
  });
  const canRate = trade.status === "completed" && !!user && !alreadyRated;

  return (
    <div className="container py-12">
      <ImageLightbox src={lightbox} onClose={() => setLightbox(null)} />

      <TradeDetailHeader status={trade.status} />
      <TradeParticipantsCard trade={trade} />
      <TradeProgressBar status={trade.status} />

      <ShippingInfoCard
        trade={trade}
        tradeId={tradeId!}
        currentUserId={user?.id}
        onUpdated={refetch}
      />

      {/* Actions */}
      <GlassCard className="mb-6">
        <div className="flex items-center justify-around p-4 gap-2 flex-wrap">
          {canAccept && (
            <Button onClick={() => m.accept.mutate()} disabled={m.accept.isPending}>
              {m.accept.isPending ? <>Accepting...<Loader2 className="ml-2 h-4 w-4 animate-spin" /></> : "Accept Trade"}
            </Button>
          )}
          {canDecline && (
            <Button variant="destructive" onClick={() => m.decline.mutate()} disabled={m.decline.isPending}>
              {m.decline.isPending ? <>Declining...<Loader2 className="ml-2 h-4 w-4 animate-spin" /></> : "Decline"}
            </Button>
          )}
          {canCancel && (
            <Button variant="outline" onClick={() => m.cancel.mutate()} disabled={m.cancel.isPending}>
              {m.cancel.isPending ? <>Cancelling...<Loader2 className="ml-2 h-4 w-4 animate-spin" /></> : "Cancel"}
            </Button>
          )}
          {canConfirm && (
            <Button onClick={() => m.confirmReceipt.mutate()} disabled={m.confirmReceipt.isPending}>
              {m.confirmReceipt.isPending ? <>Confirming...<Loader2 className="ml-2 h-4 w-4 animate-spin" /></> : "Confirm Receipt"}
            </Button>
          )}
          {canDispute && (
            <Button
              variant="destructive"
              onClick={() => {
                const reason = window.prompt("Describe the issue:");
                if (reason?.trim()) m.dispute.mutate(reason.trim());
              }}
              disabled={m.dispute.isPending}
            >
              Report Issue
            </Button>
          )}
          {trade.status === "completed" && (
            <div className="flex items-center gap-2 text-green-600">
              <CheckCircle className="h-5 w-5" />
              <span className="font-medium">Trade Complete</span>
            </div>
          )}
          {canRate && (
            <Button variant="outline" onClick={() => setRatingOpen(true)}>
              <Star className="h-4 w-4 mr-2" /> Rate trade
            </Button>
          )}
          {trade.status === "completed" && alreadyRated && (
            <span className="text-sm text-muted-foreground">You’ve rated this trade.</span>
          )}
          {trade.status === "shipped" && iConfirmed && !canConfirm && (
            <p className="text-sm text-muted-foreground">You confirmed receipt. Waiting for the other side.</p>
          )}
        </div>
      </GlassCard>

      {tradeId && user && (
        <TradeRatingModal
          isOpen={ratingOpen}
          onClose={() => { setRatingOpen(false); refetch(); }}
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
  );
};

export default TradeDetail;
