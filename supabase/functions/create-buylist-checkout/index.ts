import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.0";
import type Stripe from "https://esm.sh/stripe@17.4.0?target=deno";
import { getStripeClient } from "../_shared/stripeClient.ts";

// CollectX for Business — Phase 3. The STORE pays for a pending buylist order —
// the quote goes into platform escrow; the collector is paid (quote - spread)
// on confirm/auto-confirm.

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

const ZERO_DECIMAL_CURRENCIES = new Set(['jpy', 'krw', 'vnd']);
function toMinorUnits(amount: number, currency: string): number {
  const multiplier = ZERO_DECIMAL_CURRENCIES.has(currency.toLowerCase()) ? 1 : 100;
  return Math.round(amount * multiplier);
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const authHeader = req.headers.get('Authorization');
    if (!authHeader) {
      return new Response(JSON.stringify({ error: 'Unauthorized' }), {
        status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const anonClient = createClient(
      Deno.env.get('SUPABASE_URL')!,
      Deno.env.get('SUPABASE_ANON_KEY')!,
    );
    const token = authHeader.replace('Bearer ', '');
    const { data: userData, error: userError } = await anonClient.auth.getUser(token);
    if (userError || !userData?.user) {
      return new Response(JSON.stringify({ error: 'Unauthorized' }), {
        status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }
    const user = userData.user;

    const body = await req.json().catch(() => ({}));
    const orderId: string | undefined = body.order_id;
    if (!orderId) {
      return new Response(JSON.stringify({ error: 'order_id is required' }), {
        status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const serviceClient = createClient(
      Deno.env.get('SUPABASE_URL')!,
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!,
    );

    const { data: order, error: orderError } = await serviceClient
      .from('buylist_orders')
      .select('*')
      .eq('id', orderId)
      .maybeSingle();
    if (orderError) throw orderError;
    if (!order) {
      return new Response(JSON.stringify({ error: 'Order not found' }), {
        status: 404, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }
    if (order.store_id !== user.id) {
      return new Response(JSON.stringify({ error: 'Only the store can pay for this order' }), {
        status: 403, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }
    if (order.status !== 'pending_payment') {
      return new Response(JSON.stringify({ error: 'This order is not awaiting payment' }), {
        status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const siteUrl = Deno.env.get('SITE_URL') ?? 'http://localhost:8080';
    const currency: string = order.currency ?? 'gbp';
    const amount = Number(order.quote_amount);

    const lineItems: Stripe.Checkout.SessionCreateParams.LineItem[] = [
      {
        price_data: {
          currency,
          unit_amount: toMinorUnits(amount, currency),
          product_data: { name: `Buylist: ${order.card_name || 'trading card'}` },
        },
        quantity: 1,
      },
    ];

    let session: Stripe.Checkout.Session;
    try {
      const stripe = getStripeClient();
      session = await stripe.checkout.sessions.create({
        mode: 'payment',
        customer_email: user.email ?? undefined,
        line_items: lineItems,
        payment_intent_data: { metadata: { type: 'buylist_order', buylist_order_id: order.id } },
        metadata: { type: 'buylist_order', buylist_order_id: order.id },
        success_url: `${siteUrl}/buylist-orders/${order.id}?checkout=success`,
        cancel_url: `${siteUrl}/buylist-orders/${order.id}?checkout=cancelled`,
      });
    } catch (stripeError) {
      await serviceClient.rpc('mark_buylist_order_payment_failed', { _order_id: order.id });
      throw stripeError;
    }

    const { error: sessionUpdateError } = await serviceClient
      .from('buylist_orders')
      .update({ stripe_checkout_session_id: session.id })
      .eq('id', order.id);
    if (sessionUpdateError) throw sessionUpdateError;

    return new Response(JSON.stringify({ url: session.url }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  } catch (error) {
    console.error('Error in create-buylist-checkout function:', error);
    return new Response(JSON.stringify({ error: 'An internal error occurred. Please try again.' }), {
      status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});
