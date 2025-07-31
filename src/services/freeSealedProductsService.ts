// Enhanced sealed products service with real Pokemon product images
import { PokemonSet } from './api/pokemonTypes';
import { resolveProductImage } from './api/productImageService';

export interface FreeSealedProduct {
  id: string;
  name: string;
  type: string;
  setName: string;
  setId: string;
  price: {
    current: number;
    currency: string;
    source: string;
  };
  imageUrl: string;
  availability: 'in-stock' | 'pre-order' | 'out-of-stock';
  releaseDate: string;
  description: string;
  vendor: string;
  retailPrice?: number;
}

// Sealed product types with proper API mapping
const productTypes = [
  { type: 'Booster Box', apiType: 'box', basePrice: 75, icon: '📦' },
  { type: 'Elite Trainer Box', apiType: 'etb', basePrice: 35, icon: '🎁' },
  { type: 'Collection Box', apiType: 'box', basePrice: 20, icon: '📋' },
  { type: 'Tin', apiType: 'tin', basePrice: 15, icon: '🥫' },
  { type: 'Blister Pack', apiType: 'blister-pack', basePrice: 4, icon: '💳' }
];

// Get Pokemon product image with enhanced fallbacks
const getProductImage = async (setId: string, productType: string, setName: string): Promise<string> => {
  // Map display type to API type
  const productMapping = productTypes.find(p => p.type === productType);
  const apiType = productMapping?.apiType || 'box';
  
  // Try multiple Pokemon-specific image sources
  const imageUrls = [
    // TCGDX assets (most reliable for product images)
    `https://assets.tcgdx.net/en/sets/${setId}/${apiType}.png`,
    `https://assets.tcgdx.net/en/sets/${setId}/${apiType}.jpg`,
    // Pokemon TCG API product images
    `https://images.pokemontcg.io/${setId}/${apiType}.png`,
    `https://images.pokemontcg.io/products/${setId}/${apiType}.png`,
    // Set symbols (smaller, better fallback than logos)
    `https://images.pokemontcg.io/${setId}/symbol.png`,
    // Set logo as final Pokemon-related fallback
    `https://images.pokemontcg.io/${setId}/logo.png`
  ];
  
  // Test each URL until we find one that works
  for (const url of imageUrls) {
    try {
      const response = await fetch(url, { method: 'HEAD' });
      if (response.ok) {
        return url;
      }
    } catch (error) {
      // Continue to next URL
      continue;
    }
  }
  
  // Final fallback - return set logo even if we can't verify it
  return `https://images.pokemontcg.io/${setId}/logo.png`;
};

// Fallback sets data for when API fails
const fallbackSets: PokemonSet[] = [
  {
    id: "sv8",
    name: "Surging Sparks",
    series: "Scarlet & Violet",
    printedTotal: 191,
    total: 252,
    releaseDate: "2024/11/08",
    images: {
      symbol: "https://images.pokemontcg.io/sv8/symbol.png",
      logo: "https://images.pokemontcg.io/sv8/logo.png"
    },
    legalities: { standard: "Legal", expanded: "Legal", unlimited: "Legal" }
  },
  {
    id: "sv7",
    name: "Stellar Crown",
    series: "Scarlet & Violet", 
    printedTotal: 142,
    total: 175,
    releaseDate: "2024/09/13",
    images: {
      symbol: "https://images.pokemontcg.io/sv7/symbol.png",
      logo: "https://images.pokemontcg.io/sv7/logo.png"
    },
    legalities: { standard: "Legal", expanded: "Legal", unlimited: "Legal" }
  },
  {
    id: "sv6",
    name: "Twilight Masquerade",
    series: "Scarlet & Violet",
    printedTotal: 167,
    total: 226,
    releaseDate: "2024/05/24",
    images: {
      symbol: "https://images.pokemontcg.io/sv6/symbol.png",
      logo: "https://images.pokemontcg.io/sv6/logo.png"
    },
    legalities: { standard: "Legal", expanded: "Legal", unlimited: "Legal" }
  },
  {
    id: "sv5",
    name: "Temporal Forces",
    series: "Scarlet & Violet",
    printedTotal: 162,
    total: 218,
    releaseDate: "2024/03/22",
    images: {
      symbol: "https://images.pokemontcg.io/sv5/symbol.png",
      logo: "https://images.pokemontcg.io/sv5/logo.png"
    },
    legalities: { standard: "Legal", expanded: "Legal", unlimited: "Legal" }
  }
];

// Fetch Pokemon sets from API with fallback
const fetchPokemonSets = async (): Promise<PokemonSet[]> => {
  try {
    console.log('Attempting to fetch Pokemon sets from API...');
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 5000); // 5 second timeout
    
    const response = await fetch('https://api.pokemontcg.io/v2/sets?pageSize=20&orderBy=-releaseDate', {
      signal: controller.signal,
      headers: {
        'Accept': 'application/json',
      }
    });
    
    clearTimeout(timeoutId);
    
    if (!response.ok) {
      throw new Error(`API returned ${response.status}: ${response.statusText}`);
    }
    
    const data = await response.json();
    console.log('Successfully fetched sets from API:', data.data?.length || 0, 'sets');
    return data.data || fallbackSets;
  } catch (error) {
    console.warn('API fetch failed, using fallback data:', error);
    return fallbackSets;
  }
};

// Generate realistic price variation
const generatePrice = (basePrice: number, setDate: string): number => {
  const releaseDate = new Date(setDate);
  const now = new Date();
  const monthsSinceRelease = (now.getTime() - releaseDate.getTime()) / (1000 * 60 * 60 * 24 * 30);
  
  let multiplier = 1;
  if (monthsSinceRelease < 3) {
    multiplier = 1.2 + Math.random() * 0.3; // Premium for new releases
  } else if (monthsSinceRelease > 24) {
    multiplier = 0.7 + Math.random() * 0.8; // Vintage variation
  } else {
    multiplier = 0.9 + Math.random() * 0.4; // Standard variation
  }
  
  return Math.round(basePrice * multiplier * 100) / 100;
};

// Create sealed products from sets
export const fetchFreeSealedProducts = async (): Promise<FreeSealedProduct[]> => {
  try {
    const sets = await fetchPokemonSets();
    const products: FreeSealedProduct[] = [];
    
    // Use Promise.all to resolve all product images concurrently
    const productPromises = sets.flatMap((set) =>
      productTypes.map(async (productType) => {
        const currentPrice = generatePrice(productType.basePrice, set.releaseDate);
        const retailPrice = productType.basePrice * 1.15;
        const imageUrl = await getProductImage(set.id, productType.type, set.name);
        
        return {
          id: `${set.id}-${productType.type.toLowerCase().replace(/\s+/g, '-')}`,
          name: `${set.name} ${productType.type}`,
          type: productType.type,
          setName: set.name,
          setId: set.id,
          price: {
            current: currentPrice,
            currency: 'GBP',
            source: 'Market Average'
          },
          imageUrl,
          availability: Math.random() > 0.3 ? 'in-stock' as const : 
                       Math.random() > 0.5 ? 'pre-order' as const : 'out-of-stock' as const,
          releaseDate: set.releaseDate,
          description: `Official ${set.name} ${productType.type} from the ${set.series} series.`,
          vendor: 'Various Retailers',
          retailPrice
        };
      })
    );
    
    const resolvedProducts = await Promise.all(productPromises);
    return resolvedProducts;
  } catch (error) {
    console.error('Error creating sealed products:', error);
    return [];
  }
};

export default {
  fetchFreeSealedProducts
};