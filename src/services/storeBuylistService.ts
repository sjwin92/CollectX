// CollectX for Business — Phase 3. The buylist: a store publishes standing buy
// offers; a collector sells a card from their collection into one. The store
// pays the quote into escrow; the collector is paid (quote − ~2% spread) on
// confirm; the card moves into the store's inventory.

import { supabase as supabaseTyped } from "@/integrations/supabase/client";
import type { OrderAddress, OrderShipment, OrderStatus } from "@/services/orderService";

// eslint-disable-next-line @typescript-eslint/no-explicit-any
const supabase = supabaseTyped as any;
export type { OrderAddress, OrderShipment, OrderStatus };

export interface BuylistRule {
  id: string;
  store_id: string;
  label: string | null;
  set_id: string | null;
  card_id: string | null;
  rarity: string | null;
  condition: string | null;
  is_graded: boolean | null;
  pct_of_market: number;
  min_gbp: number;
  max_gbp: number | null;
  daily_cap_gbp: number | null;
  active: boolean;
}

export interface BuylistRuleInput {
  id?: string;
  label?: string | null;
  set_id?: string | null;
  card_id?: string | null;
  rarity?: string | null;
  condition?: string | null;
  is_graded?: boolean | null;
  pct_of_market: number;
  min_gbp: number;
  max_gbp?: number | null;
  daily_cap_gbp?: number | null;
  active?: boolean;
}

export type BuylistRuleWithStore = BuylistRule & { store_name: string; store_slug: string };

export interface BuylistOffer {
  buylist_id: string;
  store_id: string;
  store_name: string;
  store_slug: string;
  pct_of_market: number;
  quote_gbp: number;
}

export interface BuylistOrderSummary {
  id: string;
  buylist_id: string | null;
  store_id: string;
  seller_user_id: string;
  user_card_id: string | null;
  status: OrderStatus;
  market_gbp: number;
  quote_amount: number;
  platform_fee_amount: number;
  seller_payout_amount: number;
  currency: string;
  auto_confirm_at: string | null;
  shipped_at: string | null;
  completed_at: string | null;
  created_at: string;
  card_id: string | null;
  card_name: string;
  image_url: string | null;
  set_name: string | null;
  card_number: string | null;
  condition: string | null;
  is_graded: boolean;
  grade_company: string | null;
  grade_score: number | null;
  store_name: string;
  seller_name: string;
  is_store?: boolean;
}

const round2 = (n: number) => Math.round(n * 100) / 100;

// eslint-disable-next-line @typescript-eslint/no-explicit-any
const rpc = async (fn: string, args: Record<string, any>) => {
  const { data, error } = await supabase.rpc(fn, args);
  if (error) throw new Error(error.message);
  return data;
};

const invokeError = async (error: { message: string; context?: unknown }): Promise<never> => {
  let msg = error.message;
  try {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const ctx = (error as any).context;
    const parsed = ctx && typeof ctx.json === "function" ? await ctx.json() : null;
    if (parsed?.error) msg = parsed.error;
  } catch { /* keep generic */ }
  throw new Error(msg);
};

// ── Store side: rule management ──────────────────────────────────────────
export const listMyBuylistRules = async (): Promise<BuylistRule[]> => {
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return [];
  const { data, error } = await supabase
    .from("store_buylist")
    .select("*")
    .eq("store_id", user.id)
    .order("created_at", { ascending: false });
  if (error) throw error;
  return (data ?? []) as BuylistRule[];
};

export const upsertBuylistRule = async (input: BuylistRuleInput): Promise<void> => {
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) throw new Error("Not signed in");
  const row = {
    store_id: user.id,
    label: input.label?.trim() || null,
    set_id: input.set_id?.trim().toLowerCase() || null,
    card_id: input.card_id?.trim() || null,
    rarity: input.rarity?.trim() || null,
    condition: input.condition?.trim() || null,
    is_graded: input.is_graded ?? null,
    pct_of_market: Math.max(1, Math.min(100, Math.round(input.pct_of_market))),
    min_gbp: Math.max(0, input.min_gbp),
    max_gbp: input.max_gbp ?? null,
    daily_cap_gbp: input.daily_cap_gbp ?? null,
    active: input.active ?? true,
  };
  const q = input.id
    ? supabase.from("store_buylist").update(row).eq("id", input.id)
    : supabase.from("store_buylist").insert(row);
  const { error } = await q;
  if (error) throw error;
};

