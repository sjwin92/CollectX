import { supabase } from "@/integrations/supabase/client";

export interface EbayRealSealedProduct {
  id: string;
  name: string;
  price: {
    current: number;
    currency: string;
    source: string;
  };
  imageUrl: string;
  condition: string;
  availability: string;
  type: string;
  setName: string;
  seller: {
    name: string;
    feedback: number;
    location: string;
  };
  shipping: {
    cost: string;
    location: string;
  };
  url: string;
  endTime?: string;
  buyItNow?: boolean;
  auction?: boolean;
  watchers?: number;
  bids?: number;
}

const SEALED_PRODUCT_TYPES = [
  'booster box',
  'elite trainer box', 
  'collection box',
  'tin',
  'blister pack'
];

const POKEMON_SETS = [
  'Prismatic Evolutions',
  'Stellar Crown',
  'Surging Sparks', 
  'Journey Together',
  'Twilight Masquerade',
  'Temporal Forces'
];

export const fetchEbayRealSealedProducts = async (): Promise<EbayRealSealedProduct[]> => {
  console.log('Fetching real sealed products from eBay...');
  
  try {
    const allProducts: EbayRealSealedProduct[] = [];
    
    // Search for popular sealed products with better success rate
    const searchQueries = [
      'pokemon tcg prismatic evolutions elite trainer box',
      'pokemon tcg stellar crown booster box', 
      'pokemon tcg surging sparks collection box',
      'pokemon tcg journey together elite trainer box',
      'pokemon tcg temporal forces booster box'
    ];

    for (const searchQuery of searchQueries) {
      try {
        console.log(`Searching for: ${searchQuery}`);
        
        const { data, error } = await supabase.functions.invoke('ebay-integration', {
          body: {
            action: 'search',
            query: searchQuery,
            itemType: 'sealed_product',
            limit: 6
          }
        });

        if (error) {
          console.error(`Error with query "${searchQuery}":`, error);
          continue;
        }

        if (data?.listings && data.listings.length > 0) {
          console.log(`Found ${data.listings.length} listings for: ${searchQuery}`);
          
          const products = data.listings.map((listing: any, index: number) => {
            // Extract product type and set name from query
            const productType = extractProductType(searchQuery);
            const setName = extractSetName(searchQuery);
            
            return {
              id: `ebay-${Date.now()}-${index}`,
              name: listing.title || `${setName} ${productType}`,
              price: {
                current: parseFloat(listing.price?.replace(/[£$,]/g, '') || '0'),
                currency: 'GBP',
                source: data.source === 'ebay_api' ? 'eBay' : 'Estimated'
              },
              imageUrl: listing.imageUrl || getProductPlaceholderImage(productType),
              condition: listing.condition || 'New',
              availability: listing.buyItNow ? 'buy-it-now' : listing.auction ? 'auction' : 'available',
              type: productType,
              setName: setName,
              seller: {
                name: listing.seller || 'eBay Seller',
                feedback: 99,
                location: listing.location || 'UK'
              },
              shipping: {
                cost: listing.shipping || 'Free',
                location: listing.location || 'UK'
              },
              url: listing.url || '#',
              buyItNow: listing.buyItNow || false,
              auction: listing.auction || false
            };
          });

          allProducts.push(...products);
        } else {
          console.log(`No listings found for: ${searchQuery}`);
        }
      } catch (error) {
        console.error(`Error processing search "${searchQuery}":`, error);
        continue;
      }

      // Add a small delay between requests to avoid rate limiting
      await new Promise(resolve => setTimeout(resolve, 200));
    }

    // If we have some products, supplement with fallbacks if needed
    if (allProducts.length > 0 && allProducts.length < 15) {
      console.log('Adding supplemental fallback products...');
      const fallbackProducts = generateFallbackProducts(15 - allProducts.length);
      allProducts.push(...fallbackProducts);
    } else if (allProducts.length === 0) {
      console.log('No real products found, using all fallback products...');
      return generateFallbackProducts(20);
    }

    // Remove duplicates and sort
    const uniqueProducts = allProducts
      .filter((product, index, self) => 
        index === self.findIndex(p => 
          p.name.toLowerCase().includes(product.name.toLowerCase().split(' ').slice(0, 3).join(' ').toLowerCase())
        )
      )
      .sort((a, b) => a.price.current - b.price.current);

    console.log(`Successfully processed ${uniqueProducts.length} sealed products`);
    return uniqueProducts.slice(0, 30);

  } catch (error) {
    console.error('Error fetching sealed products:', error);
    return generateFallbackProducts(20);
  }
};

