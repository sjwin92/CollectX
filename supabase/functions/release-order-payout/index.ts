import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.0";
import { releaseOrderPayout, releaseStoreOrderPayout, releaseBuylistOrderPayout, serviceClient } from "../_shared/orderPayout.ts";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type, x-cron-secret',
};

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { order_id, store_order_id, buylist_order_id } = await req.json();
    if (!order_id && !store_order_id && !buylist_order_id) {
      return new Response(JSON.stringify({ error: 'order_id, store_order_id or buylist_order_id is required' }), {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }
    // Which flow, and who is allowed to confirm receipt:
    //   personal/store order → the buyer (buyer_user_id)
    //   buylist order        → the store  (store_id), since the store is the recipient
    const kind: 'personal' | 'store' | 'buylist' =
      buylist_order_id ? 'buylist' : store_order_id ? 'store' : 'personal';
    const targetId: string = buylist_order_id ?? store_order_id ?? order_id;
    const table = kind === 'buylist' ? 'buylist_orders' : kind === 'store' ? 'store_orders' : 'orders';
    const confirmerCol = kind === 'buylist' ? 'store_id' : 'buyer_user_id';

    // Two legitimate callers: the recipient confirming receipt (verified via JWT
    // below), or the auto-confirm-orders cron sweep (verified via a shared
    // secret header rather than impersonating the recipient).
    const cronSecretHeader = req.headers.get('x-cron-secret');
    const isCron = !!cronSecretHeader && cronSecretHeader === Deno.env.get('CRON_SECRET');

    if (!isCron) {
      const authHeader = req.headers.get('Authorization');
      if (!authHeader) {
        return new Response(JSON.stringify({ error: 'Unauthorized' }), {
          status: 401,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        });
      }
      const supabaseClient = createClient(
        Deno.env.get('SUPABASE_URL')!,
        Deno.env.get('SUPABASE_ANON_KEY')!,
      );
      const token = authHeader.replace('Bearer ', '');
      const { data: userData, error: userError } = await supabaseClient.auth.getUser(token);
      if (userError || !userData?.user) {
        return new Response(JSON.stringify({ error: 'Unauthorized' }), {
          status: 401,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        });
      }

      const { data: order, error: orderError } = await serviceClient
        .from(table)
        .select(confirmerCol)
        .eq('id', targetId)
        .maybeSingle();
      if (orderError) throw orderError;
      if (!order || (order as Record<string, string>)[confirmerCol] !== userData.user.id) {
        return new Response(JSON.stringify({ error: 'Only the recipient can confirm receipt' }), {
          status: 403,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        });
      }
    }

    const result = kind === 'buylist'
      ? await releaseBuylistOrderPayout(targetId)
      : kind === 'store'
        ? await releaseStoreOrderPayout(targetId)
        : await releaseOrderPayout(targetId);
    if (!result.ok) {
      return new Response(JSON.stringify({ error: result.error }), {
        status: result.status,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    return new Response(JSON.stringify({ success: true }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  } catch (error) {
    console.error('Error in release-order-payout function:', error);
    return new Response(JSON.stringify({ error: 'An internal error occurred. Please try again.' }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});
