import { useState } from "react";
import { useParams } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import EscrowDetails from "@/components/trades/EscrowDetails";
import { useUser } from "@/hooks/useUser";
import { getTradeProposal } from "@/services/tradeService";
import { TradeDetailHeader } from "@/components/trades/tradeDetail/TradeDetailHeader";
import { TradeParticipantsCard } from "@/components/trades/tradeDetail/TradeParticipantsCard";
import { ShippingInfoCard } from "@/components/trades/tradeDetail/ShippingInfoCard";
import { TradeProgressBar } from "@/components/trades/tradeDetail/TradeProgressBar";
import { TradeActionsBar } from "@/components/trades/tradeDetail/TradeActionsBar";
import { TradeChat } from "@/components/trades/tradeDetail/TradeChat";
import { ImageLightbox } from "@/components/trades/tradeDetail/ImageLightbox";
import { useTradeMutations } from "@/components/trades/tradeDetail/useTradeMutations";

const TradeDetail = () => {
  const { tradeId } = useParams<{ tradeId: string }>();
  const { user } = useUser();
  const [lightboxUrl, setLightboxUrl] = useState<string | null>(null);

  const { data: trade, isLoading, isError, refetch } = useQuery({
    queryKey: ["trade", tradeId],
    queryFn: () => getTradeProposal(tradeId!),
    enabled: !!tradeId,
    refetchOnMount: true,
  });

  const m = useTradeMutations(tradeId ?? "", refetch);

  if (isLoading) return <div className="container py-12">Loading trade details...</div>;
  if (isError || !trade) return <div className="container py-12">Error loading trade details.</div>;

  const isInitiator = trade.initiator.userId === user?.id;
  const isRecipient = trade.recipient.userId === user?.id;

  const canAccept = trade.status === "proposed" && isRecipient;
  const canDecline = trade.status === "proposed" && isRecipient;
  const canReleaseEscrow = trade.status === "shipped" && isRecipient;

  const handleEscrowPayment = async (): Promise<boolean> => {
    try {
      if (isInitiator) await m.payInitiator.mutateAsync();
      else await m.payRecipient.mutateAsync();
      return true;
    } catch {
      return false;
    }
  };

  const handleReleaseEscrow = async (releaseCode: string): Promise<boolean> => {
    try {
      await m.validateRelease.mutateAsync(releaseCode);
      return true;
    } catch {
      return false;
    }
  };

  const handleConfirmReceipt = async (): Promise<boolean> => {
    try {
      await m.confirmReceipt.mutateAsync();
      return true;
    } catch {
      return false;
    }
  };

  return (
    <div className="container py-12">
      <ImageLightbox src={lightboxUrl} onClose={() => setLightboxUrl(null)} />
      <TradeDetailHeader status={trade.status} />
      <TradeParticipantsCard trade={trade} />

      {trade.escrow && (
        <EscrowDetails
          escrow={trade.escrow}
          isInitiator={isInitiator}
          onPayEscrow={handleEscrowPayment}
          onReleaseEscrow={handleReleaseEscrow}
          onConfirmReceipt={handleConfirmReceipt}
        />
      )}

      <ShippingInfoCard
        trade={trade}
        tradeId={tradeId!}
        isInitiator={isInitiator}
        onUpdated={refetch}
      />

      <TradeProgressBar status={trade.status} />

      <TradeActionsBar
        canAccept={canAccept}
        canDecline={canDecline}
        canReleaseEscrow={canReleaseEscrow}
        isAccepting={m.accept.isPending}
        isDeclining={m.decline.isPending}
        isReleasing={m.releaseEscrow.isPending}
        onAccept={() => m.accept.mutate()}
        onDecline={() => m.decline.mutate()}
        onRelease={() => m.releaseEscrow.mutate("123456")}
      />

      <TradeChat
        trade={trade}
        tradeId={tradeId!}
        currentUserId={user?.id}
        onMessageSent={refetch}
        onOpenLightbox={setLightboxUrl}
      />
    </div>
  );
};

export default TradeDetail;
