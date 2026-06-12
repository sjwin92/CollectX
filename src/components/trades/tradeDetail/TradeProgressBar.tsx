import GlassCard from "@/components/ui/custom/GlassCard";
import { TRADE_STEP } from "./TradeDetailHeader";
import type { TradeStatus } from "@/models/escrow";

const STEPS = ["Proposed", "Accepted", "Escrowed", "Shipped", "Completed"];

export const TradeProgressBar = ({ status }: { status: TradeStatus }) => {
  if (["declined", "disputed", "cancelled"].includes(status)) return null;
  const step = TRADE_STEP[status] ?? 0;
  return (
    <GlassCard className="mb-6">
      <div className="relative p-6">
        <h3 className="text-lg font-medium mb-4">Trade Progress</h3>
        <div className="absolute top-1/2 left-0 right-0 h-1 bg-muted transform -translate-y-1/2" />
        <div
          className="absolute top-1/2 left-0 h-1 bg-primary transform -translate-y-1/2"
          style={{ width: `${(step / STEPS.length) * 100}%` }}
        />
        <div className="relative flex justify-between">
          {STEPS.map((label, i) => (
            <div key={label} className="flex flex-col items-center">
              <div
                className={`h-6 w-6 rounded-full ${
                  step >= i + 1 ? "bg-primary" : "bg-muted"
                } flex items-center justify-center text-white text-xs`}
              >
                {i + 1}
              </div>
              <span className="text-xs mt-1">{label}</span>
            </div>
          ))}
        </div>
      </div>
    </GlassCard>
  );
};
