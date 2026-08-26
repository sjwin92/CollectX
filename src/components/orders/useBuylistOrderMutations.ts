import { useMutation } from "@tanstack/react-query";
import { useToast } from "@/hooks/use-toast";
import {
  markBuylistOrderShipped,
  cancelBuylistOrder,
  openBuylistOrderDispute,
  confirmBuylistOrderReceipt,
  submitBuylistOrderAddress,
  type OrderAddress,
} from "@/services/storeBuylistService";

/** Buylist-order equivalent of useOrderMutations. Roles: the store confirms
 *  receipt + sets the address; the collector ships. */
export function useBuylistOrderMutations(orderId: string, refetch: () => void) {
  const { toast } = useToast();

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const oops = (description: string) => (err?: any) =>
    toast({ variant: "destructive", title: "Something went wrong", description: err?.message || description });

  const submitAddress = useMutation({
    mutationFn: (address: OrderAddress) => submitBuylistOrderAddress(orderId, address),
    onSuccess: () => { toast({ title: "Address saved" }); refetch(); },
    onError: oops("Couldn't save your address."),
  });

  const markShipped = useMutation({
    mutationFn: ({ tracking, carrier }: { tracking: string; carrier: string }) =>
      markBuylistOrderShipped(orderId, tracking, carrier),
    onSuccess: () => { toast({ title: "Marked as shipped" }); refetch(); },
    onError: oops("Couldn't update shipment."),
  });

  const confirmReceipt = useMutation({
    mutationFn: () => confirmBuylistOrderReceipt(orderId),
    onSuccess: () => { toast({ title: "Receipt confirmed", description: "The collector's payout has been released and the card is in your inventory." }); refetch(); },
    onError: oops("Couldn't confirm receipt."),
  });

  const cancel = useMutation({
    mutationFn: () => cancelBuylistOrder(orderId),
    onSuccess: () => { toast({ title: "Order cancelled" }); refetch(); },
    onError: oops("Couldn't cancel the order."),
  });

  const dispute = useMutation({
    mutationFn: (reason: string) => openBuylistOrderDispute(orderId, reason),
    onSuccess: () => { toast({ title: "Dispute opened", description: "This order is now paused pending manual review." }); refetch(); },
    onError: oops("Couldn't open dispute."),
  });

  return { submitAddress, markShipped, confirmReceipt, cancel, dispute };
}
