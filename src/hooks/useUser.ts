import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuthContext } from "@/contexts/AuthContext";

export interface Profile {
  id: string;
  user_id: string;
  username: string | null;
  display_name: string | null;
  avatar_url: string | null;
  bio: string | null;
  location: string | null;
  reputation_score: number;
  total_trades: number;
  successful_trades: number;
  created_at: string;
  updated_at: string;
}

/**
 * Reads the shared auth state from AuthProvider and lazily loads the
 * matching profile via React Query (cached, deduped, cancellable).
 *
 * Public API is unchanged from the previous hook so existing call sites
 * keep working: `{ user, session, profile, isLoaded, isSignedIn }`.
 */
export function useUser() {
  const { user, session, isLoaded } = useAuthContext();

  const { data: profile = null } = useQuery({
    queryKey: ["profile", user?.id],
    enabled: !!user?.id,
    staleTime: 5 * 60 * 1000, // 5 minutes — profile rarely changes
    queryFn: async (): Promise<Profile | null> => {
      if (!user?.id) return null;
      const { data, error } = await supabase
        .from("profiles")
        .select("*")
        .eq("user_id", user.id)
        .maybeSingle();
      if (error) throw error;
      return (data as Profile | null) ?? null;
    },
  });

  return {
    user,
    session,
    profile,
    isLoaded,
    isSignedIn: !!user,
  };
}
