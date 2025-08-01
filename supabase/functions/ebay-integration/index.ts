import "https://deno.land/x/xhr@0.1.0/mod.ts";
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

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
    console.log('eBay API Key present:', !!ebayApiKey);

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
          searchQuery = `${query} -custom -proxy -orica -fake -homemade -art`;
        }

        // eBay Finding API parameters
        const searchParams = new URLSearchParams({
          'OPERATION-NAME': 'findItemsByKeywords',
          'SERVICE-VERSION': '1.0.0',
          'SECURITY-APPNAME': ebayApiKey, // This should be your eBay App ID
          'RESPONSE-DATA-FORMAT': 'JSON',
          'REST-PAYLOAD': '',
          'keywords': searchQuery,
          'paginationInput.entriesPerPage': Math.min(limit, 100).toString(),
          'sortOrder': 'BestMatch',
          'itemFilter(0).name': 'ListingType',
          'itemFilter(0).value(0)': 'FixedPrice',
          'itemFilter(1).name': 'Condition',
          'itemFilter(1).value(0)': 'New',
          'itemFilter(2).name': 'Currency', 
          'itemFilter(2).value(0)': 'GBP',
          'outputSelector(0)': 'PictureURLLarge',
          'outputSelector(1)': 'PictureURLSuperSize',
          'outputSelector(2)': 'SellerInfo'
        });

        // eBay Finding API endpoint
        const ebayUrl = `https://svcs.ebay.com/services/search/FindingService/v1?${searchParams.toString()}`;
        console.log('eBay Finding API URL:', ebayUrl);

        const response = await fetch(ebayUrl, {
          method: 'GET',
          headers: {
            'Accept': 'application/json',
            'User-Agent': 'Pokemon-Collector-App/1.0',
          }
        });

        console.log('eBay API Response Status:', response.status);

        if (!response.ok) {
          const errorText = await response.text();
          console.error('eBay API Error Response:', errorText);
          throw new Error(`eBay API error: ${response.status} - ${errorText}`);
        }

        const data = await response.json();
        console.log('eBay API Response Structure:', Object.keys(data));

        const searchResult = data.findItemsByKeywordsResponse?.[0];
        if (!searchResult) {
          console.error('Invalid eBay API response structure');
          return new Response(JSON.stringify({ 
            listings: [], 
            averagePrice: null,
            error: 'Invalid API response'
          }), {
            headers: { ...corsHeaders, 'Content-Type': 'application/json' }
          });
        }

        if (searchResult.ack?.[0] !== 'Success') {
          console.error('eBay API error:', searchResult?.errorMessage);
          
          // If API fails, return mock data with realistic Pokemon product information
          const mockListings = generateMockListings(searchQuery, limit);
          return new Response(JSON.stringify({ 
            listings: mockListings, 
            averagePrice: mockListings.length > 0 ? mockListings.reduce((sum, item) => sum + parseFloat(item.price.replace('£', '')), 0) / mockListings.length : null,
            source: 'mock_data'
          }), {
            headers: { ...corsHeaders, 'Content-Type': 'application/json' }
          });
        }

        const items = searchResult.searchResult?.[0]?.item || [];
        console.log(`Found ${items.length} items from eBay`);

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
        }).filter(item => item.imageUrl && item.imageUrl.length > 10); // Only include items with real images

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
          averagePrice: averagePrice ? parseFloat(averagePrice.toFixed(2)) : null,
          source: 'ebay_api'
        }), {
          headers: { ...corsHeaders, 'Content-Type': 'application/json' }
        });

      } catch (error) {
        console.error('Error searching eBay:', error);
        
        // Fallback to mock data with realistic Pokemon products
        const mockListings = generateMockListings(query, limit);
        return new Response(JSON.stringify({ 
          listings: mockListings,
          averagePrice: mockListings.length > 0 ? mockListings.reduce((sum, item) => sum + parseFloat(item.price.replace('£', '')), 0) / mockListings.length : null,
          source: 'mock_fallback',
          error: error.message
        }), {
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

// Generate realistic mock listings when eBay API fails
function generateMockListings(query: string, limit: number) {
  const baseProducts = [
    {
      name: 'Prismatic Evolutions Elite Trainer Box',
      image: 'https://images.pokemontcg.io/sv8pt5/logo.png',
      basePrice: 45
    },
    {
      name: 'Stellar Crown Booster Box',
      image: 'https://images.pokemontcg.io/sv7/logo.png', 
      basePrice: 120
    },
    {
      name: 'Surging Sparks Elite Trainer Box',
      image: 'https://images.pokemontcg.io/sv6/logo.png',
      basePrice: 42
    },
    {
      name: 'Journey Together Collection Box',
      image: 'https://images.pokemontcg.io/sv5/logo.png',
      basePrice: 25
    }
  ];

  const mockListings = [];
  for (let i = 0; i < Math.min(limit, 8); i++) {
    const product = baseProducts[i % baseProducts.length];
    const priceVariation = (Math.random() - 0.5) * 20; // ±10 price variation
    const price = product.basePrice + priceVariation;
    
    mockListings.push({
      title: `${product.name} - New Sealed Pokemon TCG`,
      price: `£${price.toFixed(2)}`,
      imageUrl: product.image,
      condition: 'New',
      location: 'United Kingdom',
      shipping: Math.random() > 0.5 ? 'Free' : `£${(Math.random() * 5 + 2).toFixed(2)}`,
      url: `https://www.ebay.co.uk/itm/mock-${i}`,
      seller: `pokemon_seller_${i + 1}`,
      buyItNow: true,
      auction: false
    });
  }
  
  return mockListings;
}