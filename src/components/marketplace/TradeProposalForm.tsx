import React, { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { ArrowRightLeft, Loader2 } from "lucide-react";
import { CardItemProps } from "@/components/cards/CardItem";
import { SmartImage } from "@/components/common/SmartImage";
import { getTradableCards, ExtendedCardItemWithDB } from "@/services/supabaseCollectionService";
import { useUser } from "@/hooks/useUser";

interface TradeProposalFormProps {
  isOpen: boolean;
  onClose: () => void;
  targetCard: CardItemProps;
  /** Called with (message, selectedUserCardIds) */
  onSubmitProposal: (message: string, selectedUserCardIds: string[]) => void | Promise<void>;
}

const TradeProposalForm = ({
  isOpen,
  onClose,
  targetCard,
  onSubmitProposal,
}: TradeProposalFormProps) => {
  const { user, isLoaded } = useUser();
  const [message, setMessage] = useState("");
  const [selectedIds, setSelectedIds] = useState<string[]>([]);
  const [submitting, setSubmitting] = useState(false);

  const {
    data: cards = [],
    isLoading,
    isError,
    error,
  } = useQuery<ExtendedCardItemWithDB[]>({
    queryKey: ["tradable-cards", user?.id],
    queryFn: getTradableCards,
    enabled: isOpen && !!user,
  });

  const toggle = (id: string) =>
    setSelectedIds((prev) => (prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id]));

  const handleSubmit = async () => {
    if (selectedIds.length === 0) return;
    setSubmitting(true);
    try {
      await onSubmitProposal(message.trim(), selectedIds);
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Propose a Trade</DialogTitle>
          <DialogDescription>
            Offer cards from your collection in exchange for {targetCard.name}.
          </DialogDescription>
        </DialogHeader>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 py-4">
          <div className="md:col-span-1">
            <SmartImage src={targetCard.imageUrl} alt={targetCard.name} className="w-full rounded-md" />
            <div className="mt-2 text-sm">
              <div className="font-semibold">{targetCard.name}</div>
              <div className="text-muted-foreground">{targetCard.rarity} • {targetCard.condition}</div>
            </div>
          </div>

          <div className="md:col-span-2 space-y-4">
            <div>
              <h3 className="font-medium mb-2">Your cards marked for trade</h3>

              {!isLoaded || isLoading ? (
                <div className="flex items-center gap-2 text-muted-foreground text-sm py-6">
                  <Loader2 className="h-4 w-4 animate-spin" /> Loading your collection...
                </div>
              ) : isError ? (
                <div className="text-sm text-destructive py-6">
                  Couldn't load your collection: {(error as any)?.message ?? "Try again."}
                </div>
              ) : !user ? (
                <div className="text-sm text-muted-foreground py-6">
                  Please sign in to propose a trade.
                </div>
              ) : cards.length === 0 ? (
                <div className="text-sm text-muted-foreground py-6 border border-dashed rounded-md p-4 text-center">
                  You have no cards marked <span className="font-medium">for trade</span> yet.
                  Go to your collection and enable “For trade” on a card first.
                </div>
              ) : (
                <div className="grid grid-cols-3 sm:grid-cols-4 gap-2 max-h-80 overflow-y-auto pr-1">
                  {cards.map((c) => {
                    const id = (c.dbId as string) || "";
                    if (!id) return null;
                    const selected = selectedIds.includes(id);
                    return (
                      <button
                        key={id}
                        type="button"
                        onClick={() => toggle(id)}
                        className={`text-left rounded-md border p-1 transition-colors ${
                          selected ? "border-primary ring-2 ring-primary/40" : "hover:border-primary/50"
                        }`}
                      >
                        <SmartImage
                          src={c.imageUrl}
                          alt={c.name}
                          className="w-full aspect-[3/4] object-cover rounded"
                        />
                        <div className="text-xs mt-1 truncate">{c.name}</div>
                        {c.condition && (
                          <div className="text-[10px] text-muted-foreground truncate">{c.condition}</div>
                        )}
                      </button>
                    );
                  })}
                </div>
              )}
            </div>

            <div className="space-y-2">
              <label className="text-sm font-medium">Message (optional)</label>
              <Textarea
                placeholder="Add a note about your offer..."
                value={message}
                onChange={(e) => setMessage(e.target.value)}
                className="min-h-20"
              />
            </div>
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={onClose} disabled={submitting}>
            Cancel
          </Button>
          <Button
            onClick={handleSubmit}
            disabled={selectedIds.length === 0 || submitting}
          >
            {submitting ? (
              <>Sending...<Loader2 className="ml-2 h-4 w-4 animate-spin" /></>
            ) : (
              <><ArrowRightLeft className="h-4 w-4 mr-2" /> Send Proposal ({selectedIds.length})</>
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};

export default TradeProposalForm;
