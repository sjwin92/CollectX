import "https://deno.land/x/xhr@0.1.0/mod.ts";
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.53.0";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const ebayApiKey = Deno.env.get('EBAY_API_KEY');
    if (!ebayApiKey) {
      console.error('EBAY_API_KEY not found in environment variables');
      return new Response(JSON.stringify({ error: 'eBay API key not configured' }), {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      });
    }

    const body = await req.json();
    const { action } = body;

    console.log('eBay Integration Action:', action);

    if (action === 'create_listing') {
      const { item, itemType = 'card' } = body;
      
      if (!item) {
        return new Response(JSON.stringify({ error: 'Item data is required' }), {
          status: 400,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' }
        });
      }

      console.log('Creating eBay listing for:', item);

      // Mock listing creation since we're using Finding API, not Trading API
      return new Response(JSON.stringify({ 
        success: true, 
        listingId: 'mock-listing-' + Date.now(),
        message: 'Listing would be created with Trading API' 
      }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      });

    } else if (action === 'search') {
      const { query, itemType = 'card', limit = 10 } = body;
      
      if (!query) {
        return new Response(JSON.stringify({ error: 'Query is required' }), {
          status: 400,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' }
        });
      }

      console.log(`Searching eBay for: ${query} (type: ${itemType})`);

      try {
        // Enhanced search parameters for better Pokemon product results
        let searchQuery = query;
        if (itemType === 'sealed_product') {
          searchQuery = `${query} -custom -proxy -orica -fake -homemade`;
        }

        const searchParams = new URLSearchParams({
          'OPERATION-NAME': 'findItemsByKeywords',
          'SERVICE-VERSION': '1.0.0',
          'SECURITY-APPNAME': ebayApiKey,
          'RESPONSE-DATA-FORMAT': 'JSON',
          'REST-PAYLOAD': '',
          'keywords': searchQuery,
          'paginationInput.entriesPerPage': Math.min(limit, 50).toString(),
          'sortOrder': 'BestMatch',
          'itemFilter(0).name': 'ListingType',
          'itemFilter(0).value': 'FixedPrice',
          'itemFilter(1).name': 'Condition',
          'itemFilter(1).value': 'New',
          'itemFilter(2).name': 'Currency',
          'itemFilter(2).value': 'GBP',
          'itemFilter(3).name': 'LocationType',
          'itemFilter(3).value': 'WorldWide',
          'outputSelector(0)': 'PictureURLLarge',
          'outputSelector(1)': 'PictureURLSuperSize'
        });

        const ebayUrl = `https://svcs.ebay.com/services/search/FindingService/v1?${searchParams.toString()}`;
        console.log('eBay API URL:', ebayUrl);

        const response = await fetch(ebayUrl, {
          method: 'GET',
          headers: {
            'Accept': 'application/json',
          }
        });

        if (!response.ok) {
          throw new Error(`eBay API error: ${response.status}`);
        }

        const data = await response.json();
        console.log('eBay API Response:', JSON.stringify(data, null, 2));

        const searchResult = data.findItemsByKeywordsResponse?.[0];
        if (!searchResult || searchResult.ack?.[0] !== 'Success') {
          console.error('eBay API error:', searchResult?.errorMessage);
          return new Response(JSON.stringify({ 
            listings: [], 
            averagePrice: null,
            error: 'No results found'
          }), {
            headers: { ...corsHeaders, 'Content-Type': 'application/json' }
          });
        }

        const items = searchResult.searchResult?.[0]?.item || [];
        console.log(`Found ${items.length} items`);

        const listings = items.map((item: any) => {
          const currentPrice = parseFloat(item.sellingStatus?.[0]?.currentPrice?.[0]?.__value__ || '0');
          const title = item.title?.[0] || '';
          const imageUrl = item.pictureURLLarge?.[0] || item.pictureURLSuperSize?.[0] || item.galleryURL?.[0] || '';
          const condition = item.condition?.[0]?.conditionDisplayName?.[0] || 'New';
          const location = item.location?.[0] || 'Unknown';
          const shipping = item.shippingInfo?.[0]?.shippingServiceCost?.[0]?.__value__ || '0';
          const listingUrl = item.viewItemURL?.[0] || '';
          const seller = item.sellerInfo?.[0]?.sellerUserName?.[0] || 'Unknown';

          return {
            title,
            price: `£${currentPrice.toFixed(2)}`,
            imageUrl,
            condition,
            location,
            shipping: shipping === '0' ? 'Free' : `£${parseFloat(shipping).toFixed(2)}`,
            url: listingUrl,
            seller,
            buyItNow: true,
            auction: false
          };
        });

        // Calculate average price
        const prices = listings
          .map(listing => parseFloat(listing.price.replace('£', '')))
          .filter(price => price > 0);
        
        const averagePrice = prices.length > 0 
          ? prices.reduce((sum, price) => sum + price, 0) / prices.length 
          : null;

        console.log(`Returning ${listings.length} listings with average price: £${averagePrice?.toFixed(2) || 'N/A'}`);

        return new Response(JSON.stringify({ 
          listings, 
          averagePrice: averagePrice ? parseFloat(averagePrice.toFixed(2)) : null 
        }), {
          headers: { ...corsHeaders, 'Content-Type': 'application/json' }
        });

      } catch (error) {
        console.error('Error searching eBay:', error);
        return new Response(JSON.stringify({ 
          error: error.message,
          listings: [],
          averagePrice: null
        }), {
          status: 500,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' }
        });
      }

    } else {
      return new Response(JSON.stringify({ error: 'Invalid action' }), {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      });
    }

  } catch (error) {
    console.error('Error in eBay integration function:', error);
    return new Response(JSON.stringify({ error: error.message }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' }
    });
  }
});