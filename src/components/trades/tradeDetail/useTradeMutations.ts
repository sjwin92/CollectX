import { useMutation } from "@tanstack/react-query";
import { useToast } from "@/hooks/use-toast";
import {
  acceptTradeProposal,
  declineTradeProposal,
  payInitiatorEscrow,
  payRecipientEscrow,
  releaseTradeEscrow,
  confirmTradeReceipt,
  validateReleaseEscrow,
} from "@/services/tradeService";

/**
 * All the side-effecting trade mutations in one place. Each one shows a
 * consistent error toast and triggers `refetch` on success.
 */
export function useTradeMutations(tradeId: string, refetch: () => void) {
  const { toast } = useToast();

  const oops = (description: string) => () =>
    toast({
      variant: "destructive",
      title: "Something went wrong",
      description,
    });

  const accept = useMutation({
    mutationFn: () => acceptTradeProposal(tradeId),
    onSuccess: () => {
      toast({ title: "Trade Accepted", description: "You have accepted the trade proposal." });
      refetch();
    },
    onError: oops("There was a problem accepting the trade proposal."),
  });

  const decline = useMutation({
    mutationFn: () => declineTradeProposal(tradeId),
    onSuccess: () => {
      toast({ title: "Trade Declined", description: "You have declined the trade proposal." });
      refetch();
    },
    onError: oops("There was a problem declining the trade proposal."),
  });

  const payInitiator = useMutation({
    mutationFn: () => payInitiatorEscrow(tradeId),
    onSuccess: () => {
      toast({ title: "Escrow Paid", description: "You have paid the escrow amount." });
      refetch();
    },
    onError: oops("There was a problem paying the escrow amount."),
  });

  const payRecipient = useMutation({
    mutationFn: () => payRecipientEscrow(tradeId),
    onSuccess: () => {
      toast({ title: "Escrow Paid", description: "You have paid the escrow amount." });
      refetch();
    },
    onError: oops("There was a problem paying the escrow amount."),
  });

  const confirmReceipt = useMutation({
    mutationFn: () => confirmTradeReceipt(tradeId),
    onSuccess: () => {
      toast({ title: "Receipt confirmed", description: "You have confirmed receipt of the traded cards." });
      refetch();
    },
    onError: oops("There was a problem confirming receipt."),
  });

  const releaseEscrow = useMutation({
    mutationFn: (releaseCode: string) => releaseTradeEscrow(tradeId, releaseCode),
    onSuccess: (success) => {
      if (success) {
        toast({ title: "Escrow released", description: "The escrow has been released and the trade is now complete." });
        refetch();
      } else {
        toast({ variant: "destructive", title: "Release failed", description: "Failed to release the escrow. Please try again." });
      }
    },
    onError: oops("There was a problem releasing the escrow."),
  });

  const validateRelease = useMutation({
    mutationFn: (releaseCode: string) => validateReleaseEscrow(tradeId, releaseCode),
    onSuccess: (isValid, releaseCode) => {
      if (isValid) releaseEscrow.mutate(releaseCode);
      else
        toast({
          variant: "destructive",
          title: "Invalid release code",
          description: "The release code you entered is not valid.",
        });
    },
    onError: oops("There was a problem validating the release code."),
  });

  return { accept, decline, payInitiator, payRecipient, confirmReceipt, releaseEscrow, validateRelease };
}
