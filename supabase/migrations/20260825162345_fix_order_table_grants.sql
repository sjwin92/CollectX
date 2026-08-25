-- Fix: the previous migration added RLS policies to the new order tables but
-- never GRANTed the underlying table privileges. RLS only restricts access
-- that a role already has via GRANT — it doesn't grant access on its own.
-- Without this, PostgREST returns 403 for every request regardless of the
-- RLS policy (this is the same class of bug the collection_boxes migration
-- had to fix for the same reason). service_role also needs explicit grants:
-- it bypasses RLS but not table-level GRANTs.

GRANT SELECT ON public.orders TO authenticated;
GRANT ALL ON public.orders TO service_role;

GRANT SELECT ON public.order_addresses TO authenticated;
GRANT ALL ON public.order_addresses TO service_role;

GRANT SELECT ON public.order_shipments TO authenticated;
GRANT ALL ON public.order_shipments TO service_role;

GRANT SELECT ON public.order_ownership_transfers TO authenticated;
GRANT ALL ON public.order_ownership_transfers TO service_role;

GRANT SELECT ON public.seller_stripe_accounts TO authenticated;
GRANT ALL ON public.seller_stripe_accounts TO service_role;

GRANT SELECT ON public.marketplace_fee_config TO authenticated, anon;
GRANT ALL ON public.marketplace_fee_config TO service_role;
