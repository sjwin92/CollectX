import { supabase } from "@/integrations/supabase/client";
import type { CollectionValue } from "@/lib/collectionValue";

export interface ValueSnapshot {
  day: string;
  total_gbp: number;
  raw_market_gbp: number;
  units: number;
  graded_units: number;
}

const todayUtc = () => new Date().toISOString().slice(0, 10);

/**
 * Upsert today's portfolio-value snapshot for the signed-in user. Idempotent —
 * safe to call on every collection view; it just refreshes today's row.
 */
export async function recordCollectionValueSnapshot(v: CollectionValue): Promise<void> {
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return;
  // Don't persist a zero — usually means prices haven't loaded yet.
  if (v.total <= 0) return;
  await supabase
    .from("collection_value_snapshots")
    .upsert(
      {
        user_id: user.id,
        day: todayUtc(),
        total_gbp: v.total,
        raw_market_gbp: v.rawMarket,
        units: v.units,
        graded_units: v.gradedUnits,
        updated_at: new Date().toISOString(),
      },
      { onConflict: "user_id,day" },
    );
}

/** Recent daily snapshots, oldest → newest. */
export async function getCollectionValueHistory(days = 60): Promise<ValueSnapshot[]> {
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return [];
  const since = new Date(Date.now() - days * 86400_000).toISOString().slice(0, 10);
  const { data, error } = await supabase
    .from("collection_value_snapshots")
    .select("day, total_gbp, raw_market_gbp, units, graded_units")
    .eq("user_id", user.id)
    .gte("day", since)
    .order("day", { ascending: true });
  if (error) return [];
  return (data ?? []) as ValueSnapshot[];
}
