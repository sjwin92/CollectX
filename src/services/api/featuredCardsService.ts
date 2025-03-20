
import { CARD_BACK_URL } from './pokemonTypes';

/**
 * Gets the image URL for a featured card
 * @param cardId The ID of the card
 * @param size Image size (small or large)
 * @returns The image URL for the featured card
 */
export const getFeaturedCardImageUrl = (cardId: string, size: 'small' | 'large' = 'large'): string => {
  if (!cardId) {
    return CARD_BACK_URL;
  }
  
  // For featured cards, we use the official Pokemon TCG API's high-quality images
  const sizeParam = size === 'large' ? 'large' : 'small';
  return `https://images.pokemontcg.io/${cardId.split('-')[0]}/${cardId.split('-')[1]}_${sizeParam}.png`;
};

/**
 * Gets a list of featured cards from the latest sets
 * This is a placeholder implementation that will be replaced with a real API call
 */
export const getFeaturedCards = async () => {
  // This is just a placeholder until we implement real featured cards
  return [];
};
