import React, { useState } from "react";
import { useNavigate } from "react-router-dom";
import { Loader2, ShoppingBag } from "lucide-react";
import { Button } from "@/components/ui/button";
import { SmartImage } from "@/components/common/SmartImage";
import { useToast } from "@/hooks/use-toast";
import { useUser } from "@/hooks/useUser";
import { conditionTone } from "@/components/marketplace/listing/conditionTone";
import { createStoreCheckout, type StoreShelfItem } from "@/services/storeOrderService";

const fmtGbp = (n: number) => `£${n.toFixed(2)}`;

/** One buyable store SKU on a storefront. "Buy now" → Stripe Checkout. */
const StoreShelfCard: React.FC<{ item: StoreShelfItem }> = ({ item }) => {
  const { toast } = useToast();
  const { user } = useUser();
  const navigate = useNavigate();
  const [busy, setBusy] = useState(false);

  const buy = async () => {
    if (!user) {
      navigate("/auth");
      return;
    }
    setBusy(true);
    try {
      const url = await createStoreCheckout(item.id, 1);
      window.location.href = url;
    } catch (err) {
      toast({
        variant: "destructive",
        title: "Couldn't start checkout",
        description: err instanceof Error ? err.message : "Try again.",
      });
      setBusy(false);
    }
  };

  const gradeLabel = item.is_graded
    ? `${item.grade_company ?? "Graded"}${item.grade_score != null ? ` ${item.grade_score}` : ""}`
    : null;

  return (
    <div className="group flex flex-col overflow-hidden rounded-xl border border-border bg-card">
      <div className="relative aspect-[3/4] overflow-hidden bg-secondary">
        <SmartImage
          src={item.image_url ?? ""}
          alt={item.card_name}
          className="h-full w-full object-contain p-3 transition-transform group-hover:scale-[1.03]"
          fallback={<div className="flex h-full items-center justify-center text-xs text-muted-foreground">No image</div>}
        />
        <span className={`absolute left-2 top-2 rounded-full border px-2 py-0.5 text-[10px] font-semibold ${conditionTone(item.condition)}`}>
          {gradeLabel ?? item.condition.replace(/_/g, " ")}
        </span>
      </div>
      <div className="flex flex-1 flex-col gap-2 p-3">
        <div className="min-w-0">
          <p className="truncate text-sm font-semibold">{item.card_name}</p>
          <p className="truncate text-xs text-muted-foreground">
            {item.set_name || "—"}{item.card_number ? ` · #${item.card_number}` : ""}
          </p>
        </div>
        <div className="mt-auto flex items-center justify-between gap-2">
          <span className="font-display text-lg font-extrabold text-gold">{fmtGbp(item.price_gbp)}</span>
          <Button size="sm" className="rounded-full" onClick={buy} disabled={busy}>
            {busy ? <Loader2 className="h-4 w-4 animate-spin" /> : <><ShoppingBag className="mr-1.5 h-4 w-4" /> Buy now</>}
          </Button>
        </div>
        {item.available <= 3 && (
          <p className="text-[11px] text-amber-400">Only {item.available} left</p>
        )}
      </div>
    </div>
  );
};

export default StoreShelfCard;
