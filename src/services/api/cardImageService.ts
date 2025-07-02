
// Service for handling Pokemon card images
import { CARD_BACK_URL } from './pokemonTypes';

// Normalize a card ID to ensure consistent format
export const normalizeCardId = (cardId: string): string => {
  if (!cardId) return '';
  return cardId.trim().toLowerCase();
};

// Get the proper card image URL based on set information
export const getConsistentCardImageUrl = (cardId: string, size: 'small' | 'large' = 'small'): string => {
  if (!cardId) {
    return CARD_BACK_URL;
  }
  
  const [setId, number] = cardId.split('-');
  if (!setId || !number) {
    return CARD_BACK_URL;
  }
  
  return `https://images.pokemontcg.io/${setId}/${number}_${size}.png`;
};

// Get all possible image URLs for a card (for fallback purposes)
export const getAllPossibleCardImageUrls = (cardId: string): string[] => {
  if (!cardId) return [];
  
  const [setId, number] = cardId.split('-');
  if (!setId || !number) return [];
  
  const urls = [
    // Pokemon TCG API images (most reliable)
    `https://images.pokemontcg.io/${setId}/${number}.png`,
    `https://images.pokemontcg.io/${setId}/${number}_small.png`,
    `https://images.pokemontcg.io/${setId}/${number}_large.png`,
    `https://images.pokemontcg.io/${setId}/${number}_hires.png`,
    
    // TCGDex API images (backup)
    `https://assets.tcgdex.net/en/${setId}/${number}/card.png`
  ];
  
  return urls;
};

// Get reliable set image URLs with multiple fallback sources
export const getSetImageUrl = (setId: string, type: 'logo' | 'symbol'): string | undefined => {
  if (!setId) return undefined;
  
  console.log(`Getting ${type} image for set: ${setId}`);
  
  // Don't generate URLs for sets that are known to not have images
  const setsWithoutImages = ['sv10', 'sv11', 'sv12']; 
  if (setsWithoutImages.includes(setId)) {
    console.log(`Set ${setId} is in the no-images list`);
    return undefined;
  }
  
  // Try multiple URL patterns for Scarlet & Violet sets
  const urlPatterns = [
    `https://images.pokemontcg.io/${setId}/${type}.png`,
    `https://assets.tcgdex.net/en/${setId}/${type}.png`,
    `https://limitlesstcg.s3.us-east-2.amazonaws.com/pokemon/gen9/${setId}/${type}.png`,
    // Alternative patterns for newer sets
    `https://images.pokemontcg.io/sv/${setId.replace('sv', '')}/${type}.png`,
    `https://assets.tcgdx.net/images/sets/${setId}/${type}.png`
  ];
  
  console.log(`Generated URLs for ${setId}:`, urlPatterns[0]);
  return urlPatterns[0]; // Return first URL, we'll add fallback logic in the component
};

// Fix problematic URLs with better fallback logic
export const fixImageUrl = (url: string | undefined, setId?: string, type?: 'logo' | 'symbol'): string | undefined => {
  console.log(`Fixing image URL: ${url} for set: ${setId}, type: ${type}`);
  
  // If no URL provided, try to generate one
  if (!url) {
    const generatedUrl = setId && type ? getSetImageUrl(setId, type) : undefined;
    console.log(`Generated fallback URL: ${generatedUrl}`);
    return generatedUrl;
  }
  
  // Check if URL is using problematic domains
  if (url.includes('tcgdx.net') || url.includes('tcgdex.net') || url.includes('pokemontcg.guru')) {
    console.log(`Replacing problematic URL: ${url}`);
    return setId && type ? getSetImageUrl(setId, type) : undefined;
  }
  
  // Fix malformed URLs
  if (!url.includes('://')) {
    const fixedUrl = `https://images.pokemontcg.io/${url}`;
    console.log(`Fixed malformed URL: ${url} -> ${fixedUrl}`);
    return fixedUrl;
  }
  
  // Replace HTTP with HTTPS for security
  if (url.startsWith('http://')) {
    const httpsUrl = url.replace('http://', 'https://');
    console.log(`Converted to HTTPS: ${url} -> ${httpsUrl}`);
    return httpsUrl;
  }
  
  console.log(`Using original URL: ${url}`);
  return url;
};

// Check if a URL is valid format
export const isValidUrl = (url: string): boolean => {
  try {
    new URL(url);
    return true;
  } catch {
    return false;
  }
};

// Get all possible image URLs for a card object
export const getAllPossibleImageUrlsFromCardObject = (card: any): string[] => {
  if (!card) return [];
  
  const urls: string[] = [];
  
  // Add direct image URLs if they exist in the card object
  if (card.images) {
    if (card.images.large) urls.push(card.images.large);
    if (card.images.small) urls.push(card.images.small);
  }
  
  // Add TCG API URLs based on card ID
  if (card.id) {
    const allUrls = getAllPossibleCardImageUrls(card.id);
    urls.push(...allUrls);
  }
  
  return [...new Set(urls)];
};
