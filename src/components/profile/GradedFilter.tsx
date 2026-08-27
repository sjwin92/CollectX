import React from "react";
import { BadgeCheck } from "lucide-react";
import { cn } from "@/lib/utils";

interface GradedFilterProps {
  showGradedOnly: boolean;
  onGradedFilterChange: (checked: boolean) => void;
}

/**
 * Quick filter for the collection grid — a single pill toggle that matches the
 * grade chip shown on the cards themselves (same BadgeCheck icon + emerald
 * accent), rather than a stray checkbox.
 */
const GradedFilter = ({ showGradedOnly, onGradedFilterChange }: GradedFilterProps) => {
  return (
    <button
      type="button"
      aria-pressed={showGradedOnly}
      onClick={() => onGradedFilterChange(!showGradedOnly)}
      className={cn(
        "inline-flex shrink-0 items-center gap-1.5 rounded-full border px-3 py-1.5 text-sm font-medium transition-colors",
        showGradedOnly
          ? "border-emerald-500/40 bg-emerald-500/15 text-emerald-300"
          : "border-border text-muted-foreground hover:border-primary/50 hover:text-foreground",
      )}
    >
      <BadgeCheck className="h-4 w-4" />
      Graded only
    </button>
  );
};

export default GradedFilter;
