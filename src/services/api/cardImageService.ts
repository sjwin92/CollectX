
// Service for handling Pokemon card images
import { CARD_BACK_URL } from './pokemonTypes';

// Normalize a card ID to ensure consistent format
export const normalizeCardId = (cardId: string): string => {
  if (!cardId) return '';
  // Some IDs come in different formats, this normalizes them
  return cardId.trim().toLowerCase();
};

// Get the proper card image URL based on set information
export const getConsistentCardImageUrl = (cardId: string, size: 'small' | 'large' = 'large'): string => {
  const normalizedId = normalizeCardId(cardId);
  if (!normalizedId) return CARD_BACK_URL;
  
  // Extract set ID and card number for consistent URL construction
  const parts = normalizedId.split('-');
  if (parts.length !== 2) return CARD_BACK_URL;
  
  const [setId, cardNumber] = parts;
  
  // The official Pokemon TCG API format - most reliable format
  return size === 'large' 
    ? `https://images.pokemontcg.io/${setId}/${cardNumber}_hires.png`
    : `https://images.pokemontcg.io/${setId}/${cardNumber}.png`;
};

// Get all possible image URLs for a card (for fallback purposes)
export const getAllPossibleCardImageUrls = (cardId: string): string[] => {
  if (!cardId) {
    return [CARD_BACK_URL];
  }
  
  const normalizedId = normalizeCardId(cardId);
  
  // If there's no hyphen, it might not be in the standard format
  if (!normalizedId.includes('-')) {
    return [
      `https://images.pokemontcg.io/cards/large/${normalizedId}.png`,
      `https://images.pokemontcg.io/cards/small/${normalizedId}.png`,
      CARD_BACK_URL
    ];
  }
  
  const [setId, cardNumber] = normalizedId.split('-');
  
  // Order these URLs from most reliable to least reliable
  return [
    // Primary formats - most reliable
    `https://images.pokemontcg.io/${setId}/${cardNumber}.png`, // Small format
    `https://images.pokemontcg.io/${setId}/${cardNumber}_hires.png`, // Large format
    
    // Direct API formats that are also reliable
    `https://images.pokemontcg.io/cards/large/${normalizedId}.png`,
    `https://images.pokemontcg.io/cards/small/${normalizedId}.png`,
    
    // Use TCGDex as fallback (slightly different format)
    `https://assets.tcgdex.net/en/cards/${setId}/${cardNumber}.png`,
    `https://assets.tcgdex.net/en/cards/${setId}/${cardNumber}.jpg`,
    
    // Alternative formats
    `https://images.pokemontcg.io/${setId}/${cardNumber}/high.jpg`, 
    `https://images.pokemontcg.io/${setId}/${cardNumber}/low.jpg`,
    
    // Pokellector format (with padding to ensure 3 digits)
    `https://assets.pokellector.com/cards/${setId}/${cardNumber.padStart(3, '0')}.webp`,
    
    // Last resort official card back
    CARD_BACK_URL
  ];
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
  if (!card || !card.id) {
    return [CARD_BACK_URL];
  }
  
  // Return an array of URLs to try in sequence
  const urls = [
    // Original API URLs if present - try these first
    ...(card.images?.small ? [card.images.small] : []),
    ...(card.images?.large ? [card.images.large] : []),
    
    // Our generated URLs as fallbacks
    ...getAllPossibleCardImageUrls(card.id)
  ];
  
  // Filter out any undefined or invalid URLs
  return urls.filter(url => !!url && isValidUrl(url));
};
