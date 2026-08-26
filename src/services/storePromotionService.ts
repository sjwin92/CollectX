// CollectX for Business — Phase 2c. Promoted listings: a store pays a flat
// platform fee to feature a SKU or pin its storefront in the marketplace.

import { supabase as supabaseTyped } from "@/integrations/supabase/client";

// eslint-disable-next-line @typescript-eslint/no-explicit-any
const supabase = supabaseTyped as any;

export type PromotionKind = "sku_feature" | "storefront_pin";

export interface PromotionPrices {
  sku_feature_gbp: number;
  storefront_pin_gbp: number;
  duration_days: number;
}

export interface MyPromotions {
  /** inventory_id → ISO ends_at, for active/pending sku features */
  skus: Map<string, string | null>;
  /** ISO ends_at for an active/pending storefront pin, or null */
  storefrontPin: string | null;
  pendingStorefront: boolean;
}

export const getPromotionPrices = async (): Promise<PromotionPrices> => {
  const { data } = await supabase
    .from("promotion_price_config")
    .select("sku_feature_gbp, storefront_pin_gbp, duration_days")
    .eq("id", 1)
    .maybeSingle();
  return {
    sku_feature_gbp: Number(data?.sku_feature_gbp ?? 2.99),
    storefront_pin_gbp: Number(data?.storefront_pin_gbp ?? 9.99),
    duration_days: Number(data?.duration_days ?? 7),
  };
};

export const getMyPromotions = async (): Promise<MyPromotions> => {
  const { data: { user } } = await supabase.auth.getUser();
  const empty: MyPromotions = { skus: new Map(), storefrontPin: null, pendingStorefront: false };
  if (!user) return empty;

  const { data, error } = await supabase
    .from("store_promotions")
    .select("inventory_id, kind, status, ends_at")
    .eq("store_id", user.id)
    .in("status", ["active", "pending_payment"]);
  if (error) return empty;

  const skus = new Map<string, string | null>();
  let storefrontPin: string | null = null;
  let pendingStorefront = false;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  for (const row of (data ?? []) as any[]) {
    if (row.kind === "storefront_pin") {
      if (row.status === "active") storefrontPin = row.ends_at;
      else pendingStorefront = true;
    } else if (row.inventory_id) {
      skus.set(row.inventory_id, row.status === "active" ? row.ends_at : null);
    }
  }
  return { skus, storefrontPin, pendingStorefront };
};

/** Starts Stripe Checkout for a promotion; returns the redirect URL. */
export const createPromotionCheckout = async (
  kind: PromotionKind,
  inventoryId?: string | null,
): Promise<string> => {
  const { data, error } = await supabase.functions.invoke("create-promotion-checkout", {
    body: { kind, inventory_id: inventoryId ?? null },
  });
  if (error) {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const ctx = (error as any)?.context;
    let msg = error.message;
    try {
      const parsed = ctx && typeof ctx.json === "function" ? await ctx.json() : null;
      if (parsed?.error) msg = parsed.error;
    } catch { /* keep generic */ }
    throw new Error(msg);
  }
  if (data?.error) throw new Error(data.error);
  if (!data?.url) throw new Error("Checkout could not be started.");
  return data.url as string;
};
