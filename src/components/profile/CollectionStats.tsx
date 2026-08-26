import React, { useEffect, useRef } from "react";
import { useQuery } from "@tanstack/react-query";
import { TrendingUp, TrendingDown } from "lucide-react";
import GlassCard from "@/components/ui/custom/GlassCard";
import { ExtendedCardItemProps } from "@/types/cardTypes";
import { useCollectionValue } from "@/hooks/useCollectionValue";
import {
  getCollectionValueHistory,
  recordCollectionValueSnapshot,
} from "@/services/collectionValueService";

interface CollectionStatsProps {
  collection: ExtendedCardItemProps[];
}

const gbp = (n: number) =>
  `£${n.toLocaleString("en-GB", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;

const Sparkline = ({ points }: { points: number[] }) => {
  if (points.length < 2) return null;
  const w = 120;
  const h = 34;
  const min = Math.min(...points);
  const max = Math.max(...points);
  const span = max - min || 1;
  const d = points
    .map((p, i) => {
      const x = (i / (points.length - 1)) * w;
      const y = h - ((p - min) / span) * (h - 4) - 2;
      return `${i === 0 ? "M" : "L"}${x.toFixed(1)},${y.toFixed(1)}`;
    })
    .join(" ");
  const up = points[points.length - 1] >= points[0];
  return (
    <svg width={w} height={h} className="overflow-visible">
      <path
        d={d}
        fill="none"
        stroke={up ? "hsl(var(--primary))" : "hsl(0 72% 60%)"}
        strokeWidth="2"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
};

const CollectionStats = ({ collection }: CollectionStatsProps) => {
  const value = useCollectionValue(collection);

  const { data: history = [], refetch } = useQuery({
    queryKey: ["collection-value-history"],
    queryFn: () => getCollectionValueHistory(60),
    staleTime: 60 * 60 * 1000,
  });

  // Persist today's value once prices have resolved to a non-zero total.
  const recordedRef = useRef(false);
  useEffect(() => {
    if (recordedRef.current || value.total <= 0) return;
    recordedRef.current = true;
    recordCollectionValueSnapshot(value).then(() => refetch());
  }, [value, refetch]);

  const rareCards = collection.filter(
    (c) =>
      c.rarity?.toLowerCase().includes("rare") ||
      c.rarity?.toLowerCase().includes("ultra") ||
      c.rarity?.toLowerCase().includes("secret"),
  ).length;
  const tradableCards = collection.filter((c) => c.forTrade).length;
  const gradedCards = collection.filter((c) => c.graded).length;

  // Trend: compare against the oldest snapshot in the window (plus live total).
  const series = [...history.map((h) => Number(h.total_gbp)), value.total].filter((n) => n > 0);
  const first = series[0] ?? value.total;
  const delta = value.total - first;
  const deltaPct = first > 0 ? (delta / first) * 100 : 0;
  const hasTrend = series.length >= 2 && Math.abs(delta) >= 0.01;

  return (
    <GlassCard className="p-6">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <h3 className="text-sm font-medium text-muted-foreground">Portfolio value</h3>
          <div className="mt-1 font-display text-3xl font-extrabold tabular-nums">{gbp(value.total)}</div>
          {hasTrend && (
            <div
              className={`mt-1 flex items-center gap-1 text-sm font-semibold ${
                delta >= 0 ? "text-emerald-400" : "text-red-400"
              }`}
            >
              {delta >= 0 ? <TrendingUp className="h-4 w-4" /> : <TrendingDown className="h-4 w-4" />}
              {delta >= 0 ? "+" : "−"}
              {gbp(Math.abs(delta))} ({deltaPct >= 0 ? "+" : "−"}
              {Math.abs(deltaPct).toFixed(1)}%)
              <span className="font-normal text-muted-foreground">since tracking began</span>
            </div>
          )}
        </div>
        <Sparkline points={series} />
      </div>

      <div className="mt-5 grid grid-cols-2 gap-x-6 gap-y-2.5 text-sm sm:grid-cols-3">
        <Row label="Raw market" value={gbp(value.rawMarket)} />
        <Row
          label="Grading & condition"
          value={`${value.gradingAdjustment >= 0 ? "+" : "−"}${gbp(Math.abs(value.gradingAdjustment))}`}
          tone={value.gradingAdjustment >= 0 ? "up" : "down"}
        />
        {value.sealedTotal > 0 && <Row label="Sealed" value={gbp(value.sealedTotal)} />}
        <Row label="Cards" value={`${value.units}${value.units !== value.lines ? ` (${value.lines} lines)` : ""}`} />
        <Row label="Graded" value={String(gradedCards)} />
        <Row label="For trade" value={String(tradableCards)} />
        <Row label="Rare+" value={String(rareCards)} />
        <Row
          label="Priced"
          value={`${value.pricedLines} / ${value.lines}`}
          hint={value.unpricedLines > 0 ? `${value.unpricedLines} card${value.unpricedLines === 1 ? "" : "s"} have no market price yet` : undefined}
        />
      </div>
    </GlassCard>
  );
};

const Row = ({
  label,
  value,
  tone,
  hint,
}: {
  label: string;
  value: string;
  tone?: "up" | "down";
  hint?: string;
}) => (
  <div className="flex items-center justify-between" title={hint}>
    <span className="text-muted-foreground">{label}</span>
    <span
      className={`font-semibold tabular-nums ${
        tone === "up" ? "text-emerald-400" : tone === "down" ? "text-red-400" : ""
      }`}
    >
      {value}
    </span>
  </div>
);

export default CollectionStats;
