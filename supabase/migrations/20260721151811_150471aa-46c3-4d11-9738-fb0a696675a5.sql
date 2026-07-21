
-- 1. Lock trade_shipments writes to RPCs only
DROP POLICY IF EXISTS "Senders can create shipments" ON public.trade_shipments;
DROP POLICY IF EXISTS "Sender can update own shipment" ON public.trade_shipments;
REVOKE INSERT, UPDATE, DELETE ON public.trade_shipments FROM authenticated;
REVOKE INSERT, UPDATE, DELETE ON public.trade_shipments FROM anon;
-- Preserve sender-only SELECT policy + get_trade_shipments RPC (unchanged)

-- 2. Restrict marketplace_listings direct writes to active/cancelled states
DROP POLICY IF EXISTS "Users can update their own listings" ON public.marketplace_listings;
CREATE POLICY "Users can update their own listings"
  ON public.marketplace_listings
  FOR UPDATE
  USING (
    auth.uid() = user_id
    AND status IN ('active','cancelled')
  )
  WITH CHECK (
    auth.uid() = user_id
    AND status IN ('active','cancelled')
    AND EXISTS (
      SELECT 1 FROM public.user_cards uc
      WHERE uc.id = marketplace_listings.user_card_id
        AND uc.user_id = auth.uid()
        AND uc.for_trade = true
        AND uc.card_id = marketplace_listings.card_id
    )
  );

DROP POLICY IF EXISTS "Users can delete their own listings" ON public.marketplace_listings;
CREATE POLICY "Users can delete their own listings"
  ON public.marketplace_listings
  FOR DELETE
  USING (
    auth.uid() = user_id
    AND status IN ('active','cancelled')
  );

-- 3. RPC least privilege
REVOKE EXECUTE ON FUNCTION public.get_trade_shipments(uuid) FROM anon, public;
GRANT EXECUTE ON FUNCTION public.get_trade_shipments(uuid) TO authenticated;
REVOKE EXECUTE ON FUNCTION public.get_trade_destination_address(uuid) FROM anon, public;
GRANT EXECUTE ON FUNCTION public.get_trade_destination_address(uuid) TO authenticated;
