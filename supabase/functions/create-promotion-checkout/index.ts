import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.0";
import type Stripe from "https://esm.sh/stripe@17.4.0?target=deno";
import { getStripeClient } from "../_shared/stripeClient.ts";

// CollectX for Business — Phase 2c. A store owner pays a flat fee to feature a
// SKU or pin their storefront. This is a PLATFORM charge — no Connect
// transfer. The create_store_promotion RPC does the validation + pricing +
// insert; this function only authenticates the owner and opens Checkout.

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
    const kind: string = body.kind === 'storefront_pin' ? 'storefront_pin' : 'sku_feature';
    const inventoryId: string | null = kind === 'sku_feature' ? (body.inventory_id ?? null) : null;
    if (kind === 'sku_feature' && !inventoryId) {
      return new Response(JSON.stringify({ error: 'inventory_id is required' }), {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const serviceClient = createClient(
      Deno.env.get('SUPABASE_URL')!,
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!,
    );

    const { data: promo, error: promoError } = await serviceClient.rpc('create_store_promotion', {
      _store_id: user.id,
      _inventory_id: inventoryId,
      _kind: kind,
    });
    if (promoError) {
      return new Response(JSON.stringify({ error: promoError.message }), {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const siteUrl = Deno.env.get('SITE_URL') ?? 'http://localhost:8080';
    const currency: string = promo.currency ?? 'gbp';
    const amount = Number(promo.amount_gbp);
    const label = kind === 'storefront_pin'
      ? 'Featured storefront (7 days)'
      : 'Featured listing (7 days)';
    const returnPath = kind === 'storefront_pin' ? '/store/setup' : '/store/inventory';

    const lineItems: Stripe.Checkout.SessionCreateParams.LineItem[] = [
      {
        price_data: {
          currency,
          unit_amount: toMinorUnits(amount, currency),
          product_data: { name: label },
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
        payment_intent_data: {
          metadata: { type: 'promotion', promotion_id: promo.id },
        },
        metadata: { type: 'promotion', promotion_id: promo.id },
        success_url: `${siteUrl}${returnPath}?promoted=1`,
        cancel_url: `${siteUrl}${returnPath}?promoted=cancelled`,
      });
    } catch (stripeError) {
      await serviceClient.rpc('fail_store_promotion', { _promotion_id: promo.id });
      throw stripeError;
    }

    const { error: sessionUpdateError } = await serviceClient
      .from('store_promotions')
      .update({ stripe_checkout_session_id: session.id })
      .eq('id', promo.id);
    if (sessionUpdateError) throw sessionUpdateError;

    return new Response(JSON.stringify({ url: session.url }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  } catch (error) {
    console.error('Error in create-promotion-checkout function:', error);
    return new Response(JSON.stringify({ error: 'An internal error occurred. Please try again.' }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});
