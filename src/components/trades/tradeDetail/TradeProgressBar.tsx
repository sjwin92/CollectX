import GlassCard from "@/components/ui/custom/GlassCard";
import { TRADE_STEP } from "./TradeDetailHeader";
import type { TradeStatus } from "@/models/trade";
import { FileText, Handshake, Truck, CircleCheckBig, Check } from "lucide-react";

const STEPS = [
  { label: "Proposed", icon: FileText },
  { label: "Accepted", icon: Handshake },
  { label: "Shipped", icon: Truck },
  { label: "Completed", icon: CircleCheckBig },
];

export const TradeProgressBar = ({ status }: { status: TradeStatus }) => {
  if (["cancelled", "disputed"].includes(status)) return null;

  const current = TRADE_STEP[status] ?? 0; // 1..4
  const fillFraction = STEPS.length > 1 ? Math.max(0, current - 1) / (STEPS.length - 1) : 0;

  return (
    <GlassCard className="mb-6">
      <div className="p-6">
        <h3 className="mb-5 font-display text-base font-extrabold">Trade progress</h3>
        <div className="relative">
          {/* track */}
          <div className="absolute left-5 right-5 top-5 h-0.5 -translate-y-1/2 rounded-full bg-secondary" />
          <div
            className="absolute left-5 top-5 h-0.5 -translate-y-1/2 rounded-full bg-gradient-to-r from-primary to-primary/70 transition-[width] duration-700 ease-out"
            style={{ width: `calc((100% - 2.5rem) * ${fillFraction})` }}
          />

          <div className="relative flex justify-between">
            {STEPS.map((s, i) => {
              const n = i + 1;
              const done = current > n;
              const now = current === n;
              const Icon = s.icon;
              return (
                <div key={s.label} className="flex w-20 flex-col items-center gap-2 text-center">
                  <div
                    className={`flex h-10 w-10 items-center justify-center rounded-full border transition-colors ${
                      done
                        ? "border-transparent bg-primary text-primary-foreground"
                        : now
                        ? "node-pulse border-primary bg-card text-primary"
                        : "border-border bg-secondary text-muted-foreground"
                    }`}
                  >
                    {done ? <Check className="h-4 w-4" strokeWidth={2.6} /> : <Icon className="h-4 w-4" />}
                  </div>
                  <span className={`text-[11px] font-medium ${done || now ? "text-foreground" : "text-muted-foreground"}`}>
                    {s.label}
                  </span>
                </div>
              );
            })}
          </div>
        </div>
      </div>
    </GlassCard>
  );
};
