// CollectX for Business — Phase 2b. Buyer checkout + escrow for store SKUs.
// Parallel to orderService.ts, but the item is a store_inventory row rather
// than a user_cards-backed marketplace listing. Same state machine:
// pending_payment → paid_held → shipped → completed | refunded | cancelled | disputed
// All transitions go through SECURITY DEFINER RPCs / edge functions.

import { supabase as supabaseTyped } from "@/integrations/supabase/client";
import type { OrderAddress, OrderShipment, OrderStatus } from "@/services/orderService";

// eslint-disable-next-line @typescript-eslint/no-explicit-any
const supabase = supabaseTyped as any;

export type { OrderAddress, OrderShipment, OrderStatus };

export interface StoreOrderSummary {
  id: string;
  inventory_id: string;
  store_id: string;
  buyer_user_id: string;
  status: OrderStatus;
  quantity: number;
  unit_amount: number;
  item_amount: number;
  buyer_fee_amount: number;
  seller_fee_amount: number;
  total_charged_amount: number;
  seller_payout_amount: number | null;
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
  buyer_name: string;
  store_name: string;
  /** true when the current user is the store on this order */
  is_seller?: boolean;
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
const rpc = async (fn: string, args: Record<string, any>) => {
  const { data, error } = await supabase.rpc(fn, args);
  if (error) throw new Error(error.message);
  return data;
};

// eslint-disable-next-line @typescript-eslint/no-explicit-any
const enrich = async (rows: any[]): Promise<StoreOrderSummary[]> => {
  if (rows.length === 0) return [];
  const userIds = Array.from(new Set(rows.flatMap((r) => [r.buyer_user_id, r.store_id])));
  const [{ data: profiles }, { data: stores }] = await Promise.all([
    supabase.from("profiles").select("user_id, display_name, username").in("user_id", userIds),
    supabase.from("store_profiles").select("user_id, name").in("user_id", userIds),
  ]);
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const profileMap = new Map(((profiles || []) as any[]).map((p) => [p.user_id, p]));
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const storeMap = new Map(((stores || []) as any[]).map((s) => [s.user_id, s.name]));
  const nameOf = (uid: string) => {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const p = profileMap.get(uid) as any;
    return p?.display_name || p?.username || "Unknown";
  };

  return rows.map((r) => ({
    ...r,
    quantity: Number(r.quantity),
    unit_amount: Number(r.unit_amount),
    item_amount: Number(r.item_amount),
    buyer_fee_amount: Number(r.buyer_fee_amount),
    seller_fee_amount: Number(r.seller_fee_amount),
    total_charged_amount: Number(r.total_charged_amount),
    seller_payout_amount: r.seller_payout_amount != null ? Number(r.seller_payout_amount) : null,
    grade_score: r.grade_score != null ? Number(r.grade_score) : null,
    card_name: r.card_name || "Card",
    buyer_name: nameOf(r.buyer_user_id),
    store_name: storeMap.get(r.store_id) || nameOf(r.store_id),
  }));
};

export const getMyStoreOrders = async (): Promise<{ asBuyer: StoreOrderSummary[]; asSeller: StoreOrderSummary[] }> => {
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return { asBuyer: [], asSeller: [] };

  const { data, error } = await supabase
    .from("store_orders")
    .select("*")
    .or(`buyer_user_id.eq.${user.id},store_id.eq.${user.id}`)
    .order("created_at", { ascending: false });
  if (error) throw error;

  const enriched = await enrich(data || []);
  return {
    asBuyer: enriched.filter((o) => o.buyer_user_id === user.id),
    asSeller: enriched.filter((o) => o.store_id === user.id).map((o) => ({ ...o, is_seller: true })),
  };
};

export const getStoreOrderById = async (orderId: string): Promise<StoreOrderSummary> => {
  const { data, error } = await supabase.from("store_orders").select("*").eq("id", orderId).single();
  if (error) throw error;
  const [enriched] = await enrich([data]);
  const { data: { user } } = await supabase.auth.getUser();
  return { ...enriched, is_seller: !!user && enriched.store_id === user.id };
};

// ── Buyer: start checkout ────────────────────────────────────────────────
export const createStoreCheckout = async (inventoryId: string, quantity = 1): Promise<string> => {
  const { data, error } = await supabase.functions.invoke("create-store-checkout", {
    body: { inventory_id: inventoryId, quantity },
  });
  if (error) {
    // Edge function returned a non-2xx — pull the JSON body's message out.
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const ctx = (error as any)?.context;
    let msg = error.message;
    try {
      const parsed = ctx && typeof ctx.json === "function" ? await ctx.json() : null;
      if (parsed?.error) msg = parsed.error;
    } catch { /* keep the generic message */ }
    throw new Error(msg);
  }
  if (data?.error) throw new Error(data.error);
  if (!data?.url) throw new Error("Checkout could not be started.");
  return data.url as string;
};

// ── Address & shipment ──────────────────────────────────────────────────
export const submitStoreOrderAddress = (orderId: string, address: OrderAddress) =>
  rpc("submit_store_order_address", { _order_id: orderId, _address: address });

export const getMyStoreOrderAddress = async (orderId: string): Promise<OrderAddress | null> => {
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return null;
  const { data, error } = await supabase
    .from("store_order_addresses")
    .select("address")
    .eq("order_id", orderId)
    .eq("user_id", user.id)
    .maybeSingle();
  if (error) return null;
  return (data?.address as OrderAddress) ?? null;
};

export const getStoreOrderDestinationAddress = (orderId: string) =>
  rpc("get_store_order_destination_address", { _order_id: orderId }) as Promise<OrderAddress | null>;

export const getStoreOrderShipment = async (orderId: string): Promise<OrderShipment | null> => {
  const data = (await rpc("get_store_order_shipment", { _order_id: orderId })) as OrderShipment[] | null;
  return data?.[0] ?? null;
};

export const markStoreOrderShipped = (orderId: string, tracking: string, carrier: string) =>
  rpc("mark_store_order_shipped", { _order_id: orderId, _tracking: tracking, _carrier: carrier });

export const cancelStoreOrder = (orderId: string) => rpc("cancel_store_order", { _order_id: orderId });

export const openStoreOrderDispute = (orderId: string, reason: string) =>
  rpc("open_store_order_dispute", { _order_id: orderId, _reason: reason });

// Buyer's "Confirm receipt" — releases the store's payout (Stripe transfer
// first, then complete_store_order which decrements inventory).
export const confirmStoreOrderReceipt = async (orderId: string): Promise<void> => {
  const { data, error } = await supabase.functions.invoke("release-order-payout", {
    body: { store_order_id: orderId },
  });
  if (error) throw error;
  if (data?.error) throw new Error(data.error);
};

// ── Storefront: live SKUs a shopper can buy ──────────────────────────────
export interface StoreShelfItem {
  id: string;
  card_id: string;
  card_name: string;
  set_name: string | null;
  card_number: string | null;
  rarity: string | null;
  image_url: string | null;
  condition: string;
  is_graded: boolean;
  grade_company: string | null;
  grade_score: number | null;
  price_gbp: number;
  available: number;
}

export const getStoreShelf = async (storeUserId: string): Promise<StoreShelfItem[]> => {
  const { data, error } = await supabase
    .from("store_inventory")
    .select("id, card_id, card_name, set_name, card_number, rarity, image_url, condition, is_graded, grade_company, grade_score, quantity, reserved, price_gbp")
    .eq("store_id", storeUserId)
    .eq("listed", true)
    .not("price_gbp", "is", null)
    .order("updated_at", { ascending: false });
  if (error) throw error;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  return ((data ?? []) as any[])
    .map((r) => ({
      id: r.id,
      card_id: r.card_id,
      card_name: r.card_name,
      set_name: r.set_name,
      card_number: r.card_number,
      rarity: r.rarity,
      image_url: r.image_url,
      condition: r.condition,
      is_graded: r.is_graded,
      grade_company: r.grade_company,
      grade_score: r.grade_score != null ? Number(r.grade_score) : null,
      price_gbp: Number(r.price_gbp),
      available: Number(r.quantity) - Number(r.reserved),
    }))
    .filter((r) => r.available > 0);
};
