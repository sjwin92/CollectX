
import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { User } from "@supabase/supabase-js";

// Extend the User type to include our custom properties
export interface ExtendedUser extends User {
  username?: string;
}

export const useUser = () => {
  const [user, setUser] = useState<ExtendedUser | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    // Get the initial session
    supabase.auth.getSession().then(({ data: { session } }) => {
      if (session?.user) {
        // Add the username property
        const extendedUser: ExtendedUser = {
          ...session.user,
          username: session.user.email?.split('@')[0] || 'Anonymous User'
        };
        setUser(extendedUser);
      } else {
        setUser(null);
      }
      setIsLoading(false);
    });

    // Listen for changes to auth state
    const { data: { subscription } } = supabase.auth.onAuthStateChange((event, session) => {
      if (session?.user) {
        // Add the username property
        const extendedUser: ExtendedUser = {
          ...session.user,
          username: session.user.email?.split('@')[0] || 'Anonymous User'
        };
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
