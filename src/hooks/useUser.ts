
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

// Define a type for the profile data returned from the database
interface UserProfile {
  id: string;
  username?: string;
  full_name?: string;
  avatar_url?: string;
  reputation?: string;
  trade_count?: number;
  success_rate?: number;
  created_at?: string;
  updated_at?: string;
}

// Function to fetch user profile data
const fetchUserProfile = async (userId: string): Promise<UserProfile | null> => {
  // The RPC function only needs one type parameter - the return type
  const { data, error } = await supabase.rpc<UserProfile[]>(
    'get_profile_by_id', 
    { user_id: userId }
  );
  
  if (error) {
    console.error("Error fetching user profile:", error);
    return null;
  }
  
  return (data && data[0]) ? data[0] : null;
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
      avatarUrl: profile?.avatar_url || ''
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
