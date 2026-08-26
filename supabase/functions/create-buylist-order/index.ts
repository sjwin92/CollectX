import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.0";
import { marketUsd, usdToGbpRate } from "../_shared/marketPrice.ts";

// CollectX for Business — Phase 3. A collector offers a card from their
// collection into a store's standing buy offer. This function authenticates
// the collector and computes the live GBP market price server-side (so the
// quote can't be inflated client-side), then hands off to the
// create_buylist_order RPC for validation + insert.

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

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
    const buylistId: string | undefined = body.buylist_id;
    const userCardId: string | undefined = body.user_card_id;
    if (!buylistId || !userCardId) {
      return new Response(JSON.stringify({ error: 'buylist_id and user_card_id are required' }), {
        status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const serviceClient = createClient(
      Deno.env.get('SUPABASE_URL')!,
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!,
    );

    // Look up the card (must be the caller's) and resolve its market price.
    const { data: uc, error: ucError } = await serviceClient
      .from('user_cards')
      .select('id, user_id, card_id')
      .eq('id', userCardId)
      .maybeSingle();
    if (ucError) throw ucError;
    if (!uc || uc.user_id !== user.id) {
      return new Response(JSON.stringify({ error: 'That card is not in your collection' }), {
        status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const { data: pc } = await serviceClient
      .from('pokemon_cards')
      .select('tcgplayer_prices')
      .eq('id', uc.card_id)
      .maybeSingle();
    const usd = marketUsd(pc?.tcgplayer_prices);
    if (!usd) {
      return new Response(JSON.stringify({ error: "We don't have a market price for that card yet — can't quote it." }), {
        status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }
    const rate = await usdToGbpRate();
    const marketGbp = Math.round(usd * rate * 100) / 100;

    const { data: order, error: orderError } = await serviceClient.rpc('create_buylist_order', {
      _buylist_id: buylistId,
      _user_card_id: userCardId,
      _seller_user_id: user.id,
      _market_gbp: marketGbp,
    });
    if (orderError) {
      return new Response(JSON.stringify({ error: orderError.message }), {
        status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    return new Response(JSON.stringify({ order_id: order.id, quote: Number(order.quote_amount) }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  } catch (error) {
    console.error('Error in create-buylist-order function:', error);
    return new Response(JSON.stringify({ error: 'An internal error occurred. Please try again.' }), {
      status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});
