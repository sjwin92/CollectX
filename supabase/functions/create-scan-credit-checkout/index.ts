import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.0";
import type Stripe from "https://esm.sh/stripe@17.4.0?target=deno";
import { getStripeClient } from "../_shared/stripeClient.ts";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

// Fixed credit pack: 10 grading scans for a flat price. This is a platform
// charge to CollectX's own Stripe account (not Connect) — no seller/connected
// account is involved, unlike the marketplace checkout flow.
const CREDIT_PACK_SIZE = 10;
const CREDIT_PACK_PRICE_GBP = 2.99;

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

    const siteUrl = Deno.env.get('SITE_URL') ?? 'http://localhost:5173';

    const stripe = getStripeClient();
    const session: Stripe.Checkout.Session = await stripe.checkout.sessions.create({
      mode: 'payment',
      customer_email: user.email ?? undefined,
      line_items: [
        {
          price_data: {
            currency: 'gbp',
            unit_amount: Math.round(CREDIT_PACK_PRICE_GBP * 100),
            product_data: { name: `${CREDIT_PACK_SIZE} Card Grading Scans` },
          },
          quantity: 1,
        },
      ],
      metadata: {
        type: 'scan_credits',
        user_id: user.id,
        credits: String(CREDIT_PACK_SIZE),
      },
      success_url: `${siteUrl}/grade?credits=success`,
      cancel_url: `${siteUrl}/grade?credits=cancelled`,
    });

    return new Response(JSON.stringify({ url: session.url }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  } catch (error) {
    console.error('Error in create-scan-credit-checkout function:', error);
    return new Response(JSON.stringify({ error: 'An internal error occurred. Please try again.' }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});
