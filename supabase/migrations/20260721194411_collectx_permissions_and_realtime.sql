-- Tighten API privileges and enable the Postgres Changes tables used by CollectX.

REVOKE ALL PRIVILEGES ON ALL TABLES IN SCHEMA public FROM anon, authenticated;
ALTER DEFAULT PRIVILEGES FOR ROLE postgres IN SCHEMA public
  REVOKE ALL PRIVILEGES ON TABLES FROM anon, authenticated;

GRANT USAGE ON SCHEMA public TO anon, authenticated;

GRANT SELECT ON public.profiles TO anon, authenticated;
GRANT INSERT, UPDATE ON public.profiles TO authenticated;

GRANT SELECT ON public.user_cards TO anon, authenticated;
GRANT INSERT, UPDATE, DELETE ON public.user_cards TO authenticated;

GRANT SELECT ON public.card_images TO anon, authenticated;
GRANT INSERT, UPDATE, DELETE ON public.card_images TO authenticated;

GRANT SELECT ON public.marketplace_listings TO anon, authenticated;
GRANT SELECT, INSERT, DELETE ON public.marketplace_interests TO authenticated;
GRANT SELECT, INSERT, DELETE ON public.marketplace_favorites TO authenticated;

GRANT SELECT ON public.trades TO authenticated;
GRANT SELECT, INSERT ON public.trade_messages TO authenticated;
GRANT SELECT ON public.trade_addresses TO authenticated;
GRANT SELECT ON public.trade_shipments TO authenticated;
GRANT SELECT ON public.trade_ownership_transfers TO authenticated;

GRANT SELECT ON public.trade_ratings TO anon, authenticated;
GRANT INSERT ON public.trade_ratings TO authenticated;

GRANT SELECT ON public.shipping_methods, public.shipping_rates TO anon, authenticated;
GRANT SELECT ON public.tracking_events TO authenticated;

GRANT SELECT ON public.notifications TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.notification_preferences TO authenticated;
GRANT SELECT ON public.chat_conversations TO authenticated;
GRANT SELECT, INSERT ON public.chat_messages TO authenticated;

GRANT SELECT ON public.pokemon_sets, public.pokemon_cards, public.set_images, public.set_imports
  TO anon, authenticated;

GRANT INSERT, SELECT ON public.nav_metrics TO authenticated;
GRANT SELECT ON public.user_roles TO authenticated;

GRANT ALL PRIVILEGES ON ALL TABLES IN SCHEMA public TO service_role;

DROP POLICY IF EXISTS "Anyone can insert nav metrics" ON public.nav_metrics;
CREATE POLICY "Authenticated users can insert own nav metrics"
ON public.nav_metrics FOR INSERT TO authenticated
WITH CHECK (
  (select auth.uid()) IS NOT NULL
  AND (user_id IS NULL OR user_id = (select auth.uid()))
  AND is_authenticated IS TRUE
);

CREATE OR REPLACE FUNCTION public.has_role(_user_id uuid, _role public.app_role)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $function$
  SELECT
    _user_id = auth.uid()
    AND EXISTS (
      SELECT 1
      FROM public.user_roles
      WHERE user_id = _user_id
        AND role = _role
    )
$function$;

REVOKE EXECUTE ON ALL FUNCTIONS IN SCHEMA public FROM PUBLIC, anon, authenticated;
ALTER DEFAULT PRIVILEGES FOR ROLE postgres IN SCHEMA public
  REVOKE EXECUTE ON FUNCTIONS FROM PUBLIC, anon, authenticated;

