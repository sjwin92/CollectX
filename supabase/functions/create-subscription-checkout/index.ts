import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.0";
import type Stripe from "https://esm.sh/stripe@17.4.0?target=deno";
import { getStripeClient } from "../_shared/stripeClient.ts";

// CollectX for Business — Phase 4. A store subscribes to a monthly plan. While
// the subscription is active, the plan rate replaces the per-sale seller
// commission (see activate_business_subscription). Recurring Checkout — the
// price is built inline so no pre-created Stripe Price is needed.

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

const ZERO_DECIMAL_CURRENCIES = new Set(['jpy', 'krw', 'vnd']);
const toMinorUnits = (amount: number, currency: string) =>
  Math.round(amount * (ZERO_DECIMAL_CURRENCIES.has(currency.toLowerCase()) ? 1 : 100));

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

    const body = await req.json().catch(() => ({}));
    const planId: string | undefined = body.plan_id;
    if (!planId) {
      return new Response(JSON.stringify({ error: 'plan_id is required' }), {
        status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const serviceClient = createClient(Deno.env.get('SUPABASE_URL')!, Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!);

    const { data: store } = await serviceClient
      .from('store_profiles').select('user_id, name, status').eq('user_id', user.id).maybeSingle();
    if (!store || store.status !== 'active') {
      return new Response(JSON.stringify({ error: 'Your store must be live to subscribe' }), {
        status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const { data: plan } = await serviceClient
      .from('business_plans').select('*').eq('id', planId).eq('active', true).maybeSingle();
    if (!plan) {
      return new Response(JSON.stringify({ error: 'Unknown plan' }), {
        status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const { data: existing } = await serviceClient
      .from('store_subscriptions').select('status, plan_id').eq('store_id', user.id).maybeSingle();
    if (existing?.status === 'active' && existing.plan_id === planId) {
      return new Response(JSON.stringify({ error: "You're already on this plan" }), {
        status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const siteUrl = Deno.env.get('SITE_URL') ?? 'http://localhost:5173';
    const currency = 'gbp';

    const lineItems: Stripe.Checkout.SessionCreateParams.LineItem[] = [{
      price_data: {
        currency,
        unit_amount: toMinorUnits(Number(plan.price_gbp), currency),
        recurring: { interval: 'month' },
        product_data: { name: `CollectX for Business — ${plan.name}` },
      },
      quantity: 1,
    }];

    let session: Stripe.Checkout.Session;
    try {
      const stripe = getStripeClient();
      session = await stripe.checkout.sessions.create({
        mode: 'subscription',
        customer_email: user.email ?? undefined,
        line_items: lineItems,
        metadata: { type: 'business_subscription', store_id: user.id, plan_id: plan.id },
        subscription_data: { metadata: { store_id: user.id, plan_id: plan.id } },
        success_url: `${siteUrl}/store/plan?sub=1`,
        cancel_url: `${siteUrl}/store/plan?sub=cancelled`,
      });
    } catch (stripeError) {
      throw stripeError;
    }

    return new Response(JSON.stringify({ url: session.url }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  } catch (error) {
    console.error('Error in create-subscription-checkout function:', error);
    return new Response(JSON.stringify({ error: 'An internal error occurred. Please try again.' }), {
      status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});
