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
} from "@/models/escrow";

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

const mapCards = (rows: any[]): TradeCard[] =>
  rows.map((c) => ({
    id: c.id || c.card_id || "",
    name: c.card_name || c.name || "Unknown Card",
    imageUrl: c.imageUrl || c.image_url || "",
    condition: c.condition || "Unknown",
    estimatedValue: parseFloat(c.estimatedValue || c.trade_value || "0") || 0,
    currency: (c.currency as Currency) || "GBP",
  }));

// ── Reads ──────────────────────────────────────────────────────────────────

export const getTradeById = async (tradeId: string): Promise<TradeProposal> => {
  const { data, error } = await supabase
    .from("trades")
    .select(
      `*,
       initiator_profile:profiles!trades_initiator_user_id_fkey(display_name, username, avatar_url, reputation_score, successful_trades, total_trades),
       recipient_profile:profiles!trades_recipient_user_id_fkey(display_name, username, avatar_url, reputation_score, successful_trades, total_trades)`
    )
    .eq("id", tradeId)
    .single();
  if (error) throw error;

  const messages = await getTradeMessages(tradeId);

  const initiatorCards = mapCards(parseCards(data.initiator_cards));
  const recipientCards = mapCards(parseCards(data.recipient_cards));

  const proposal: TradeProposal = {
    id: data.id,
    status: data.status as TradeStatus,
    createdAt: data.created_at,
    updatedAt: data.updated_at,
    initiator: {
      userId: data.initiator_user_id,
      username: data.initiator_profile?.display_name || data.initiator_profile?.username || "Unknown",
      reputation: repTier(data.initiator_profile?.reputation_score),
      tradeCount: data.initiator_profile?.total_trades || 0,
      successRate: data.initiator_profile?.total_trades
        ? (data.initiator_profile.successful_trades / data.initiator_profile.total_trades) * 100
        : 0,
      offeringCards: initiatorCards,
      escrowAmount: { baseAmount: 0, reputationDiscount: 0, finalAmount: 0, currency: "GBP" },
    },
    recipient: {
      userId: data.recipient_user_id,
      username: data.recipient_profile?.display_name || data.recipient_profile?.username || "Unknown",
      reputation: repTier(data.recipient_profile?.reputation_score),
      tradeCount: data.recipient_profile?.total_trades || 0,
      successRate: data.recipient_profile?.total_trades
        ? (data.recipient_profile.successful_trades / data.recipient_profile.total_trades) * 100
        : 0,
      offeringCards: recipientCards,
      escrowAmount: { baseAmount: 0, reputationDiscount: 0, finalAmount: 0, currency: "GBP" },
    },
    escrow: null,
    messages,
  };
  return proposal;
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
    userId: m.user_id,
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
  const { error } = await supabase.from("trade_messages").insert({
    trade_id: tradeId,
    user_id: user.id,
    message,
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
