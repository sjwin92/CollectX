import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.0";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

const isSandbox = (appId: string) => appId.includes('-SBX-');
const ebayBaseUrl = (appId: string) =>
  isSandbox(appId) ? 'https://api.sandbox.ebay.com' : 'https://api.ebay.com';

async function getEbayToken(appId: string, certId: string): Promise<string> {
  const credentials = btoa(`${appId}:${certId}`);
  const body = new URLSearchParams({
    grant_type: 'client_credentials',
    scope: 'https://api.ebay.com/oauth/api_scope/buy.item.summary',
  });

  const res = await fetch(`${ebayBaseUrl(appId)}/identity/v1/oauth2/token`, {
    method: 'POST',
    headers: {
      Authorization: `Basic ${credentials}`,
      'Content-Type': 'application/x-www-form-urlencoded',
    },
    body: body.toString(),
  });

  if (!res.ok) {
    const err = await res.text();
    throw new Error(`eBay OAuth failed ${res.status}: ${err}`);
  }

  const data = await res.json();
  return data.access_token as string;
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    // --- Authentication ---
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
    const { data: userData, error: userError } = await supabaseClient.auth.getUser(
      authHeader.replace('Bearer ', '')
    );
    if (userError || !userData?.user) {
      return new Response(JSON.stringify({ error: 'Unauthorized' }), {
        status: 401,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const ebayAppId = Deno.env.get('EBAY_APP_ID');
    const ebayCertId = Deno.env.get('EBAY_CERT_ID');

    const body = await req.json();
    const { action } = body;

    if (action === 'create_listing') {
      return new Response(JSON.stringify({
        success: false,
        message: 'Listing creation requires eBay Trading API with a user OAuth token. Not yet implemented.',
      }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    if (action === 'search') {
      const { query, itemType = 'card', limit = 10 } = body;

      if (!query) {
        return new Response(JSON.stringify({ error: 'query is required' }), {
          status: 400,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        });
      }

      if (!ebayAppId || !ebayCertId) {
        console.warn('EBAY_APP_ID / EBAY_CERT_ID not set — returning mock data');
        return new Response(JSON.stringify({
          listings: generateMockListings(query, limit),
          averagePrice: null,
          source: 'mock_no_credentials',
        }), {
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        });
      }

      try {
        const token = await getEbayToken(ebayAppId, ebayCertId);

        const searchQuery = itemType === 'sealed_product'
          ? `${query} -custom -proxy -fake -homemade`
          : query;

        const params = new URLSearchParams({
          q: searchQuery,
          limit: Math.min(limit, 50).toString(),
          sort: 'bestMatch',
          filter: 'buyingOptions:{FIXED_PRICE},conditions:{NEW},itemLocationCountry:GB,currency:GBP',
        });

        const searchUrl = `${ebayBaseUrl(ebayAppId)}/buy/browse/v1/item_summary/search?${params}`;
        console.log('eBay Browse API search:', searchUrl);

        const res = await fetch(searchUrl, {
          headers: {
            Authorization: `Bearer ${token}`,
            'X-EBAY-C-MARKETPLACE-ID': 'EBAY_GB',
            'Content-Type': 'application/json',
          },
        });

        if (!res.ok) {
          const err = await res.text();
          throw new Error(`eBay Browse API ${res.status}: ${err}`);
        }

        const data = await res.json();
        const items: any[] = data.itemSummaries || [];

        const listings = items.map((item: any) => ({
          title: item.title || '',
          price: `£${parseFloat(item.price?.value || '0').toFixed(2)}`,
          imageUrl: item.image?.imageUrl || '',
          condition: item.condition || 'New',
          location: item.itemLocation?.country || 'GB',
          shipping: item.shippingOptions?.[0]?.shippingCost?.value === '0.00'
            ? 'Free'
            : `£${item.shippingOptions?.[0]?.shippingCost?.value || '0'}`,
          url: item.itemWebUrl || '',
          seller: item.seller?.username || 'eBay Seller',
          buyItNow: true,
          auction: false,
        })).filter((item: any) => item.imageUrl.length > 10);

        const prices = listings
          .map((l: any) => parseFloat(l.price.replace('£', '')))
          .filter((p: number) => p > 0);
        const averagePrice = prices.length > 0
          ? parseFloat((prices.reduce((a: number, b: number) => a + b, 0) / prices.length).toFixed(2))
          : null;

        return new Response(JSON.stringify({ listings, averagePrice, source: 'ebay_browse_api' }), {
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        });

      } catch (error) {
        console.error('eBay Browse API error, falling back to mock:', error);
        const mockListings = generateMockListings(query, limit);
        return new Response(JSON.stringify({
          listings: mockListings,
          averagePrice: mockListings.length > 0
            ? parseFloat((mockListings.reduce((s: number, i: any) => s + parseFloat(i.price.replace('£', '')), 0) / mockListings.length).toFixed(2))
            : null,
          source: 'mock_fallback',
          error: error.message,
        }), {
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        });
      }
    }

    return new Response(JSON.stringify({ error: 'Invalid action' }), {
      status: 400,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });

  } catch (error) {
    console.error('Error in eBay integration function:', error);
    return new Response(JSON.stringify({ error: 'An internal error occurred. Please try again.' }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});

function generateMockListings(query: string, limit: number) {
  const baseProducts = [
    { name: 'Prismatic Evolutions Elite Trainer Box', image: 'https://images.pokemontcg.io/sv8pt5/logo.png', basePrice: 45 },
    { name: 'Stellar Crown Booster Box', image: 'https://images.pokemontcg.io/sv7/logo.png', basePrice: 120 },
    { name: 'Surging Sparks Elite Trainer Box', image: 'https://images.pokemontcg.io/sv8/logo.png', basePrice: 42 },
    { name: 'Journey Together Collection Box', image: 'https://images.pokemontcg.io/sv5/logo.png', basePrice: 25 },
    { name: 'Temporal Forces Booster Box', image: 'https://images.pokemontcg.io/sv5/logo.png', basePrice: 115 },
  ];

  return Array.from({ length: Math.min(limit, 8) }, (_, i) => {
    const p = baseProducts[i % baseProducts.length];
    const price = p.basePrice + (Math.random() - 0.5) * 20;
    return {
      title: `${p.name} - New Sealed Pokemon TCG`,
      price: `£${price.toFixed(2)}`,
      imageUrl: p.image,
      condition: 'New',
      location: 'GB',
      shipping: Math.random() > 0.5 ? 'Free' : `£${(Math.random() * 5 + 2).toFixed(2)}`,
      url: `https://www.ebay.co.uk/sch/i.html?_nkw=${encodeURIComponent(p.name)}`,
      seller: `pokemon_seller_${i + 1}`,
      buyItNow: true,
      auction: false,
    };
  });
}
