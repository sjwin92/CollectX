
REVOKE ALL ON FUNCTION public.marketplace_listing_snapshot() FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION public.can_manage_card_image_object(text) FROM PUBLIC, anon;
REVOKE ALL ON FUNCTION public.user_card_locked_in_live_trade(uuid) FROM PUBLIC, anon;
-- Keep authenticated EXECUTE on the two helpers referenced by RLS/storage policies
GRANT EXECUTE ON FUNCTION public.can_manage_card_image_object(text) TO authenticated;
GRANT EXECUTE ON FUNCTION public.user_card_locked_in_live_trade(uuid) TO authenticated;
