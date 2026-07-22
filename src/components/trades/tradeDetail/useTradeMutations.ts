import { useMutation } from "@tanstack/react-query";
import { useToast } from "@/hooks/use-toast";
import {
  acceptTradeProposal,
  declineTradeProposal,
  cancelTradeProposal,
  confirmTradeReceipt,
  markTradeShipped,
  openTradeDispute,
} from "@/services/tradeService";
import { logUserActivity } from "@/services/supabaseAnalyticsService";

/**
 * All state-changing trade actions. Each shows a consistent error toast
 * and calls `refetch` on success.
 */
export function useTradeMutations(tradeId: string, refetch: () => void) {
  const { toast } = useToast();

  const oops = (description: string) => (err?: any) =>
    toast({
      variant: "destructive",
      title: "Something went wrong",
      description: err?.message || description,
    });

  const accept = useMutation({
    mutationFn: () => acceptTradeProposal(tradeId),
    onSuccess: () => {
      toast({ title: "Trade accepted", description: "You accepted the trade proposal." });
      logUserActivity('trade_accept', { trade_id: tradeId });
      refetch();
    },
    onError: oops("Couldn't accept the trade."),
  });

  const decline = useMutation({
    mutationFn: () => declineTradeProposal(tradeId),
    onSuccess: () => {
      toast({ title: "Trade declined" });
      logUserActivity('trade_decline', { trade_id: tradeId });
      refetch();
    },
    onError: oops("Couldn't decline the trade."),
  });

  const cancel = useMutation({
    mutationFn: () => cancelTradeProposal(tradeId),
    onSuccess: () => {
      toast({ title: "Trade cancelled" });
      refetch();
    },
    onError: oops("Couldn't cancel the trade."),
  });

  const confirmReceipt = useMutation({
    mutationFn: () => confirmTradeReceipt(tradeId),
    onSuccess: () => {
      toast({ title: "Receipt confirmed", description: "Waiting for the other party to confirm as well." });
      refetch();
    },
    onError: oops("Couldn't confirm receipt."),
  });

  const markShipped = useMutation({
    mutationFn: ({ tracking, carrier }: { tracking: string; carrier: string }) =>
      markTradeShipped(tradeId, tracking, carrier),
    onSuccess: () => {
      toast({ title: "Shipment updated" });
      refetch();
    },
    onError: oops("Couldn't update shipment."),
  });

  const dispute = useMutation({
    mutationFn: (reason: string) => openTradeDispute(tradeId, reason),
    onSuccess: () => {
      toast({ title: "Dispute opened", description: "The issue was recorded and this trade is now paused." });
      refetch();
    },
    onError: oops("Couldn't open dispute."),
  });

  return { accept, decline, cancel, confirmReceipt, markShipped, dispute };
}
