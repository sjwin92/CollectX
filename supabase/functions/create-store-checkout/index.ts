import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.0";
import type Stripe from "https://esm.sh/stripe@17.4.0?target=deno";
import { getStripeClient } from "../_shared/stripeClient.ts";

// Buyer checkout for a store SKU (CollectX for Business — Phase 2b). Parallel
// to create-checkout-session, but the item is a store_inventory row, not a
// user_cards-backed marketplace listing. All the atomic work (re-validate the
// SKU, reserve stock, compute fees, insert the order) is done by the
// create_store_order RPC; this function only authenticates the buyer and
// creates the Stripe Checkout session.

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
        status: 401,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
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
        status: 401,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }
    const user = userData.user;

    const body = await req.json().catch(() => ({}));
    const inventoryId: string | undefined = body.inventory_id;
    const quantity = Math.max(parseInt(String(body.quantity ?? 1), 10) || 1, 1);
    if (!inventoryId) {
      return new Response(JSON.stringify({ error: 'inventory_id is required' }), {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const serviceClient = createClient(
      Deno.env.get('SUPABASE_URL')!,
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!,
    );

    // One RPC does the re-validation, stock reservation, fee math and order
    // insert atomically. A business-rule failure comes back as a Postgres
    // error with a human-readable message — surface it as a 400.
    const { data: order, error: orderError } = await serviceClient.rpc('create_store_order', {
      _inventory_id: inventoryId,
      _quantity: quantity,
      _buyer_user_id: user.id,
    });
    if (orderError) {
      return new Response(JSON.stringify({ error: orderError.message }), {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const siteUrl = Deno.env.get('SITE_URL') ?? 'http://localhost:8080';
    const currency: string = order.currency ?? 'gbp';
    const itemAmount = Number(order.item_amount);
    const buyerFeeAmount = Number(order.buyer_fee_amount);

    const lineItems: Stripe.Checkout.SessionCreateParams.LineItem[] = [
      {
        price_data: {
          currency,
          unit_amount: toMinorUnits(itemAmount, currency),
          product_data: {
            name: order.card_name || 'Trading card',
            description: quantity > 1 ? `Qty ${quantity}` : undefined,
          },
        },
        quantity: 1,
      },
    ];
    if (buyerFeeAmount > 0) {
      lineItems.push({
        price_data: {
          currency,
          unit_amount: toMinorUnits(buyerFeeAmount, currency),
          product_data: { name: 'Buyer protection fee' },
        },
        quantity: 1,
      });
    }

    let session: Stripe.Checkout.Session;
    try {
      const stripe = getStripeClient();
      session = await stripe.checkout.sessions.create({
        mode: 'payment',
        customer_email: user.email ?? undefined,
        line_items: lineItems,
        payment_intent_data: {
          metadata: { type: 'store_order', store_order_id: order.id },
        },
        metadata: { type: 'store_order', store_order_id: order.id },
        success_url: `${siteUrl}/store-orders/${order.id}?checkout=success`,
        cancel_url: `${siteUrl}/marketplace?checkout=cancelled`,
      });
    } catch (stripeError) {
      // Roll back: cancel the order and release the stock reservation.
      await serviceClient.rpc('mark_store_order_payment_failed', { _order_id: order.id });
      throw stripeError;
    }

    const { error: sessionUpdateError } = await serviceClient
      .from('store_orders')
      .update({ stripe_checkout_session_id: session.id })
      .eq('id', order.id);
    if (sessionUpdateError) throw sessionUpdateError;

    return new Response(JSON.stringify({ url: session.url }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  } catch (error) {
    console.error('Error in create-store-checkout function:', error);
    return new Response(JSON.stringify({ error: 'An internal error occurred. Please try again.' }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});
