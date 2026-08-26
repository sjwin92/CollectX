import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.0";
import { getStripeClient } from "../_shared/stripeClient.ts";

// CollectX for Business — Phase 4. The store cancels its subscription at the
// end of the current period. Stripe fires customer.subscription.updated (and,
// at period end, .deleted) which the webhook syncs.

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response(null, { headers: corsHeaders });

  try {
    const authHeader = req.headers.get('Authorization');
    if (!authHeader) {
      return new Response(JSON.stringify({ error: 'Unauthorized' }), {
        status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const anonClient = createClient(Deno.env.get('SUPABASE_URL')!, Deno.env.get('SUPABASE_ANON_KEY')!);
    const token = authHeader.replace('Bearer ', '');
    const { data: userData, error: userError } = await anonClient.auth.getUser(token);
    if (userError || !userData?.user) {
      return new Response(JSON.stringify({ error: 'Unauthorized' }), {
        status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }
    const user = userData.user;

    const serviceClient = createClient(Deno.env.get('SUPABASE_URL')!, Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!);
    const { data: sub } = await serviceClient
      .from('store_subscriptions')
      .select('stripe_subscription_id, status')
      .eq('store_id', user.id)
      .maybeSingle();
    if (!sub || !sub.stripe_subscription_id || sub.status === 'canceled') {
      return new Response(JSON.stringify({ error: 'No active subscription to cancel' }), {
        status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const stripe = getStripeClient();
    const updated = await stripe.subscriptions.update(sub.stripe_subscription_id, { cancel_at_period_end: true });

    // Reflect it immediately; the webhook will re-confirm.
    await serviceClient
      .from('store_subscriptions')
      .update({ cancel_at_period_end: true, updated_at: new Date().toISOString() })
      .eq('store_id', user.id);

    return new Response(JSON.stringify({
      ok: true,
      current_period_end: updated.current_period_end
        ? new Date(updated.current_period_end * 1000).toISOString()
        : null,
    }), { headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
  } catch (error) {
    console.error('Error in cancel-subscription function:', error);
    return new Response(JSON.stringify({ error: 'An internal error occurred. Please try again.' }), {
      status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});
