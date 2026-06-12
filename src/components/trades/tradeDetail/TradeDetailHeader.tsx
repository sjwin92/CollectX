import { ArrowLeft } from "lucide-react";
import { Link } from "react-router-dom";
import Badge from "@/components/ui/custom/Badge";
import type { TradeStatus } from "@/models/escrow";

const STATUS_BADGE: Record<TradeStatus, { variant: "warning" | "info" | "success" | "danger" | "default"; label: string }> = {
  proposed: { variant: "warning", label: "Proposed" },
  accepted: { variant: "info", label: "Accepted" },
  processing: { variant: "info", label: "Processing" },
  escrowed: { variant: "info", label: "Escrowed" },
  shipped: { variant: "info", label: "Shipped" },
  completed: { variant: "success", label: "Completed" },
  declined: { variant: "danger", label: "Declined" },
  disputed: { variant: "danger", label: "Disputed" },
  cancelled: { variant: "danger", label: "Cancelled" },
  pending: { variant: "warning", label: "Pending" },
  received: { variant: "info", label: "Received" },
};

export const TradeDetailHeader = ({ status }: { status: TradeStatus }) => {
  const meta = STATUS_BADGE[status] ?? { variant: "default" as const, label: "Unknown" };
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

export const TRADE_STEP: Record<TradeStatus, number> = {
  proposed: 1,
  pending: 1,
  accepted: 2,
  processing: 2,
  escrowed: 3,
  shipped: 4,
  completed: 5,
  declined: 0,
  disputed: 0,
  cancelled: 0,
  received: 2,
};