export const deleteBuylistRule = async (id: string): Promise<void> => {
  const { error } = await supabase.from("store_buylist").delete().eq("id", id);
  if (error) throw error;
};

export const setBuylistRuleActive = async (id: string, active: boolean): Promise<void> => {
  const { error } = await supabase.from("store_buylist").update({ active }).eq("id", id);
  if (error) throw error;
};

// ── Collector side: discovery ───────────────────────────────────────────
export const listActiveBuylistRules = async (): Promise<BuylistRuleWithStore[]> => {
  const { data, error } = await supabase
    .from("store_buylist")
    .select("*")
    .eq("active", true);
  if (error) throw error;
  const rules = (data ?? []) as BuylistRule[];
  if (rules.length === 0) return [];
  const storeIds = Array.from(new Set(rules.map((r) => r.store_id)));
  const { data: stores } = await supabase
    .from("store_profiles")
    .select("user_id, name, slug")
    .eq("status", "active")
    .in("user_id", storeIds);
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const map = new Map(((stores ?? []) as any[]).map((s) => [s.user_id, s]));
  return rules
    .filter((r) => map.has(r.store_id))
    .map((r) => ({ ...r, store_name: map.get(r.store_id)!.name, store_slug: map.get(r.store_id)!.slug }));
};

export interface SellableCard {
  card_id: string;
  set_id: string;
  rarity: string;
  condition: string;
  is_graded: boolean;
}

/** Does this collection card fall inside the rule's scope? Mirrors create_buylist_order. */
export const ruleMatches = (r: BuylistRule, c: SellableCard): boolean => {
  if (r.set_id && r.set_id.toLowerCase() !== (c.set_id || "").toLowerCase()) return false;
  if (r.card_id && r.card_id !== c.card_id) return false;
  if (r.rarity && r.rarity.toLowerCase() !== (c.rarity || "").toLowerCase()) return false;
  if (r.condition && r.condition.toLowerCase() !== (c.condition || "near_mint").toLowerCase()) return false;
  if (r.is_graded != null && r.is_graded !== !!c.is_graded) return false;
  return true;
};

export const quoteFor = (r: BuylistRule, marketGbp: number): number => {
  let q = marketGbp * r.pct_of_market / 100;
  q = Math.max(q, Number(r.min_gbp));
  if (r.max_gbp != null) q = Math.min(q, Number(r.max_gbp));
  return round2(q);
};

/** Best offer across all active rules for a given card + market price. */
export const bestOffer = (
  rules: BuylistRuleWithStore[],
  card: SellableCard,
  marketGbp: number,
): BuylistOffer | null => {
  let best: BuylistOffer | null = null;
  for (const r of rules) {
    if (!ruleMatches(r, card)) continue;
    const quote = quoteFor(r, marketGbp);
    if (quote <= 0) continue;
    if (!best || quote > best.quote_gbp) {
      best = {
        buylist_id: r.id,
        store_id: r.store_id,
        store_name: r.store_name,
        store_slug: r.store_slug,
        pct_of_market: r.pct_of_market,
        quote_gbp: quote,
      };
    }
  }
  return best;
};

export const allOffers = (
  rules: BuylistRuleWithStore[],
  card: SellableCard,
  marketGbp: number,
): BuylistOffer[] =>
  rules
    .filter((r) => ruleMatches(r, card))
    .map((r) => ({
      buylist_id: r.id,
      store_id: r.store_id,
      store_name: r.store_name,
      store_slug: r.store_slug,
      pct_of_market: r.pct_of_market,
      quote_gbp: quoteFor(r, marketGbp),
    }))
    .filter((o) => o.quote_gbp > 0)
    .sort((a, b) => b.quote_gbp - a.quote_gbp);

// ── Offer + order lifecycle ────────────────────────────────────────────
export const createBuylistOffer = async (buylistId: string, userCardId: string): Promise<{ order_id: string; quote: number }> => {
  const { data, error } = await supabase.functions.invoke("create-buylist-order", {
    body: { buylist_id: buylistId, user_card_id: userCardId },
  });
  if (error) return invokeError(error);
  if (data?.error) throw new Error(data.error);
  return data as { order_id: string; quote: number };
};

export const payBuylistOrder = async (orderId: string): Promise<string> => {
  const { data, error } = await supabase.functions.invoke("create-buylist-checkout", {
    body: { order_id: orderId },
  });
  if (error) return invokeError(error);
  if (data?.error) throw new Error(data.error);
  if (!data?.url) throw new Error("Checkout could not be started.");
  return data.url as string;
};

