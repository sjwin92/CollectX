// CollectX for Business — Phase 2. The store inventory ledger + price rules +
// "reprice now" (invokes refresh-store-prices for this store).

import { supabase } from "@/integrations/supabase/client";
import { usdToGbp } from "@/services/currencyService";
import { extractMarketPriceUsd } from "@/lib/cardPrice";
import { getActingStoreId } from "@/services/storeService";

export interface PriceRule {
  id: string;
  store_id: string;
  name: string;
  pct_of_market: number;
  floor_gbp: number;
  never_below_cost: boolean;
  is_default: boolean;
}

export interface InventoryItem {
  id: string;
  store_id: string;
  card_id: string;
  card_name: string;
  set_id: string | null;
  set_name: string | null;
  card_number: string | null;
  rarity: string | null;
  image_url: string | null;
  condition: string;
  is_graded: boolean;
  grade_company: string | null;
  grade_score: number | null;
  quantity: number;
  reserved: number;
  cost_gbp: number | null;
  price_gbp: number | null;
  price_rule_id: string | null;
  bin: string | null;
  listed: boolean;
  updated_at: string;
  /** joined at read time — live GBP market price for the card, if known */
  market_gbp?: number | null;
}

export interface InventorySkuInput {
  card_id: string;
  card_name: string;
  set_id?: string | null;
  set_name?: string | null;
  card_number?: string | null;
  rarity?: string | null;
  image_url?: string | null;
  condition: string;
  is_graded?: boolean;
  grade_company?: string | null;
  grade_score?: number | null;
  quantity: number;
  cost_gbp?: number | null;
  price_gbp?: number | null;
  price_rule_id?: string | null;
  bin?: string | null;
  listed?: boolean;
}

async function myStoreId(): Promise<string> {
  const id = await getActingStoreId();
  if (!id) throw new Error("No store account");
  return id;
}

// ── Price rules ──────────────────────────────────────────────────────────
export async function getPriceRules(): Promise<PriceRule[]> {
  const storeId = await myStoreId();
  const { data, error } = await supabase
    .from("store_price_rules")
    .select("*")
    .eq("store_id", storeId)
    .order("is_default", { ascending: false });
  if (error) throw error;
  return (data ?? []) as PriceRule[];
}

export async function ensureDefaultRule(): Promise<PriceRule> {
  const { data, error } = await supabase.rpc("ensure_default_price_rule");
  if (error) throw new Error(error.message);
  return data as PriceRule;
}

export async function updatePriceRule(id: string, patch: Partial<Pick<PriceRule,
  "name" | "pct_of_market" | "floor_gbp" | "never_below_cost">>): Promise<void> {
  const { error } = await supabase.from("store_price_rules").update(patch).eq("id", id);
  if (error) throw error;
}

// ── Inventory ────────────────────────────────────────────────────────────
const SELECT =
  "id, store_id, card_id, card_name, set_id, set_name, card_number, rarity, image_url, condition, is_graded, grade_company, grade_score, quantity, reserved, cost_gbp, price_gbp, price_rule_id, bin, listed, updated_at";

export async function listInventory(search = ""): Promise<InventoryItem[]> {
  const storeId = await myStoreId();
  let q = supabase.from("store_inventory").select(SELECT).eq("store_id", storeId).order("updated_at", { ascending: false });
  if (search.trim()) q = q.ilike("card_name", `%${search.trim()}%`);
  const { data, error } = await q;
  if (error) throw error;
  const rows = (data ?? []) as InventoryItem[];

  // Attach live market price (GBP) for each distinct card.
  const ids = Array.from(new Set(rows.map((r) => r.card_id)));
  if (ids.length) {
    const marketByCard = new Map<string, number>();
    for (let i = 0; i < ids.length; i += 400) {
      const { data: cards } = await supabase
        .from("pokemon_cards")
        .select("id, tcgplayer_prices")
        .in("id", ids.slice(i, i + 400));
      for (const c of cards ?? []) {
        const usd = extractMarketPriceUsd((c as { tcgplayer_prices?: unknown }).tcgplayer_prices);
        if (usd > 0) marketByCard.set(c.id, usdToGbp(usd));
      }
    }
    for (const r of rows) r.market_gbp = marketByCard.get(r.card_id) ?? null;
  }
  return rows;
}

export async function upsertSku(sku: InventorySkuInput): Promise<void> {
  const storeId = await myStoreId();
  const { error } = await supabase.from("store_inventory").upsert(
    {
      store_id: storeId,
      card_id: sku.card_id,
      card_name: sku.card_name,
      set_id: sku.set_id ?? null,
      set_name: sku.set_name ?? null,
      card_number: sku.card_number ?? null,
      rarity: sku.rarity ?? null,
      image_url: sku.image_url ?? null,
      condition: sku.condition,
      is_graded: sku.is_graded ?? false,
      grade_company: sku.grade_company ?? null,
      grade_score: sku.grade_score ?? null,
      quantity: sku.quantity,
      cost_gbp: sku.cost_gbp ?? null,
      price_gbp: sku.price_gbp ?? null,
      price_rule_id: sku.price_rule_id ?? null,
      bin: sku.bin ?? null,
      listed: sku.listed ?? true,
    },
    { onConflict: "store_id,card_id,condition,is_graded,grade_company,grade_score" },
  );
  if (error) throw error;
}

export async function patchSku(id: string, patch: Partial<Pick<InventoryItem,
  "quantity" | "price_gbp" | "cost_gbp" | "price_rule_id" | "listed" | "bin">>): Promise<void> {
  const { error } = await supabase.from("store_inventory").update(patch).eq("id", id);
  if (error) throw error;
}

export async function deleteSku(id: string): Promise<void> {
  const { error } = await supabase.from("store_inventory").delete().eq("id", id);
  if (error) throw error;
}

export async function repriceNow(): Promise<{ skusRepriced: number; skusSkipped: number }> {
  const storeId = await myStoreId();
  const { data, error } = await supabase.functions.invoke("refresh-store-prices", {
    body: { storeId },
  });
  if (error) throw error;
  return data as { skusRepriced: number; skusSkipped: number };
}

export interface InventoryStats {
  skus: number;
  units: number;
  costValue: number;
  listValue: number;
  marketValue: number;
  belowMarket: number;
  unpriced: number;
}

export function inventoryStats(items: InventoryItem[]): InventoryStats {
  let units = 0, costValue = 0, listValue = 0, marketValue = 0, belowMarket = 0, unpriced = 0;
  for (const it of items) {
    const qty = it.quantity;
    units += qty;
    if (it.cost_gbp != null) costValue += Number(it.cost_gbp) * qty;
    if (it.price_gbp != null) listValue += Number(it.price_gbp) * qty;
    else unpriced += 1;
    if (it.market_gbp != null) {
      marketValue += it.market_gbp * qty;
      if (it.price_gbp != null && it.price_gbp < it.market_gbp * 0.9) belowMarket += 1;
    }
  }
  return {
    skus: items.length,
    units,
    costValue: round2(costValue),
    listValue: round2(listValue),
    marketValue: round2(marketValue),
    belowMarket,
    unpriced,
  };
}

const round2 = (n: number) => Math.round(n * 100) / 100;
