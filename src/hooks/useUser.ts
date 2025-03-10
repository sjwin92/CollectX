
import { useAuth } from "@/contexts/AuthContext";

export interface User {
  id: string;
  username: string;
  email: string;
}

export function useUser() {
  const { user, loading } = useAuth();
  
  // Convert Supabase user to our app's user format
  const appUser: User | null = user ? {
    id: user.id,
    username: user.user_metadata?.username || user.email?.split('@')[0] || "User",
    email: user.email || "",
  } : null;
  
  return { 
    user: appUser, 
    isLoaded: !loading, 
    isSignedIn: !!user 
  };
}