// eslint-disable-next-line @typescript-eslint/no-explicit-any
const enrich = async (rows: any[]): Promise<BuylistOrderSummary[]> => {
  if (rows.length === 0) return [];
  const userIds = Array.from(new Set(rows.flatMap((r) => [r.seller_user_id, r.store_id])));
  const [{ data: profiles }, { data: stores }] = await Promise.all([
    supabase.from("profiles").select("user_id, display_name, username").in("user_id", userIds),
    supabase.from("store_profiles").select("user_id, name").in("user_id", userIds),
  ]);
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const pMap = new Map(((profiles || []) as any[]).map((p) => [p.user_id, p]));
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const sMap = new Map(((stores || []) as any[]).map((s) => [s.user_id, s.name]));
  const nameOf = (uid: string) => {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const p = pMap.get(uid) as any;
    return p?.display_name || p?.username || "Unknown";
  };
  return rows.map((r) => ({
    ...r,
    market_gbp: Number(r.market_gbp),
    quote_amount: Number(r.quote_amount),
    platform_fee_amount: Number(r.platform_fee_amount),
    seller_payout_amount: Number(r.seller_payout_amount),
    grade_score: r.grade_score != null ? Number(r.grade_score) : null,
    card_name: r.card_name || "Card",
    store_name: sMap.get(r.store_id) || nameOf(r.store_id),
    seller_name: nameOf(r.seller_user_id),
  }));
};

export const getMyBuylistOrders = async (): Promise<{ asSeller: BuylistOrderSummary[]; asStore: BuylistOrderSummary[] }> => {
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return { asSeller: [], asStore: [] };
  const { data, error } = await supabase
    .from("buylist_orders")
    .select("*")
    .or(`seller_user_id.eq.${user.id},store_id.eq.${user.id}`)
    .order("created_at", { ascending: false });
  if (error) throw error;
  const enriched = await enrich(data || []);
  return {
    asSeller: enriched.filter((o) => o.seller_user_id === user.id),
    asStore: enriched.filter((o) => o.store_id === user.id).map((o) => ({ ...o, is_store: true })),
  };
};

export const getBuylistOrderById = async (orderId: string): Promise<BuylistOrderSummary> => {
  const { data, error } = await supabase.from("buylist_orders").select("*").eq("id", orderId).single();
  if (error) throw error;
  const [enriched] = await enrich([data]);
  const { data: { user } } = await supabase.auth.getUser();
  return { ...enriched, is_store: !!user && enriched.store_id === user.id };
};

// Address & shipment (roles: store submits ship-to, collector ships)
export const submitBuylistOrderAddress = (orderId: string, address: OrderAddress) =>
  rpc("submit_buylist_order_address", { _order_id: orderId, _address: address });

export const getMyBuylistOrderAddress = async (orderId: string): Promise<OrderAddress | null> => {
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return null;
  const { data, error } = await supabase
    .from("buylist_order_addresses")
    .select("address")
    .eq("order_id", orderId)
    .eq("user_id", user.id)
    .maybeSingle();
  if (error) return null;
  return (data?.address as OrderAddress) ?? null;
};

export const getBuylistOrderDestinationAddress = (orderId: string) =>
  rpc("get_buylist_order_destination_address", { _order_id: orderId }) as Promise<OrderAddress | null>;

export const getBuylistOrderShipment = async (orderId: string): Promise<OrderShipment | null> => {
  const data = (await rpc("get_buylist_order_shipment", { _order_id: orderId })) as OrderShipment[] | null;
  return data?.[0] ?? null;
};

export const markBuylistOrderShipped = (orderId: string, tracking: string, carrier: string) =>
  rpc("mark_buylist_order_shipped", { _order_id: orderId, _tracking: tracking, _carrier: carrier });

export const cancelBuylistOrder = (orderId: string) => rpc("cancel_buylist_order", { _order_id: orderId });

export const openBuylistOrderDispute = (orderId: string, reason: string) =>
  rpc("open_buylist_order_dispute", { _order_id: orderId, _reason: reason });

// The STORE confirms receipt → releases the collector's payout.
export const confirmBuylistOrderReceipt = async (orderId: string): Promise<void> => {
  const { data, error } = await supabase.functions.invoke("release-order-payout", {
    body: { buylist_order_id: orderId },
  });
  if (error) throw error;
  if (data?.error) throw new Error(data.error);
};
