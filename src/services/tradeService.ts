// Real trade service — talks to Lovable Cloud (Supabase) exclusively.
// State machine: proposed → accepted → shipped → completed | cancelled | disputed
// All state transitions go through SECURITY DEFINER RPCs to enforce rules.

import { supabase as supabaseTyped } from "@/integrations/supabase/client";
import type {
  TradeProposal,
  TradeStatus,
  TradeCard,
  Currency,
  UserReputation,
} from "@/models/trade";

const supabase = supabaseTyped as any;

// ── Helpers ────────────────────────────────────────────────────────────────

const repTier = (score: number | null | undefined): UserReputation => {
  const s = Number(score) || 0;
  if (s >= 4.5) return "elite";
  if (s >= 4.0) return "trusted";
  if (s >= 3.0) return "established";
  if (s > 0) return "starter";
  return "new";
};

const parseCards = (raw: any): any[] => {
  if (!raw) return [];
  if (typeof raw === "string") {
    try { return JSON.parse(raw); } catch { return []; }
  }
  return Array.isArray(raw) ? raw : [];
};

const mapCards = (rows: any[]): (TradeCard & { quantity: number })[] =>
  rows.map((c) => ({
    id: c.id || c.card_id || "",
    name: c.card_name || c.name || "Unknown Card",
    imageUrl: c.imageUrl || c.image_url || "",
    condition: c.condition || "Unknown",
    estimatedValue: parseFloat(c.estimatedValue || c.trade_value || "0") || 0,
    currency: (c.currency as Currency) || "GBP",
    quantity: Number(c.quantity) > 0 ? Number(c.quantity) : 1,
  }));

// ── Reads ──────────────────────────────────────────────────────────────────

export type TradeProposalWithConfirms = TradeProposal & {
  initiator_confirmed_at: string | null;
  recipient_confirmed_at: string | null;
};

export const getTradeById = async (tradeId: string): Promise<TradeProposalWithConfirms> => {
  const { data, error } = await supabase
    .from("trades")
    .select("*")
    .eq("id", tradeId)
    .single();
  if (error) throw error;

  const participantIds = [data.initiator_user_id, data.recipient_user_id].filter(Boolean);
  const { data: profiles } = await supabase
    .from("profiles")
    .select("user_id, display_name, username, avatar_url, reputation_score, successful_trades, total_trades")
    .in("user_id", participantIds);
  const profileMap = new Map<string, any>((profiles || []).map((p: any) => [p.user_id, p]));
  const initiatorProfile = profileMap.get(data.initiator_user_id);
  const recipientProfile = profileMap.get(data.recipient_user_id);

  const messages = await getTradeMessages(tradeId);

  const initiatorCards = mapCards(parseCards(data.initiator_cards));
  const recipientCards = mapCards(parseCards(data.recipient_cards));

  const initiatorName = initiatorProfile?.display_name || initiatorProfile?.username || "Unknown";
  const recipientName = recipientProfile?.display_name || recipientProfile?.username || "Unknown";

  const nameOf = (uid: string) =>
    uid === data.initiator_user_id ? initiatorName :
    uid === data.recipient_user_id ? recipientName : "";
  const enrichedMessages = messages.map((m) => ({ ...m, username: nameOf(m.userId) }));

  return {
    id: data.id,
    status: data.status as TradeStatus,
    createdAt: data.created_at,
    updatedAt: data.updated_at,
    initiator: {
      userId: data.initiator_user_id,
      username: initiatorName,
      reputation: repTier(initiatorProfile?.reputation_score),
      tradeCount: initiatorProfile?.total_trades || 0,
      successRate: initiatorProfile?.total_trades
        ? (initiatorProfile.successful_trades / initiatorProfile.total_trades) * 100
        : 0,
      offeringCards: initiatorCards,
    },
    recipient: {
      userId: data.recipient_user_id,
      username: recipientName,
      reputation: repTier(recipientProfile?.reputation_score),
      tradeCount: recipientProfile?.total_trades || 0,
      successRate: recipientProfile?.total_trades
        ? (recipientProfile.successful_trades / recipientProfile.total_trades) * 100
        : 0,
      offeringCards: recipientCards,
    },
    messages: enrichedMessages,
    initiator_confirmed_at: data.initiator_confirmed_at ?? null,
    recipient_confirmed_at: data.recipient_confirmed_at ?? null,
  };
};

export const getTradeMessages = async (tradeId: string) => {
  const { data, error } = await supabase
    .from("trade_messages")
    .select("*")
    .eq("trade_id", tradeId)
    .order("created_at", { ascending: true });
  if (error) throw error;
  return (data || []).map((m: any) => ({
    id: m.id,
    tradeId: m.trade_id,
    userId: m.sender_user_id,
    username: "",
    message: m.message,
    createdAt: m.created_at,
    systemMessage: m.message_type === "system",
    imageUrl: m.image_url ?? null,
  }));
};

