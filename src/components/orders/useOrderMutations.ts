import { useMutation } from "@tanstack/react-query";
import { useToast } from "@/hooks/use-toast";
import {
  markOrderShipped,
  cancelOrder,
  openOrderDispute,
  confirmOrderReceipt,
  submitOrderAddress,
  type OrderAddress,
} from "@/services/orderService";

/**
 * All state-changing order actions. Each shows a consistent error toast
 * and calls `refetch` on success — mirrors useTradeMutations.ts.
 */
export function useOrderMutations(orderId: string, refetch: () => void) {
  const { toast } = useToast();

  const oops = (description: string) => (err?: any) =>
    toast({
      variant: "destructive",
      title: "Something went wrong",
      description: err?.message || description,
    });

  const submitAddress = useMutation({
    mutationFn: (address: OrderAddress) => submitOrderAddress(orderId, address),
    onSuccess: () => {
      toast({ title: "Address saved" });
      refetch();
    },
    onError: oops("Couldn't save your address."),
  });

  const markShipped = useMutation({
    mutationFn: ({ tracking, carrier }: { tracking: string; carrier: string }) =>
      markOrderShipped(orderId, tracking, carrier),
    onSuccess: () => {
      toast({ title: "Marked as shipped" });
      refetch();
    },
    onError: oops("Couldn't update shipment."),
  });

  const confirmReceipt = useMutation({
    mutationFn: () => confirmOrderReceipt(orderId),
    onSuccess: () => {
      toast({ title: "Receipt confirmed", description: "The seller's payout has been released." });
      refetch();
    },
    onError: oops("Couldn't confirm receipt."),
  });

  const cancel = useMutation({
    mutationFn: () => cancelOrder(orderId),
    onSuccess: () => {
      toast({ title: "Order cancelled" });
      refetch();
    },
    onError: oops("Couldn't cancel the order."),
  });

  const dispute = useMutation({
    mutationFn: (reason: string) => openOrderDispute(orderId, reason),
    onSuccess: () => {
      toast({ title: "Dispute opened", description: "This order is now paused pending manual review." });
      refetch();
    },
    onError: oops("Couldn't open dispute."),
  });

  return { submitAddress, markShipped, confirmReceipt, cancel, dispute };
}
