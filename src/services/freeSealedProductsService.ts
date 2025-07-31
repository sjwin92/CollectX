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

// Get Pokemon product image with fallbacks
const getProductImage = async (setId: string, productType: string, setName: string): Promise<string> => {
  // Map display type to API type
  const productMapping = productTypes.find(p => p.type === productType);
  const apiType = productMapping?.apiType || 'box';
  
  try {
    // Try to get actual Pokemon product image
    const productImage = await resolveProductImage(setId, apiType, setName);
    if (productImage) {
      return productImage;
    }
  } catch (error) {
    console.warn(`Failed to resolve product image for ${setId}-${apiType}:`, error);
  }
  
  // Fallback to set logo
  return `https://images.pokemontcg.io/${setId}/logo.png`;
};

// Fetch Pokemon sets from API
const fetchPokemonSets = async (): Promise<PokemonSet[]> => {
  try {
    const response = await fetch('https://api.pokemontcg.io/v2/sets?pageSize=20&orderBy=-releaseDate');
    const data = await response.json();
    return data.data || [];
  } catch (error) {
    console.error('Error fetching sets:', error);
    return [];
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