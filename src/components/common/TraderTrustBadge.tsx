import React from "react";
import { ShieldCheck, ShieldQuestion, Award, ShieldAlert, Crown } from "lucide-react";
import { getTraderTrust } from "@/lib/traderTrust";

interface TraderTrustBadgeProps {
  totalTrades: number;
  reputationScore: number;
  className?: string;
}

const TIER_STYLES: Record<string, string> = {
  new: "text-muted-foreground bg-muted/50",
  trusted: "text-emerald-400 bg-emerald-500/10",
  veteran: "text-amber-300 bg-amber-500/10",
  elite: "text-amber-200 bg-amber-500/20 ring-1 ring-amber-400/40",
  mixed: "text-red-400 bg-red-500/10",
};

const TIER_ICONS: Record<string, React.ElementType> = {
  new: ShieldQuestion,
  trusted: ShieldCheck,
  veteran: Award,
  elite: Crown,
  mixed: ShieldAlert,
};

const TraderTrustBadge: React.FC<TraderTrustBadgeProps> = ({ totalTrades, reputationScore, className = "" }) => {
  const { tier, label } = getTraderTrust(totalTrades, reputationScore);
  const Icon = TIER_ICONS[tier];

  return (
    <span className={`inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-xs font-medium ${TIER_STYLES[tier]} ${className}`}>
      <Icon className="h-3 w-3" />
      {label}
    </span>
  );
};

export default TraderTrustBadge;
