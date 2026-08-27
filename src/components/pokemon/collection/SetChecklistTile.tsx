import React, { useState } from "react";
import { Link } from "react-router-dom";
import { Check, Minus, Plus, Loader2 } from "lucide-react";
import { SmartImage } from "@/components/common/SmartImage";
import { useToast } from "@/hooks/use-toast";
import { useUser } from "@/hooks/useUser";
import {
  removeCardFromCollection,
  updateCardInCollection,
} from "@/services/supabaseCollectionService";

export interface ChecklistCard {
  id: string;
  name: string;
  number?: string;
  rarity?: string;
  imageUrl?: string;
  set?: { id?: string; name?: string };
}

interface Props {
  card: ChecklistCard;
  owned: boolean;
  quantity: number;
  dbId?: string;
  onChanged: () => void;
  /** Open the full add form (condition, photo, quantity, graded) for a card
   *  that isn't in the collection yet. */
  onQuickAdd: (card: ChecklistCard) => void;
}

/**
 * One tile in a Set-checklist grid. Tap the art to open the card; use the
 * inline − / + to add or remove it from your collection without leaving.
 */
const SetChecklistTile: React.FC<Props> = ({ card, owned, quantity, dbId, onChanged, onQuickAdd }) => {
  const { toast } = useToast();
  const { user } = useUser();
  const [busy, setBusy] = useState(false);

  const requireAuth = () => {
    toast({ variant: "destructive", title: "Sign in required", description: "Sign in to build your collection." });
  };

  const run = async (fn: () => Promise<unknown>) => {
    if (!user) return requireAuth();
    setBusy(true);
    try {
      await fn();
      onChanged();
    } catch (e) {
      toast({
        variant: "destructive",
        title: "Couldn't update your collection",
        description: e instanceof Error ? e.message : "Please try again.",
      });
    } finally {
      setBusy(false);
    }
  };

  const add = () => {
    if (!user) return requireAuth();
    // First copy → full add form (condition, photo, quantity, graded).
    // Already own it → quick +1.
    if (owned && dbId) {
      run(() => updateCardInCollection(dbId, { quantity: quantity + 1 }));
    } else {
      onQuickAdd(card);
    }
  };

  const remove = () =>
    run(() => {
      if (!dbId) return Promise.resolve();
      return quantity > 1
        ? updateCardInCollection(dbId, { quantity: quantity - 1 })
        : removeCardFromCollection(dbId);
    });

  return (
    <div
      className={`group relative aspect-[2/3] overflow-hidden rounded-lg border transition-all ${
        owned
          ? "border-primary/60 bg-primary/5 shadow-[0_0_0_1px_hsl(var(--primary)/0.35)]"
          : "border-border opacity-45 grayscale hover:opacity-90 hover:grayscale-0"
      }`}
    >
      <Link
        to={`/card/${card.id}`}
        title={`${card.name}${card.number ? ` · #${card.number}` : ""}`}
        className="block h-full w-full"
      >
        {card.imageUrl ? (
          <SmartImage src={card.imageUrl} alt={card.name} className="h-full w-full object-cover" fallback={null} />
        ) : (
          <span className="flex h-full items-center justify-center bg-muted p-1 text-center text-[9px] text-muted-foreground">
            {card.name}
          </span>
        )}
      </Link>

      {/* owned marker / qty */}
      {owned && (
        <span className="pointer-events-none absolute right-1 top-1 flex h-4 min-w-4 items-center justify-center rounded-full bg-primary px-1 text-[9px] font-bold text-primary-foreground">
          {quantity > 1 ? `×${quantity}` : <Check className="h-2.5 w-2.5" />}
        </span>
      )}

      {/* inline add / remove */}
      <div className="absolute inset-x-0 bottom-0 flex items-stretch justify-between bg-black/65 text-white backdrop-blur-[1px]">
        {owned ? (
          <button
            type="button"
            onClick={remove}
            disabled={busy}
            aria-label="Remove one from collection"
            className="flex w-7 items-center justify-center py-1 hover:bg-white/15 disabled:opacity-40"
          >
            <Minus className="h-3 w-3" />
          </button>
        ) : (
          <span className="w-7" />
        )}

        <span className="flex items-center py-1 text-[9px] font-semibold tabular-nums">
          {busy ? <Loader2 className="h-3 w-3 animate-spin" /> : card.number ? `#${card.number}` : ""}
        </span>

        <button
          type="button"
          onClick={add}
          disabled={busy}
          aria-label="Add one to collection"
          className="flex w-7 items-center justify-center py-1 hover:bg-white/15 disabled:opacity-40"
        >
          <Plus className="h-3 w-3" />
        </button>
      </div>
    </div>
  );
};

export default SetChecklistTile;
