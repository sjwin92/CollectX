// CollectX for Business — Phase 0. Store applications, the store profile, and
// admin review. See docs/collectx-for-business.html for the full plan.

import { supabase } from "@/integrations/supabase/client";

export type ApplicationStatus = "submitted" | "approved" | "rejected" | "needs_info";
export type StoreStatus = "pending" | "active" | "suspended";

export interface StoreApplication {
  id: string;
  user_id: string;
  business_name: string;
  registration_no: string | null;
  country: string;
  website: string | null;
  volume_estimate: string | null;
  message: string | null;
  status: ApplicationStatus;
  review_note: string | null;
  reviewed_at: string | null;
  created_at: string;
}

export interface StoreProfile {
  user_id: string;
  slug: string;
  name: string;
  bio: string | null;
  logo_url: string | null;
  banner_url: string | null;
  website: string | null;
  location: { city?: string; country?: string } | null;
  status: StoreStatus;
  verified_at: string | null;
  commission_bps: number;
  subscription_tier: string;
  created_at: string;
}

export interface StoreApplyInput {
  business_name: string;
  registration_no?: string;
  country: string;
  website?: string;
  volume_estimate?: string;
  message?: string;
}

export async function submitStoreApplication(input: StoreApplyInput): Promise<StoreApplication> {
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) throw new Error("Sign in to apply.");
  const { data, error } = await supabase
    .from("store_applications")
    .insert({
      user_id: user.id,
      business_name: input.business_name.trim(),
      registration_no: input.registration_no?.trim() || null,
      country: input.country.trim(),
      website: input.website?.trim() || null,
      volume_estimate: input.volume_estimate || null,
      message: input.message?.trim() || null,
      status: "submitted",
    })
    .select()
    .single();
  if (error) throw error;
  return data as StoreApplication;
}

export async function getMyStoreApplication(): Promise<StoreApplication | null> {
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return null;
  const { data, error } = await supabase
    .from("store_applications")
    .select("*")
    .eq("user_id", user.id)
    .order("created_at", { ascending: false })
    .limit(1)
    .maybeSingle();
  if (error) return null;
  return (data as StoreApplication) ?? null;
}

export async function getMyStore(): Promise<StoreProfile | null> {
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return null;
  const { data, error } = await supabase
    .from("store_profiles")
    .select("*")
    .eq("user_id", user.id)
    .maybeSingle();
  if (error) return null;
  return (data as StoreProfile) ?? null;
}

export async function getStoreBySlug(slug: string): Promise<StoreProfile | null> {
  const { data, error } = await supabase
    .from("store_profiles")
    .select("*")
    .eq("slug", slug)
    .eq("status", "active")
    .maybeSingle();
  if (error) return null;
  return (data as StoreProfile) ?? null;
}

export async function updateMyStore(patch: Partial<Pick<StoreProfile,
  "name" | "bio" | "logo_url" | "banner_url" | "website" | "location">>): Promise<void> {
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) throw new Error("Not signed in");
  const { error } = await supabase.from("store_profiles").update(patch).eq("user_id", user.id);
  if (error) throw error;
}

export async function activateStore(): Promise<StoreProfile> {
  const { data, error } = await supabase.rpc("activate_store");
  if (error) throw new Error(error.message);
  return data as StoreProfile;
}

/** Which of these user ids are active verified stores → { slug, name }. */
export async function getActiveStoreMap(userIds: string[]): Promise<Map<string, { slug: string; name: string }>> {
  const ids = Array.from(new Set(userIds.filter(Boolean)));
  const map = new Map<string, { slug: string; name: string }>();
  if (ids.length === 0) return map;
  const { data, error } = await supabase
    .from("store_profiles")
    .select("user_id, slug, name")
    .eq("status", "active")
    .in("user_id", ids);
  if (error) return map;
  for (const row of data ?? []) map.set(row.user_id, { slug: row.slug, name: row.name });
  return map;
}

// ── Admin ────────────────────────────────────────────────────────────────
export async function listStoreApplications(status?: ApplicationStatus): Promise<StoreApplication[]> {
  let q = supabase.from("store_applications").select("*").order("created_at", { ascending: false });
  if (status) q = q.eq("status", status);
  const { data, error } = await q;
  if (error) throw error;
  return (data ?? []) as StoreApplication[];
}

export async function reviewStoreApplication(args: {
  applicationId: string;
  decision: Exclude<ApplicationStatus, "submitted">;
  note?: string;
  slug?: string;
  commissionBps?: number;
}): Promise<void> {
  const { error } = await supabase.rpc("review_store_application", {
    _application_id: args.applicationId,
    _decision: args.decision,
    _note: args.note ?? null,
    _slug: args.slug ?? null,
    _commission_bps: args.commissionBps ?? 800,
  });
  if (error) throw new Error(error.message);
}