// ── Writes ─────────────────────────────────────────────────────────────────

export const addTradeMessage = async (
  tradeId: string,
  message: string,
  imageUrl: string | null = null,
): Promise<void> => {
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) throw new Error("Not signed in");
  const text = (message ?? "").trim();
  if (!text && !imageUrl) throw new Error("Message text or image required");
  const { error } = await supabase.from("trade_messages").insert({
    trade_id: tradeId,
    sender_user_id: user.id,
    message: text || "",
    message_type: "text",
    image_url: imageUrl,
  });
  if (error) throw error;
};

const rpc = async (fn: string, args: Record<string, any>) => {
  const { data, error } = await supabase.rpc(fn, args);
  if (error) throw new Error(error.message);
  return data;
};

export const proposeTrade = (listingId: string, offeredUserCardIds: string[], message?: string) =>
  rpc("propose_trade", {
    _listing_id: listingId,
    _offered_user_card_ids: offeredUserCardIds,
    _message: message ?? null,
  });

export const acceptTradeProposal  = (tradeId: string) => rpc("accept_trade",  { _trade_id: tradeId });
export const declineTradeProposal = (tradeId: string) => rpc("decline_trade", { _trade_id: tradeId });
export const cancelTradeProposal  = (tradeId: string) => rpc("cancel_trade",  { _trade_id: tradeId });
export const confirmTradeReceipt  = (tradeId: string) => rpc("confirm_trade_receipt", { _trade_id: tradeId });
export const openTradeDispute     = (tradeId: string, reason: string) =>
  rpc("open_trade_dispute", { _trade_id: tradeId, _reason: reason });

export const markTradeShipped = (
  tradeId: string,
  tracking: string,
  carrier: string,
) => rpc("mark_trade_shipped", { _trade_id: tradeId, _tracking: tracking, _carrier: carrier });

// Address & shipment RPCs
export type TradeAddress = {
  full_name?: string;
  line1?: string;
  line2?: string;
  city?: string;
  region?: string;
  postal_code?: string;
  country?: string;
};

export const submitTradeAddress = (tradeId: string, address: TradeAddress) =>
  rpc("submit_trade_address", { _trade_id: tradeId, _address: address });

export const getMyTradeAddress = async (tradeId: string): Promise<TradeAddress | null> => {
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return null;
  const { data, error } = await supabase
    .from("trade_addresses")
    .select("address")
    .eq("trade_id", tradeId)
    .eq("user_id", user.id)
    .maybeSingle();
  if (error) return null;
  return (data?.address as TradeAddress) ?? null;
};

export const getTradeDestinationAddress = (tradeId: string) =>
  rpc("get_trade_destination_address", { _trade_id: tradeId }) as Promise<TradeAddress | null>;

export type SafeShipment = {
  id: string;
  sender_user_id: string;
  recipient_user_id: string;
  status: string;
  tracking_number: string | null;
  carrier: string | null;
  shipped_at: string | null;
  delivered_at: string | null;
};

export const getTradeShipments = async (tradeId: string): Promise<SafeShipment[]> => {
  const data = (await rpc("get_trade_shipments", { _trade_id: tradeId })) as SafeShipment[] | null;
  return data ?? [];
};

// Ratings
export const submitTradeRating = async (
  tradeId: string,
  ratedUserId: string,
  rating: number,
  review?: string,
) => {
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) throw new Error("Not signed in");
  const { error } = await supabase.from("trade_ratings").insert({
    trade_id: tradeId,
    rater_user_id: user.id,
    rated_user_id: ratedUserId,
    rating,
    review: review ?? null,
  });
  if (error) throw new Error(error.message);
};

export const hasRatedTrade = async (tradeId: string): Promise<boolean> => {
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return false;
  const { count } = await supabase
    .from("trade_ratings")
    .select("id", { count: "exact", head: true })
    .eq("trade_id", tradeId)
    .eq("rater_user_id", user.id);
  return (count ?? 0) > 0;
};

// ── Image upload ───────────────────────────────────────────────────────────

export const uploadTradeImage = async (file: File): Promise<string> => {
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) throw new Error("Not signed in");
  const ext = file.name.split(".").pop() || "jpg";
  const path = `trade-images/${user.id}/${Date.now()}.${ext}`;
  const { error } = await supabase.storage.from("card-images").upload(path, file, { upsert: false });
  if (error) throw new Error(error.message);
  const { data } = supabase.storage.from("card-images").getPublicUrl(path);
  return data.publicUrl;
};