GRANT EXECUTE ON FUNCTION public.accept_trade(uuid) TO authenticated;
GRANT EXECUTE ON FUNCTION public.cancel_trade(uuid) TO authenticated;
GRANT EXECUTE ON FUNCTION public.confirm_trade_receipt(uuid) TO authenticated;
GRANT EXECUTE ON FUNCTION public.decline_trade(uuid) TO authenticated;
GRANT EXECUTE ON FUNCTION public.get_nav_metrics_summary(integer) TO authenticated;
GRANT EXECUTE ON FUNCTION public.get_or_create_conversation(uuid) TO authenticated;
GRANT EXECUTE ON FUNCTION public.get_trade_destination_address(uuid) TO authenticated;
GRANT EXECUTE ON FUNCTION public.get_trade_shipments(uuid) TO authenticated;
GRANT EXECUTE ON FUNCTION public.has_role(uuid, public.app_role) TO authenticated;
GRANT EXECUTE ON FUNCTION public.increment_listing_views(uuid) TO authenticated;
GRANT EXECUTE ON FUNCTION public.mark_all_notifications_read() TO authenticated;
GRANT EXECUTE ON FUNCTION public.mark_conversation_messages_read(uuid) TO authenticated;
GRANT EXECUTE ON FUNCTION public.mark_notifications_read(uuid[]) TO authenticated;
GRANT EXECUTE ON FUNCTION public.mark_trade_shipped(uuid, text, text) TO authenticated;
GRANT EXECUTE ON FUNCTION public.open_trade_dispute(uuid, text) TO authenticated;
GRANT EXECUTE ON FUNCTION public.propose_trade(uuid, uuid[], text) TO authenticated;
GRANT EXECUTE ON FUNCTION public.submit_trade_address(uuid, jsonb) TO authenticated;
GRANT EXECUTE ON FUNCTION public.create_marketplace_listing(uuid, text, text, timestamptz) TO authenticated;
GRANT EXECUTE ON FUNCTION public.update_marketplace_listing(uuid, text, text, timestamptz) TO authenticated;
GRANT EXECUTE ON FUNCTION public.cancel_marketplace_listing(uuid) TO authenticated;
GRANT EXECUTE ON FUNCTION public.can_manage_card_image_object(text) TO authenticated;
GRANT EXECUTE ON FUNCTION public.user_card_locked_in_live_trade(uuid) TO authenticated;

GRANT EXECUTE ON ALL FUNCTIONS IN SCHEMA public TO service_role;

DROP INDEX IF EXISTS public.trade_ratings_one_per_rater;

ALTER TABLE public.trades REPLICA IDENTITY FULL;
ALTER TABLE public.trade_messages REPLICA IDENTITY FULL;
ALTER TABLE public.user_cards REPLICA IDENTITY FULL;
ALTER TABLE public.marketplace_listings REPLICA IDENTITY FULL;
ALTER TABLE public.notifications REPLICA IDENTITY FULL;
ALTER TABLE public.chat_messages REPLICA IDENTITY FULL;
ALTER TABLE public.chat_conversations REPLICA IDENTITY FULL;

ALTER PUBLICATION supabase_realtime ADD TABLE
  public.trades,
  public.trade_messages,
  public.user_cards,
  public.marketplace_listings,
  public.notifications,
  public.chat_messages,
  public.chat_conversations;

DO $verify$
DECLARE
  leaked_anon_privileges text;
  leaked_anon_definers text;
  realtime_count integer;
BEGIN
  SELECT string_agg(table_name || ':' || privilege_type, ', ')
  INTO leaked_anon_privileges
  FROM information_schema.role_table_grants
  WHERE table_schema = 'public'
    AND grantee = 'anon'
    AND privilege_type <> 'SELECT';

  IF leaked_anon_privileges IS NOT NULL THEN
    RAISE EXCEPTION 'Unexpected anon table privileges: %', leaked_anon_privileges;
  END IF;

  SELECT string_agg(p.proname, ', ')
  INTO leaked_anon_definers
  FROM pg_proc p
  JOIN pg_namespace n ON n.oid = p.pronamespace
  WHERE n.nspname = 'public'
    AND p.prosecdef
    AND has_function_privilege('anon', p.oid, 'EXECUTE');

  IF leaked_anon_definers IS NOT NULL THEN
    RAISE EXCEPTION 'Anonymous SECURITY DEFINER access remains: %', leaked_anon_definers;
  END IF;

  SELECT count(*)
  INTO realtime_count
  FROM pg_publication p
  JOIN pg_publication_rel pr ON pr.prpubid = p.oid
  WHERE p.pubname = 'supabase_realtime';

  IF realtime_count <> 7 THEN
    RAISE EXCEPTION 'Expected 7 Realtime tables, found %', realtime_count;
  END IF;
END
$verify$;
