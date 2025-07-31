// Simplified sealed products service with reliable images
import { PokemonSet } from './api/pokemonTypes';

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

// Sealed product types with typical pricing
const productTypes = [
  { type: 'Booster Box', basePrice: 75, icon: '📦' },
  { type: 'Elite Trainer Box', basePrice: 35, icon: '🎁' },
  { type: 'Collection Box', basePrice: 20, icon: '📋' },
  { type: 'Tin', basePrice: 15, icon: '🥫' },
  { type: 'Blister Pack', basePrice: 4, icon: '💳' }
];

// Get small, reliable product image
const getProductImage = (setId: string, productType: string): string => {
  // Use placeholder icons for different product types
  const placeholderImages: { [key: string]: string } = {
    'Booster Box': 'https://images.unsplash.com/photo-1600298881974-6be191ceeda1?w=300&h=300&fit=crop&crop=center',
    'Elite Trainer Box': 'https://images.unsplash.com/photo-1578662996442-48f60103fc96?w=300&h=300&fit=crop&crop=center',
    'Collection Box': 'https://images.unsplash.com/photo-1513475382585-d06e58bcb0e0?w=300&h=300&fit=crop&crop=center',
    'Tin': 'https://images.unsplash.com/photo-1565299624946-b28f40a0ca4b?w=300&h=300&fit=crop&crop=center',
    'Blister Pack': 'https://images.unsplash.com/photo-1606107557195-0e29a4b5b4aa?w=300&h=300&fit=crop&crop=center'
  };
  
  return placeholderImages[productType] || placeholderImages['Booster Box'];
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
    
    sets.forEach((set) => {
      productTypes.forEach((productType) => {
        const currentPrice = generatePrice(productType.basePrice, set.releaseDate);
        const retailPrice = productType.basePrice * 1.15;
        
        products.push({
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
          imageUrl: getProductImage(set.id, productType.type),
          availability: Math.random() > 0.3 ? 'in-stock' : 
                       Math.random() > 0.5 ? 'pre-order' : 'out-of-stock',
          releaseDate: set.releaseDate,
          description: `Official ${set.name} ${productType.type} from the ${set.series} series.`,
          vendor: 'Various Retailers',
          retailPrice
        });
      });
    });
    
    return products;
  } catch (error) {
    console.error('Error creating sealed products:', error);
    return [];
  }
};

export default {
  fetchFreeSealedProducts
};