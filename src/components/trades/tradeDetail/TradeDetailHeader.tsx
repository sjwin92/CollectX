import { ArrowLeft } from "lucide-react";
import { Link } from "react-router-dom";
import type { TradeStatus } from "@/models/trade";

const STATUS_META: Partial<Record<TradeStatus, { label: string; className: string }>> = {
  proposed: { label: "Proposed", className: "text-amber-300 bg-amber-500/12 border-amber-500/30" },
  accepted: { label: "Accepted", className: "text-primary bg-primary/12 border-primary/30" },
  shipped: { label: "Shipped — awaiting receipt", className: "text-primary bg-primary/12 border-primary/30" },
  completed: { label: "Completed", className: "text-emerald-300 bg-emerald-500/12 border-emerald-500/30" },
  cancelled: { label: "Cancelled", className: "text-red-300 bg-red-500/12 border-red-500/30" },
  disputed: { label: "Issue reported", className: "text-red-300 bg-red-500/12 border-red-500/30" },
};

export const TradeDetailHeader = ({ status }: { status: TradeStatus }) => {
  const meta = STATUS_META[status] ?? {
    label: String(status),
    className: "text-muted-foreground bg-secondary border-border",
  };
  return (
    <div className="mb-8 flex flex-wrap items-center justify-between gap-3">
      <div className="flex items-center gap-4">
        <Link
          to="/trades"
          className="inline-flex items-center gap-2 text-sm text-muted-foreground transition-colors hover:text-foreground"
        >
          <ArrowLeft className="h-4 w-4" />
          Back to trades
        </Link>
        <h1 className="font-display text-2xl font-extrabold">Trade details</h1>
      </div>
      <span
        className={`inline-flex items-center rounded-full border px-3.5 py-1.5 font-display text-xs font-bold ${meta.className}`}
      >
        {meta.label}
      </span>
    </div>
  );
};

export const TRADE_STEP: Partial<Record<TradeStatus, number>> = {
  proposed: 1,
  accepted: 2,
  shipped: 3,
  completed: 4,
};
