import { ReactNode, useEffect, useState } from "react";
import { Navigate } from "react-router-dom";
import { useAuthContext } from "@/contexts/AuthContext";
import { supabase } from "@/integrations/supabase/client";

interface Props {
  children: ReactNode;
}

/**
 * Gates a route to users with the `admin` role in public.user_roles.
 * Server-side RLS + has_role() remain the source of truth; this is a UX guard.
 */
const AdminRoute = ({ children }: Props) => {
  const { user, loading: authLoading } = useAuthContext();
  const [checking, setChecking] = useState(true);
  const [isAdmin, setIsAdmin] = useState(false);

  useEffect(() => {
    let cancelled = false;
    if (authLoading) return;
    if (!user) {
      setChecking(false);
      return;
    }
    (async () => {
      const { data, error } = await supabase
        .from("user_roles")
        .select("role")
        .eq("user_id", user.id)
        .eq("role", "admin")
        .maybeSingle();
      if (cancelled) return;
      setIsAdmin(!error && !!data);
      setChecking(false);
    })();
    return () => {
      cancelled = true;
    };
  }, [user, authLoading]);

  if (authLoading || checking) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="h-8 w-8 rounded-full border-2 border-primary border-t-transparent animate-spin" />
      </div>
    );
  }
  if (!user) return <Navigate to="/auth" replace />;
  if (!isAdmin) return <Navigate to="/" replace />;
  return <>{children}</>;
};

export default AdminRoute;
