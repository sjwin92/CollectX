import { useMutation } from "@tanstack/react-query";
import { useToast } from "@/hooks/use-toast";
import {
  markStoreOrderShipped,
  cancelStoreOrder,
  openStoreOrderDispute,
  confirmStoreOrderReceipt,
  submitStoreOrderAddress,
  type OrderAddress,
} from "@/services/storeOrderService";

/** Store-order equivalent of useOrderMutations. */
export function useStoreOrderMutations(orderId: string, refetch: () => void) {
  const { toast } = useToast();

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const oops = (description: string) => (err?: any) =>
    toast({
      variant: "destructive",
      title: "Something went wrong",
      description: err?.message || description,
    });

  const submitAddress = useMutation({
    mutationFn: (address: OrderAddress) => submitStoreOrderAddress(orderId, address),
    onSuccess: () => {
      toast({ title: "Address saved" });
      refetch();
    },
    onError: oops("Couldn't save your address."),
  });

  const markShipped = useMutation({
    mutationFn: ({ tracking, carrier }: { tracking: string; carrier: string }) =>
      markStoreOrderShipped(orderId, tracking, carrier),
    onSuccess: () => {
      toast({ title: "Marked as shipped" });
      refetch();
    },
    onError: oops("Couldn't update shipment."),
  });

  const confirmReceipt = useMutation({
    mutationFn: () => confirmStoreOrderReceipt(orderId),
    onSuccess: () => {
      toast({ title: "Receipt confirmed", description: "The store's payout has been released." });
      refetch();
    },
    onError: oops("Couldn't confirm receipt."),
  });

  const cancel = useMutation({
    mutationFn: () => cancelStoreOrder(orderId),
    onSuccess: () => {
      toast({ title: "Order cancelled" });
      refetch();
    },
    onError: oops("Couldn't cancel the order."),
  });

  const dispute = useMutation({
    mutationFn: (reason: string) => openStoreOrderDispute(orderId, reason),
    onSuccess: () => {
      toast({ title: "Dispute opened", description: "This order is now paused pending manual review." });
      refetch();
    },
    onError: oops("Couldn't open dispute."),
  });

  return { submitAddress, markShipped, confirmReceipt, cancel, dispute };
}