const generateFallbackProducts = (count: number): EbayRealSealedProduct[] => {
  const fallbackProducts: EbayRealSealedProduct[] = [];
  
  const productTemplates = [
    { type: 'elite trainer box', setName: 'Prismatic Evolutions', price: 45, image: 'https://images.pokemontcg.io/sv8pt5/logo.png' },
    { type: 'booster box', setName: 'Stellar Crown', price: 120, image: 'https://images.pokemontcg.io/sv7/logo.png' },
    { type: 'collection box', setName: 'Surging Sparks', price: 25, image: 'https://images.pokemontcg.io/sv6/logo.png' },
    { type: 'elite trainer box', setName: 'Journey Together', price: 42, image: 'https://images.pokemontcg.io/sv5/logo.png' },
    { type: 'booster box', setName: 'Temporal Forces', price: 115, image: 'https://images.pokemontcg.io/sv4/logo.png' },
  ];
  
  for (let i = 0; i < count; i++) {
    const template = productTemplates[i % productTemplates.length];

    fallbackProducts.push({
      id: `fallback-${i}`,
      name: `${template.setName} ${template.type}`,
      price: {
        current: template.price,
        currency: 'GBP',
        source: 'Estimated'
      },
      imageUrl: template.image,
      condition: 'New',
      availability: 'in-stock',
      type: template.type,
      setName: template.setName,
      seller: {
        name: '',
        feedback: 0,
        location: 'UK'
      },
      shipping: {
        cost: '',
        location: 'UK'
      },
      url: '',
      buyItNow: false,
      auction: false
    });
  }
  
  return fallbackProducts;
};

const getProductPlaceholderImage = (productType: string): string => {
  const productImages: Record<string, string> = {
    'booster box': 'https://images.pokemontcg.io/sv7/logo.png',
    'elite trainer box': 'https://images.pokemontcg.io/sv8pt5/logo.png',
    'collection box': 'https://images.pokemontcg.io/sv6/logo.png',
    'tin': 'https://images.pokemontcg.io/sv5/logo.png',
    'blister pack': 'https://images.pokemontcg.io/sv4/logo.png'
  };
  
  return productImages[productType] || 'https://images.pokemontcg.io/sv7/logo.png';
};

const extractProductType = (query: string): string => {
  const queryLower = query.toLowerCase();
  
  if (queryLower.includes('elite trainer box')) return 'elite trainer box';
  if (queryLower.includes('booster box')) return 'booster box';
  if (queryLower.includes('collection box')) return 'collection box';
  if (queryLower.includes('tin')) return 'tin';
  if (queryLower.includes('blister')) return 'blister pack';
  
  return 'collection box';
};

const extractSetName = (query: string): string => {
  const queryLower = query.toLowerCase();
  
  if (queryLower.includes('prismatic')) return 'Prismatic Evolutions';
  if (queryLower.includes('stellar')) return 'Stellar Crown';
  if (queryLower.includes('surging')) return 'Surging Sparks';
  if (queryLower.includes('journey')) return 'Journey Together';
  if (queryLower.includes('temporal')) return 'Temporal Forces';
  if (queryLower.includes('twilight')) return 'Twilight Masquerade';
  
  return 'Pokemon TCG';
};