
// Service for handling Pokemon card images
import { CARD_BACK_URL } from './pokemonTypes';

// Normalize a card ID to ensure consistent format
export const normalizeCardId = (cardId: string): string => {
  if (!cardId) return '';
  // Some IDs come in different formats, this normalizes them
  return cardId.trim().toLowerCase();
};

// Get the proper card image URL based on set information
export const getConsistentCardImageUrl = (cardId: string, size: 'small' | 'large' = 'small'): string => {
  if (!cardId) {
    return CARD_BACK_URL;
  }
  
  // The Pokemon TCG API image URL format
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
    // Pokemon TCG API images (reliable primary source)
    `https://images.pokemontcg.io/${setId}/${number}_small.png`,
    `https://images.pokemontcg.io/${setId}/${number}_large.png`,
    
    // TCGDex API images (reliable secondary source)
    `https://assets.tcgdex.net/en/${setId}/${number}/card.png`
  ];
  
  return urls;
};

// Get featured card image exclusively from set data (no alternative sources)
export const getFeaturedCardImageUrl = (cardId: string, size: 'small' | 'large' = 'small'): string => {
  if (!cardId) {
    return CARD_BACK_URL;
  }
  
  // Only use the official Pokemon TCG API format for featured cards
  const [setId, number] = cardId.split('-');
  if (!setId || !number) {
    return CARD_BACK_URL;
  }
  
  // For featured cards, exclusively use the Pokemon TCG API format
  return `https://images.pokemontcg.io/${setId}/${number}_${size}.png`;
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
    if (card.images.small) urls.push(card.images.small);
    if (card.images.large) urls.push(card.images.large);
  }
  
  // Add TCG API URLs based on card ID
  if (card.id) {
    urls.push(getConsistentCardImageUrl(card.id, 'small'));
    urls.push(getConsistentCardImageUrl(card.id, 'large'));
  }
  
  // Add other potential sources
  if (card.set?.id && card.number) {
    // TCGDex format
    urls.push(`https://assets.tcgdex.net/en/${card.set.id}/${card.number}/card.png`);
  }
  
  return [...new Set(urls)];
};
