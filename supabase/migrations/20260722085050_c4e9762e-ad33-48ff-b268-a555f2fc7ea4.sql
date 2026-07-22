
DROP POLICY IF EXISTS "Card images are viewable by everyone" ON public.card_images;
CREATE POLICY "Users can view their own card images"
  ON public.card_images FOR SELECT
  TO authenticated
  USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "Anyone can insert nav metrics" ON public.nav_metrics;
CREATE POLICY "Insert own or anonymous nav metrics"
  ON public.nav_metrics FOR INSERT
  TO anon, authenticated
  WITH CHECK (user_id IS NULL OR user_id = auth.uid());

REVOKE EXECUTE ON FUNCTION public.has_role(uuid, app_role) FROM PUBLIC, anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.can_manage_card_image_object(text) FROM PUBLIC, anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.recompute_profile_reputation() FROM PUBLIC, anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.marketplace_listing_snapshot() FROM PUBLIC, anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.handle_new_user() FROM PUBLIC, anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.user_card_locked_in_live_trade(uuid) FROM PUBLIC, anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.increment_listing_views(uuid) FROM PUBLIC, anon;

REVOKE EXECUTE ON FUNCTION public.accept_trade(uuid) FROM PUBLIC, anon;
REVOKE EXECUTE ON FUNCTION public.cancel_trade(uuid) FROM PUBLIC, anon;
REVOKE EXECUTE ON FUNCTION public.decline_trade(uuid) FROM PUBLIC, anon;
REVOKE EXECUTE ON FUNCTION public.propose_trade(uuid, uuid[], text) FROM PUBLIC, anon;
REVOKE EXECUTE ON FUNCTION public.mark_trade_shipped(uuid, text, text) FROM PUBLIC, anon;
REVOKE EXECUTE ON FUNCTION public.confirm_trade_receipt(uuid) FROM PUBLIC, anon;
REVOKE EXECUTE ON FUNCTION public.open_trade_dispute(uuid, text) FROM PUBLIC, anon;
REVOKE EXECUTE ON FUNCTION public.submit_trade_address(uuid, jsonb) FROM PUBLIC, anon;
REVOKE EXECUTE ON FUNCTION public.get_trade_shipments(uuid) FROM PUBLIC, anon;
REVOKE EXECUTE ON FUNCTION public.get_trade_destination_address(uuid) FROM PUBLIC, anon;
REVOKE EXECUTE ON FUNCTION public.get_nav_metrics_summary(integer) FROM PUBLIC, anon;
