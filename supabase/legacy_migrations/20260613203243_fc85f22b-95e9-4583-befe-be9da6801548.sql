-- Trigger-only functions: revoke EXECUTE from anon/authenticated/PUBLIC.
REVOKE EXECUTE ON FUNCTION public.update_updated_at_column() FROM PUBLIC, anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.handle_new_user() FROM PUBLIC, anon, authenticated;
-- Admin-only RPC: revoke from anon (function still self-gates with has_role).
REVOKE EXECUTE ON FUNCTION public.get_nav_metrics_summary(integer) FROM PUBLIC, anon;