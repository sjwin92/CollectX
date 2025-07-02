// Free sealed products service using Pokemon TCG API and enhanced images
import { getEnhancedProductImage } from './sealedProductImageService';
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

// Sealed product types with typical UK pricing
const productTypes = [
  { type: 'Booster Box', basePrice: 75, suffix: 'booster-box' },
  { type: 'Elite Trainer Box', basePrice: 35, suffix: 'etb' },
  { type: 'Collection Box', basePrice: 20, suffix: 'collection-box' },
  { type: 'Tin', basePrice: 15, suffix: 'tin' },
  { type: 'Blister Pack', basePrice: 4, suffix: 'blister' }
];

// Fetch Pokemon sets from free API
const fetchPokemonSets = async (): Promise<PokemonSet[]> => {
  try {
    const response = await fetch('https://api.pokemontcg.io/v2/sets?pageSize=50&orderBy=-releaseDate');
    const data = await response.json();
    return data.data || [];
  } catch (error) {
    console.error('Error fetching sets:', error);
    return [];
  }
};

// Get product image from multiple free sources
const getProductImage = (setId: string, productType: string): string => {
  const typeMapping: { [key: string]: string[] } = {
    'Booster Box': [
      `https://images.pokemontcg.io/${setId}/booster-box.png`,
      `https://assets.tcgdx.net/en/sets/${setId}/booster-box.png`,
      `https://images.pokemontcg.io/products/${setId}/booster-box.png`,
      `https://tcgplayer-cdn.tcgplayer.com/product/${setId}_booster_box.jpg`
    ],
    'Elite Trainer Box': [
      `https://images.pokemontcg.io/${setId}/etb.png`,
      `https://assets.tcgdx.net/en/sets/${setId}/etb.png`,
      `https://images.pokemontcg.io/products/${setId}/etb.png`,
      `https://tcgplayer-cdn.tcgplayer.com/product/${setId}_etb.jpg`
    ],
    'Collection Box': [
      `https://images.pokemontcg.io/${setId}/collection-box.png`,
      `https://assets.tcgdx.net/en/sets/${setId}/collection-box.png`,
      `https://images.pokemontcg.io/products/${setId}/collection.png`,
      `https://tcgplayer-cdn.tcgplayer.com/product/${setId}_collection.jpg`
    ],
    'Tin': [
      `https://images.pokemontcg.io/${setId}/tin.png`,
      `https://assets.tcgdx.net/en/sets/${setId}/tin.png`,
      `https://images.pokemontcg.io/products/${setId}/tin.png`,
      `https://tcgplayer-cdn.tcgplayer.com/product/${setId}_tin.jpg`
    ],
    'Blister Pack': [
      `https://images.pokemontcg.io/${setId}/blister.png`,
      `https://assets.tcgdx.net/en/sets/${setId}/blister.png`,
      `https://images.pokemontcg.io/products/${setId}/blister.png`,
      `https://tcgplayer-cdn.tcgplayer.com/product/${setId}_blister.jpg`
    ]
  };
  
  const urls = typeMapping[productType] || [
    `https://images.pokemontcg.io/${setId}/logo.png`
  ];
  
  return urls[0];
};

// Generate realistic price variation
const generatePrice = (basePrice: number, setDate: string): number => {
  const releaseDate = new Date(setDate);
  const now = new Date();
  const monthsSinceRelease = (now.getTime() - releaseDate.getTime()) / (1000 * 60 * 60 * 24 * 30);
  
  // Newer sets are more expensive, older sets vary more
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
    
    sets.slice(0, 20).forEach((set) => {
      productTypes.forEach((productType) => {
        const currentPrice = generatePrice(productType.basePrice, set.releaseDate);
        const retailPrice = productType.basePrice * 1.15; // MSRP is typically higher
        
        products.push({
          id: `${set.id}-${productType.suffix}`,
          name: `${set.name} ${productType.type}`,
          type: productType.type,
          setName: set.name,
          setId: set.id,
          price: {
            current: currentPrice,
            currency: 'GBP',
            source: 'UK Market Average'
          },
          imageUrl: getEnhancedProductImage(set.id, productType.type, set.name),
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