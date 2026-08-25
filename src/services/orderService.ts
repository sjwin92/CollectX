// Cash marketplace order service — parallel to tradeService.ts, but for
// Stripe-backed cash purchases rather than card-for-card barter.
// State machine: pending_payment → paid_held → shipped → completed | refunded | cancelled | disputed
// All state transitions go through SECURITY DEFINER RPCs (or the Stripe
// webhook / release-payout edge functions) to enforce the rules — never a
// direct table write from the client.

import { supabase as supabaseTyped } from "@/integrations/supabase/client";

const supabase = supabaseTyped as any;

export type OrderStatus =
  | "pending_payment"
  | "paid_held"
  | "shipped"
  | "completed"
  | "refunded"
  | "cancelled"
  | "disputed";

export interface OrderSummary {
  id: string;
  listing_id: string;
  user_card_id: string;
  buyer_user_id: string;
  seller_user_id: string;
  status: OrderStatus;
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
  card_name: string;
  image_url: string | null;
  buyer_name: string;
  seller_name: string;
}

const rpc = async (fn: string, args: Record<string, any>) => {
  const { data, error } = await supabase.rpc(fn, args);
  if (error) throw new Error(error.message);
  return data;
};

const enrichOrders = async (rows: any[]): Promise<OrderSummary[]> => {
  if (rows.length === 0) return [];

  const listingIds = Array.from(new Set(rows.map((r) => r.listing_id)));
  const userIds = Array.from(new Set(rows.flatMap((r) => [r.buyer_user_id, r.seller_user_id])));

  const [{ data: listings }, { data: profiles }] = await Promise.all([
    supabase.from("marketplace_listings").select("id, card_name, image_url").in("id", listingIds),
    supabase.from("profiles").select("user_id, display_name, username").in("user_id", userIds),
  ]);

  const listingMap = new Map((listings || []).map((l: any) => [l.id, l]));
  const profileMap = new Map((profiles || []).map((p: any) => [p.user_id, p]));
  const nameOf = (uid: string) => {
    const p = profileMap.get(uid);
    return p?.display_name || p?.username || "Unknown";
  };

  return rows.map((r) => {
    const listing = listingMap.get(r.listing_id) as any;
    return {
      ...r,
      item_amount: Number(r.item_amount),
      buyer_fee_amount: Number(r.buyer_fee_amount),
      seller_fee_amount: Number(r.seller_fee_amount),
      total_charged_amount: Number(r.total_charged_amount),
      seller_payout_amount: r.seller_payout_amount != null ? Number(r.seller_payout_amount) : null,
      card_name: listing?.card_name || "Card",
      image_url: listing?.image_url || null,
      buyer_name: nameOf(r.buyer_user_id),
      seller_name: nameOf(r.seller_user_id),
    };
  });
};

export const getMyOrders = async (): Promise<{ asBuyer: OrderSummary[]; asSeller: OrderSummary[] }> => {
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return { asBuyer: [], asSeller: [] };

  const { data, error } = await supabase
    .from("orders")
    .select("*")
    .or(`buyer_user_id.eq.${user.id},seller_user_id.eq.${user.id}`)
    .order("created_at", { ascending: false });
  if (error) throw error;

  const enriched = await enrichOrders(data || []);
  return {
    asBuyer: enriched.filter((o) => o.buyer_user_id === user.id),
    asSeller: enriched.filter((o) => o.seller_user_id === user.id),
  };
};

export const getOrderById = async (orderId: string): Promise<OrderSummary> => {
  const { data, error } = await supabase.from("orders").select("*").eq("id", orderId).single();
  if (error) throw error;
  const [enriched] = await enrichOrders([data]);
  return enriched;
};

// Address & shipment
export type OrderAddress = {
  full_name?: string;
  line1?: string;
  line2?: string;
  city?: string;
  region?: string;
  postal_code?: string;
  country?: string;
};

export const submitOrderAddress = (orderId: string, address: OrderAddress) =>
  rpc("submit_order_address", { _order_id: orderId, _address: address });

export const getMyOrderAddress = async (orderId: string): Promise<OrderAddress | null> => {
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return null;
  const { data, error } = await supabase
    .from("order_addresses")
    .select("address")
    .eq("order_id", orderId)
    .eq("user_id", user.id)
    .maybeSingle();
  if (error) return null;
  return (data?.address as OrderAddress) ?? null;
};

export const getOrderDestinationAddress = (orderId: string) =>
  rpc("get_order_destination_address", { _order_id: orderId }) as Promise<OrderAddress | null>;

export type OrderShipment = {
  id: string;
  sender_user_id: string;
  recipient_user_id: string;
  status: string;
  tracking_number: string | null;
  carrier: string | null;
  shipped_at: string | null;
  delivered_at: string | null;
};

export const getOrderShipment = async (orderId: string): Promise<OrderShipment | null> => {
  const data = (await rpc("get_order_shipment", { _order_id: orderId })) as OrderShipment[] | null;
  return data?.[0] ?? null;
};

export const markOrderShipped = (orderId: string, tracking: string, carrier: string) =>
  rpc("mark_order_shipped", { _order_id: orderId, _tracking: tracking, _carrier: carrier });

export const cancelOrder = (orderId: string) => rpc("cancel_order", { _order_id: orderId });

export const openOrderDispute = (orderId: string, reason: string) =>
  rpc("open_order_dispute", { _order_id: orderId, _reason: reason });

// Buyer's "Confirm receipt" — calls the edge function directly (not a plain
// RPC) because releasing payout requires calling Stripe first; the order is
// only marked completed after Stripe confirms the transfer succeeded.
export const confirmOrderReceipt = async (orderId: string): Promise<void> => {
  const { data, error } = await supabase.functions.invoke("release-order-payout", {
    body: { order_id: orderId },
  });
  if (error) throw error;
  if (data?.error) throw new Error(data.error);
};
