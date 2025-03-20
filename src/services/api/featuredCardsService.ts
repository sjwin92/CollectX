
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
 * Returns a variety of popular pokemon cards for the featured trades section
 */
export const getFeaturedCards = async () => {
  // Return a varied selection of featured cards
  return [
    {
      id: "swsh4-25",
      name: "Pikachu V",
      imageUrl: "https://images.pokemontcg.io/swsh4/25_large.png",
      rarity: "Ultra Rare",
      condition: "Near Mint",
      estimatedValue: "£18.99"
    },
    {
      id: "swsh1-190",
      name: "Zacian V",
      imageUrl: "https://images.pokemontcg.io/swsh1/190_large.png",
      rarity: "Ultra Rare",
      condition: "Excellent",
      estimatedValue: "£24.50"
    },
    {
      id: "sm12-222",
      name: "Charizard & Braixen GX",
      imageUrl: "https://images.pokemontcg.io/sm12/222_large.png",
      rarity: "Secret Rare",
      condition: "Near Mint",
      estimatedValue: "£32.75"
    },
    {
      id: "swsh9-25",
      name: "Mew VMAX",
      imageUrl: "https://images.pokemontcg.io/swsh9/25_large.png",
      rarity: "Ultra Rare",
      condition: "Mint",
      estimatedValue: "£45.00"
    }
  ];
};
