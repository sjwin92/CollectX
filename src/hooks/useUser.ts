
import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { User } from "@supabase/supabase-js";
import { useQuery } from "@tanstack/react-query";

// Extend the User type to include our custom properties
export interface ExtendedUser extends User {
  username?: string;
  reputation?: string;
  tradeCount?: number;
  successRate?: number;
  avatarUrl?: string;
}

// Function to fetch user profile data
const fetchUserProfile = async (userId: string) => {
  // Use a direct SQL query instead of the from() method since the profiles table
  // isn't in the generated types yet
  const { data, error } = await supabase
    .rpc('get_profile_by_id', { user_id: userId });
    
  if (error) {
    console.error("Error fetching user profile:", error);
    return null;
  }
  
  return data;
};

export const useUser = () => {
  const [user, setUser] = useState<ExtendedUser | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  // Function to create extended user with profile data
  const createExtendedUser = async (authUser: User): Promise<ExtendedUser> => {
    const profile = await fetchUserProfile(authUser.id);
    
    const extendedUser: ExtendedUser = {
      ...authUser,
      username: profile?.username || authUser.email?.split('@')[0] || 'Anonymous User',
      reputation: profile?.reputation || 'new',
      tradeCount: profile?.trade_count || 0,
      successRate: profile?.success_rate || 0,
      avatarUrl: profile?.avatar_url
    };
    
    return extendedUser;
  };

  useEffect(() => {
    // Get the initial session
    supabase.auth.getSession().then(async ({ data: { session } }) => {
      if (session?.user) {
        const extendedUser = await createExtendedUser(session.user);
        setUser(extendedUser);
      } else {
        setUser(null);
      }
      setIsLoading(false);
    });

    // Listen for changes to auth state
    const { data: { subscription } } = supabase.auth.onAuthStateChange(async (event, session) => {
      if (session?.user) {
        const extendedUser = await createExtendedUser(session.user);
        setUser(extendedUser);
      } else {
        setUser(null);
      }
      setIsLoading(false);
    });

    return () => {
      subscription.unsubscribe();
    };
  }, []);

  return {
    user,
    isSignedIn: !!user,
    isLoading,
  };
};
