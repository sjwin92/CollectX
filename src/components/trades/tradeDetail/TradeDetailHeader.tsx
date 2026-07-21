import { ArrowLeft } from "lucide-react";
import { Link } from "react-router-dom";
import Badge from "@/components/ui/custom/Badge";
import type { TradeStatus } from "@/models/trade";

const STATUS_BADGE: Partial<Record<TradeStatus, { variant: "warning" | "info" | "success" | "danger" | "default"; label: string }>> = {
  proposed: { variant: "warning", label: "Proposed" },
  accepted: { variant: "info", label: "Accepted" },
  shipped: { variant: "info", label: "Shipped" },
  completed: { variant: "success", label: "Completed" },
  cancelled: { variant: "danger", label: "Cancelled" },
  disputed: { variant: "danger", label: "Disputed" },
};

export const TradeDetailHeader = ({ status }: { status: TradeStatus }) => {
  const meta = STATUS_BADGE[status] ?? { variant: "default" as const, label: String(status) };
  return (
    <div className="mb-8 flex items-center justify-between">
      <div className="flex items-center gap-4">
        <Link to="/trades" className="text-muted-foreground hover:underline flex items-center">
          <ArrowLeft className="h-4 w-4 mr-2" />
          Back to Trades
        </Link>
        <h1 className="text-2xl font-bold">Trade Details</h1>
      </div>
      <Badge variant={meta.variant}>{meta.label}</Badge>
    </div>
  );
};

export const TRADE_STEP: Partial<Record<TradeStatus, number>> = {
  proposed: 1,
  accepted: 2,
  shipped: 3,
  completed: 4,
};
