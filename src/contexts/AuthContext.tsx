import {
  createContext,
  useContext,
  useEffect,
  useRef,
  useState,
  type ReactNode,
} from "react";
import type { Session, User } from "@supabase/supabase-js";
import { supabase } from "@/integrations/supabase/client";

type AuthContextValue = {
  user: User | null;
  session: Session | null;
  isLoaded: boolean;
};

const AuthContext = createContext<AuthContextValue | null>(null);

/**
 * Owns the single supabase.auth.onAuthStateChange subscription for the app.
 * Every consumer reads from this shared context instead of attaching its own
 * listener — that avoids the N-subscriptions / N-fetches problem the old
 * useUser hook had.
 */
export const AuthProvider = ({ children }: { children: ReactNode }) => {
  const [session, setSession] = useState<Session | null>(null);
  const [isLoaded, setIsLoaded] = useState(false);
  const mounted = useRef(true);

  useEffect(() => {
    mounted.current = true;

    // Synchronous listener — never call async Supabase APIs from inside the
    // callback (causes deadlocks per Supabase guidance). We just store the
    // session; profile is fetched lazily via React Query in useUser().
    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      (_event, nextSession) => {
        if (!mounted.current) return;
        setSession(nextSession);
        setIsLoaded(true);
      },
    );

    // Hydrate from any existing session on first paint.
    supabase.auth.getSession().then(({ data }) => {
      if (!mounted.current) return;
      setSession(data.session);
      setIsLoaded(true);
    });

    return () => {
      mounted.current = false;
      subscription.unsubscribe();
    };
  }, []);

  return (
    <AuthContext.Provider
      value={{ session, user: session?.user ?? null, isLoaded }}
    >
      {children}
    </AuthContext.Provider>
  );
};

export function useAuthContext(): AuthContextValue {
  const ctx = useContext(AuthContext);
  if (!ctx) {
    // Allow usage before provider mounts (returns logged-out defaults) so
    // tests / lazy-loaded components can render without throwing.
    return { user: null, session: null, isLoaded: false };
  }
  return ctx;
}
