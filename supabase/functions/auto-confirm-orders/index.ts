import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { releaseOrderPayout, releaseStoreOrderPayout, serviceClient } from "../_shared/orderPayout.ts";

// Invoked on a schedule by pg_cron/pg_net (see the migration that sets up
// cron.schedule) via the x-cron-secret header — never called from a browser.
// verify_jwt is disabled for this function in supabase/config.toml.

serve(async (req) => {
  const cronSecretHeader = req.headers.get('x-cron-secret');
  if (!cronSecretHeader || cronSecretHeader !== Deno.env.get('CRON_SECRET')) {
    return new Response('Unauthorized', { status: 401 });
  }

  const nowIso = new Date().toISOString();
  const [personalRes, storeRes] = await Promise.all([
    serviceClient.from('orders').select('id').eq('status', 'shipped').lt('auto_confirm_at', nowIso),
    serviceClient.from('store_orders').select('id').eq('status', 'shipped').lt('auto_confirm_at', nowIso),
  ]);

  if (personalRes.error || storeRes.error) {
    const error = personalRes.error ?? storeRes.error;
    console.error('Error querying due orders:', error);
    return new Response(JSON.stringify({ error: error!.message }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' },
    });
  }

  const results = await Promise.allSettled([
    ...(personalRes.data ?? []).map((o) => releaseOrderPayout(o.id)),
    ...(storeRes.data ?? []).map((o) => releaseStoreOrderPayout(o.id)),
  ]);

  const succeeded = results.filter((r) => r.status === 'fulfilled' && r.value.ok).length;
  const failed = results.length - succeeded;
  if (failed > 0) {
    console.error(`auto-confirm-orders: ${failed} of ${results.length} releases failed`, results);
  }

  return new Response(JSON.stringify({ processed: results.length, succeeded, failed }), {
    headers: { 'Content-Type': 'application/json' },
  });
});
