
REVOKE EXECUTE ON FUNCTION public.propose_trade(uuid, uuid[], text) FROM anon, public;
REVOKE EXECUTE ON FUNCTION public.accept_trade(uuid) FROM anon, public;
REVOKE EXECUTE ON FUNCTION public.confirm_trade_receipt(uuid) FROM anon, public;
REVOKE EXECUTE ON FUNCTION public.submit_trade_address(uuid, jsonb) FROM anon, public;
GRANT EXECUTE ON FUNCTION public.propose_trade(uuid, uuid[], text) TO authenticated;
GRANT EXECUTE ON FUNCTION public.accept_trade(uuid) TO authenticated;
GRANT EXECUTE ON FUNCTION public.confirm_trade_receipt(uuid) TO authenticated;
GRANT EXECUTE ON FUNCTION public.submit_trade_address(uuid, jsonb) TO authenticated;
