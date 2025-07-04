
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
  
  // For Scarlet & Violet sets, try Pokemon TCG API first, then fallbacks
  if (setId.startsWith('sv')) {
    // Try Pokemon TCG API first
    return `https://images.pokemontcg.io/${setId}/${type}.png`;
  }
  
  // Use Pokemon TCG API for other sets
  return `https://images.pokemontcg.io/${setId}/${type}.png`;
};

// Fix problematic URLs with better fallback logic
export const fixImageUrl = (url: string | undefined, setId?: string, type?: 'logo' | 'symbol'): string | undefined => {
  // If no URL provided, try to generate one
  if (!url) {
    return setId && type ? getSetImageUrl(setId, type) : undefined;
  }
  
  // Check if URL is using problematic domains
  if (url.includes('tcgdx.net') || url.includes('tcgdex.net') || url.includes('pokemontcg.guru')) {
    return setId && type ? getSetImageUrl(setId, type) : undefined;
  }
  
  // Fix malformed URLs
  if (!url.includes('://')) {
    return `https://images.pokemontcg.io/${url}`;
  }
  
  // Replace HTTP with HTTPS for security
  if (url.startsWith('http://')) {
    return url.replace('http://', 'https://');
  }
  
  return url;
};

// Get multiple fallback URLs for set images
export const getSetImageFallbacks = (setId: string, type: 'logo' | 'symbol'): string[] => {
  if (!setId) return [];
  
  const fallbacks = [
    `https://images.pokemontcg.io/${setId}/${type}.png`,
  ];
  
  // Add additional fallbacks for specific set series
  if (setId.startsWith('sv')) {
    fallbacks.push(
      `https://assets.tcgdex.net/en/sv/${setId}/${type}.png`,
      `https://limitlesstcg.s3.us-east-2.amazonaws.com/pokemon/gen9/${setId}/${type}.png`
    );
  } else if (setId.startsWith('swsh')) {
    fallbacks.push(`https://assets.tcgdex.net/en/swsh/${setId}/${type}.png`);
  } else if (setId.startsWith('xy')) {
    fallbacks.push(`https://assets.tcgdex.net/en/xy/${setId}/${type}.png`);
  }
  
  return fallbacks;
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
