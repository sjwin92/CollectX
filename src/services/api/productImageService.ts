
// Service for fetching Pokemon TCG product images
import { fixImageUrl } from './cardImageService';

export interface ProductImageUrls {
  primary: string;
  fallback: string[];
}

// Get product image URLs based on set and product type
export const getProductImageUrls = async (setId: string, productType: string, setName: string): Promise<ProductImageUrls> => {
  const baseUrls: string[] = [];
  
  // Try Pokemon TCG API images first (most reliable)
  const tcgApiUrl = `https://images.pokemontcg.io/${setId}`;
  
  // Different product types have different image patterns
  switch (productType) {
    case 'etb':
      baseUrls.push(
        `${tcgApiUrl}/etb.png`,
        `${tcgApiUrl}/etb.jpg`,
        `https://images.pokemontcg.io/products/${setId}/etb.png`,
        `https://assets.tcgdex.net/en/sets/${setId}/etb.png`
      );
      break;
    case 'box':
      baseUrls.push(
        `${tcgApiUrl}/box.png`,
        `${tcgApiUrl}/booster-box.png`,
        `https://images.pokemontcg.io/products/${setId}/booster-box.png`,
        `https://assets.tcgdx.net/en/sets/${setId}/booster-box.png`
      );
      break;
    case 'tin':
      baseUrls.push(
        `${tcgApiUrl}/tin.png`,
        `https://images.pokemontcg.io/products/${setId}/tin.png`,
        `https://assets.tcgdx.net/en/sets/${setId}/tin.png`
      );
      break;
    case 'blister-pack':
      baseUrls.push(
        `${tcgApiUrl}/blister.png`,
        `${tcgApiUrl}/3pack-blister.png`,
        `https://images.pokemontcg.io/products/${setId}/blister.png`
      );
      break;
    case 'deck':
      baseUrls.push(
        `${tcgApiUrl}/theme-deck.png`,
        `${tcgApiUrl}/battle-deck.png`,
        `https://images.pokemontcg.io/products/${setId}/deck.png`
      );
      break;
    default:
      baseUrls.push(`${tcgApiUrl}/logo.png`);
  }
  
  // Add set logo as fallback for all products
  baseUrls.push(
    `https://images.pokemontcg.io/${setId}/logo.png`,
    `https://images.pokemontcg.io/${setId}/symbol.png`
  );
  
  return {
    primary: baseUrls[0],
    fallback: baseUrls.slice(1)
  };
};

// Check if an image URL is valid by attempting to load it
export const validateImageUrl = async (url: string): Promise<boolean> => {
  try {
    const response = await fetch(url, { method: 'HEAD' });
    return response.ok && response.headers.get('content-type')?.startsWith('image/');
  } catch {
    return false;
  }
};

// Get the first valid image URL from a list of URLs
export const getFirstValidImageUrl = async (urls: string[]): Promise<string | null> => {
  for (const url of urls) {
    if (await validateImageUrl(url)) {
      return url;
    }
  }
  return null;
};

// Enhanced product image resolver with caching
const imageCache = new Map<string, string>();

export const resolveProductImage = async (setId: string, productType: string, setName: string): Promise<string | undefined> => {
  const cacheKey = `${setId}-${productType}`;
  
  // Check cache first
  if (imageCache.has(cacheKey)) {
    return imageCache.get(cacheKey);
  }

  try {
    const imageUrls = await getProductImageUrls(setId, productType, setName);
    const allUrls = [imageUrls.primary, ...imageUrls.fallback];
    
    // Try to find the first working image
    const validUrl = await getFirstValidImageUrl(allUrls);
    
    if (validUrl) {
      imageCache.set(cacheKey, validUrl);
      return validUrl;
    }
    
    return undefined;
  } catch (error) {
    console.error(`Failed to resolve product image for ${setId}-${productType}:`, error);
    return undefined;
  }
};

// Preload images for better user experience
export const preloadProductImages = async (setId: string, productTypes: string[]): Promise<void> => {
  const promises = productTypes.map(type => 
    resolveProductImage(setId, type, `Set ${setId}`)
  );
  
  await Promise.allSettled(promises);
};
