-- Fix: marketplace_listings has RLS policies allowing owners to insert/update/
-- delete their own listings, but the underlying table-level GRANT to
-- `authenticated` was never issued (only SELECT was). RLS restricts access a
-- role already has via GRANT — it doesn't grant it. Every other client-writable
-- table in this schema has the matching grant; this one table was missed,
-- and it silently broke creating any marketplace listing (trade or sale).
GRANT INSERT, UPDATE, DELETE ON public.marketplace_listings TO authenticated;
