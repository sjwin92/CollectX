import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.0";
import type Stripe from "https://esm.sh/stripe@17.4.0?target=deno";
import { getStripeClient } from "../_shared/stripeClient.ts";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

// Currencies Stripe treats as zero-decimal (no *100 conversion needed).
// Not used for gbp/usd/eur but kept explicit since currency is a free-text
// column today — guards against a silent 100x mischarge if that ever changes.
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
    const user = userData.user;

    const { listing_id } = await req.json();
    if (!listing_id) {
      return new Response(JSON.stringify({ error: 'listing_id is required' }), {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const serviceClient = createClient(
      Deno.env.get('SUPABASE_URL')!,
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!,
    );

    const { data: listing, error: listingError } = await serviceClient
      .from('marketplace_listings')
      .select('*')
      .eq('id', listing_id)
      .maybeSingle();
    if (listingError) throw listingError;
    if (!listing) {
      return new Response(JSON.stringify({ error: 'Listing not found' }), {
        status: 404,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }
    if (listing.listing_type !== 'sale' || listing.status !== 'active') {
      return new Response(JSON.stringify({ error: 'Listing is not available for purchase' }), {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }
    if (listing.user_id === user.id) {
      return new Response(JSON.stringify({ error: 'You cannot buy your own listing' }), {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const { data: sellerAccount, error: sellerAccountError } = await serviceClient
      .from('seller_stripe_accounts')
      .select('charges_enabled')
      .eq('user_id', listing.user_id)
      .maybeSingle();
    if (sellerAccountError) throw sellerAccountError;
    if (!sellerAccount?.charges_enabled) {
      return new Response(JSON.stringify({ error: 'Seller payouts are not enabled for this listing' }), {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const { data: feeCfg, error: feeCfgError } = await serviceClient
      .from('marketplace_fee_config')
      .select('*')
      .eq('id', 1)
      .single();
    if (feeCfgError) throw feeCfgError;

    // Per-account fee override (e.g. a store's seller commission). NULL columns
    // fall back to the global marketplace_fee_config. Keyed on the SELLER.
    const { data: feeOverride } = await serviceClient
      .from('account_fee_overrides')
      .select('seller_fee_bps, buyer_protection_fee_bps')
      .eq('user_id', listing.user_id)
      .maybeSingle();

    const sellerFeeBps = feeOverride?.seller_fee_bps ?? feeCfg.seller_fee_bps;
    const buyerFeeBps = feeOverride?.buyer_protection_fee_bps ?? feeCfg.buyer_protection_fee_bps;

    const itemAmount = Number(listing.asking_price);
    const buyerFeeAmount = Math.round(
      (itemAmount * buyerFeeBps / 10000 + Number(feeCfg.buyer_protection_fee_fixed)) * 100
    ) / 100;
    const sellerFeeAmount = Math.round((itemAmount * sellerFeeBps / 10000) * 100) / 100;
    const totalChargedAmount = Math.round((itemAmount + buyerFeeAmount) * 100) / 100;
    const sellerPayoutAmount = Math.round((itemAmount - sellerFeeAmount) * 100) / 100;

    // Reserve the listing (prevents a second buyer from checking out concurrently)
    // and atomically guard against a race: only proceed if it was still 'active'.
    const { data: reserved, error: reserveError } = await serviceClient
      .from('marketplace_listings')
      .update({ status: 'pending' })
      .eq('id', listing.id)
      .eq('status', 'active')
      .select('id')
      .maybeSingle();
    if (reserveError) throw reserveError;
    if (!reserved) {
      return new Response(JSON.stringify({ error: 'This listing was just purchased by someone else' }), {
        status: 409,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const { data: order, error: orderError } = await serviceClient
      .from('orders')
      .insert({
        listing_id: listing.id,
        user_card_id: listing.user_card_id,
        buyer_user_id: user.id,
        seller_user_id: listing.user_id,
        item_amount: itemAmount,
        buyer_fee_amount: buyerFeeAmount,
        seller_fee_amount: sellerFeeAmount,
        total_charged_amount: totalChargedAmount,
        seller_payout_amount: sellerPayoutAmount,
        currency: listing.currency,
      })
      .select()
      .single();
    if (orderError) {
      // Roll back the listing reservation if the order couldn't be created.
      await serviceClient.from('marketplace_listings').update({ status: 'active' }).eq('id', listing.id).eq('status', 'pending');
      throw orderError;
    }

    const siteUrl = Deno.env.get('SITE_URL') ?? 'http://localhost:8080';

    const lineItems: Stripe.Checkout.SessionCreateParams.LineItem[] = [
      {
        price_data: {
          currency: listing.currency,
          unit_amount: toMinorUnits(itemAmount, listing.currency),
          product_data: { name: listing.card_name || 'Trading card' },
        },
        quantity: 1,
      },
    ];
    if (buyerFeeAmount > 0) {
      lineItems.push({
        price_data: {
          currency: listing.currency,
          unit_amount: toMinorUnits(buyerFeeAmount, listing.currency),
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
          metadata: { order_id: order.id },
        },
        metadata: { order_id: order.id },
        success_url: `${siteUrl}/orders/${order.id}?checkout=success`,
        cancel_url: `${siteUrl}/marketplace?checkout=cancelled`,
      });
    } catch (stripeError) {
      // Roll back the order + listing reservation so the listing isn't
      // stuck 'pending' forever if Stripe isn't configured or the call fails.
      await serviceClient.from('orders').update({ status: 'cancelled', cancelled_at: new Date().toISOString() }).eq('id', order.id);
      await serviceClient.from('marketplace_listings').update({ status: 'active' }).eq('id', listing.id).eq('status', 'pending');
      throw stripeError;
    }

    const { error: sessionUpdateError } = await serviceClient
      .from('orders')
      .update({ stripe_checkout_session_id: session.id })
      .eq('id', order.id);
    if (sessionUpdateError) throw sessionUpdateError;

    return new Response(JSON.stringify({ url: session.url }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  } catch (error) {
    console.error('Error in create-checkout-session function:', error);
    return new Response(JSON.stringify({ error: 'An internal error occurred. Please try again.' }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});
