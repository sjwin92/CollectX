// CollectX for Business — Phase 4. Monthly plans (each lowers/waives the
// per-sale seller commission) + team seats.

import { supabase as supabaseTyped } from "@/integrations/supabase/client";

// eslint-disable-next-line @typescript-eslint/no-explicit-any
const supabase = supabaseTyped as any;

export interface BusinessPlan {
  id: "starter" | "growth" | "pro";
  name: string;
  price_gbp: number;
  seller_fee_bps: number;
  blurb: string | null;
  sort: number;
}

export type SubscriptionStatus = "incomplete" | "active" | "past_due" | "canceled";

export interface StoreSubscription {
  plan_id: string;
  status: SubscriptionStatus;
  seller_fee_bps: number;
  price_gbp: number;
  current_period_end: string | null;
  cancel_at_period_end: boolean;
}

export type MemberRole = "owner" | "lister" | "shipper";
export interface StoreMember {
  user_id: string;
  role: MemberRole;
  name: string;
  username: string | null;
}

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

export const getBusinessPlans = async (): Promise<BusinessPlan[]> => {
  const { data, error } = await supabase
    .from("business_plans")
    .select("id, name, price_gbp, seller_fee_bps, blurb, sort")
    .eq("active", true)
    .order("sort", { ascending: true });
  if (error) throw error;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  return ((data ?? []) as any[]).map((p) => ({ ...p, price_gbp: Number(p.price_gbp) }));
};

export const getMySubscription = async (): Promise<StoreSubscription | null> => {
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return null;
  const { data, error } = await supabase
    .from("store_subscriptions")
    .select("plan_id, status, seller_fee_bps, price_gbp, current_period_end, cancel_at_period_end")
    .eq("store_id", user.id)
    .maybeSingle();
  if (error) return null;
  if (!data) return null;
  return { ...data, price_gbp: Number(data.price_gbp) } as StoreSubscription;
};

export const subscribeToPlan = async (planId: string): Promise<string> => {
  const { data, error } = await supabase.functions.invoke("create-subscription-checkout", {
    body: { plan_id: planId },
  });
  if (error) return invokeError(error);
  if (data?.error) throw new Error(data.error);
  if (!data?.url) throw new Error("Checkout could not be started.");
  return data.url as string;
};

export const cancelSubscription = async (): Promise<void> => {
  const { data, error } = await supabase.functions.invoke("cancel-subscription", { body: {} });
  if (error) return invokeError(error);
  if (data?.error) throw new Error(data.error);
};

// ── Team seats ──────────────────────────────────────────────────────────
export const listStoreMembers = async (): Promise<StoreMember[]> => {
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return [];
  const { data, error } = await supabase
    .from("store_members")
    .select("user_id, role")
    .eq("store_id", user.id)
    .order("created_at", { ascending: true });
  if (error) throw error;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const rows = (data ?? []) as any[];
  if (rows.length === 0) return [];
  const { data: profiles } = await supabase
    .from("profiles")
    .select("user_id, display_name, username")
    .in("user_id", rows.map((r) => r.user_id));
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const pMap = new Map(((profiles ?? []) as any[]).map((p) => [p.user_id, p]));
  return rows.map((r) => {
    const p = pMap.get(r.user_id);
    return { user_id: r.user_id, role: r.role, name: p?.display_name || p?.username || "Member", username: p?.username ?? null };
  });
};

export const addStoreMember = async (usernameOrHandle: string, role: MemberRole): Promise<void> => {
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) throw new Error("Not signed in");
  const handle = usernameOrHandle.trim().replace(/^@/, "");
  if (!handle) throw new Error("Enter a username");
  const { data: profile } = await supabase
    .from("profiles")
    .select("user_id, username, display_name")
    .or(`username.ilike.${handle},display_name.ilike.${handle}`)
    .limit(1)
    .maybeSingle();
  if (!profile?.user_id) throw new Error(`No CollectX user "${handle}"`);
  if (profile.user_id === user.id) throw new Error("You're the owner — no seat needed");
  const { error } = await supabase
    .from("store_members")
    .insert({ store_id: user.id, user_id: profile.user_id, role });
  if (error) throw new Error(error.message.includes("duplicate") ? "That person is already on the team" : error.message);
};

export const updateStoreMemberRole = async (userId: string, role: MemberRole): Promise<void> => {
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) throw new Error("Not signed in");
  const { error } = await supabase
    .from("store_members")
    .update({ role })
    .eq("store_id", user.id)
    .eq("user_id", userId);
  if (error) throw error;
};

export const removeStoreMember = async (userId: string): Promise<void> => {
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) throw new Error("Not signed in");
  const { error } = await supabase
    .from("store_members")
    .delete()
    .eq("store_id", user.id)
    .eq("user_id", userId);
  if (error) throw error;
};
