
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
  
  // The official Pokemon TCG API format
  return `https://images.pokemontcg.io/${size}/${normalizedId}.png`;
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
      `https://images.pokemontcg.io/large/${normalizedId}.png`,
      `https://images.pokemontcg.io/small/${normalizedId}.png`,
      CARD_BACK_URL
    ];
  }
  
  const setId = normalizedId.split('-')[0];
  const cardNumber = normalizedId.split('-')[1];
  
  // Order these URLs from most reliable to least reliable
  return [
    // Primary source - Pokemon TCG API
    `https://images.pokemontcg.io/large/${normalizedId}.png`,
    `https://images.pokemontcg.io/small/${normalizedId}.png`,
    
    // Alternative format with set ID
    `https://images.pokemontcg.io/${setId}/${cardNumber}_hires.png`,
    `https://images.pokemontcg.io/${setId}/${cardNumber}.png`,
    
    // TCGDex format
    `https://assets.tcgdex.net/en/cards/${setId}/${cardNumber}`,
    `https://assets.tcgdex.net/en/cards/${setId}/${cardNumber}.jpg`,
    `https://assets.tcgdex.net/en/cards/${setId}/${cardNumber}.png`,
    
    // Another TCGDex format
    `https://assets.tcgdex.net/en/${setId}/${cardNumber}`,
    `https://assets.tcgdex.net/en/${setId}/${cardNumber}.jpg`,
    `https://assets.tcgdex.net/en/${setId}/${cardNumber}.png`,
    
    // Pokellector format (with padding to ensure 3 digits)
    `https://assets.pokellector.com/cards/${setId}/${cardNumber.padStart(3, '0')}.webp`,
    
    // Pokemon.com format
    `https://assets.pokemon.com/assets/cms2/img/cards/web/${setId.toUpperCase()}/${setId.toUpperCase()}_EN_${cardNumber}.png`,
    
    // PokemonCards.com format
    `https://images.pokemoncards.com/${setId}/${cardNumber}.jpg`,
    
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
  return [
    // Original API URLs if present - try these first
    card.images?.small,
    card.images?.large,
    // Our generated URLs as fallbacks
    getConsistentCardImageUrl(card.id, 'small'),
    getConsistentCardImageUrl(card.id, 'large'),
    // Last resort
    CARD_BACK_URL
  ].filter(url => !!url && isValidUrl(url)); // Filter out any undefined or invalid URLs
};
