
import { CARD_BACK_URL } from './pokemonTypes';

/**
 * Gets the image URL for a featured card
 * @param cardId The ID of the card
 * @param size Image size (small or large)
 * @returns The image URL for the featured card
 */
export const getFeaturedCardImageUrl = (cardId: string, size: 'small' | 'large' = 'large'): string => {
  if (!cardId) {
    console.error("Invalid card ID: empty or undefined");
    return CARD_BACK_URL;
  }
  
  // For featured cards, we use the official Pokemon TCG API's high-quality images
  const sizeParam = size === 'large' ? 'large' : 'small';
  
  // Split the ID into set and number parts
  const parts = cardId.split('-');
  if (parts.length !== 2) {
    console.error(`Invalid card ID format: ${cardId}`);
    return CARD_BACK_URL;
  }
  
  // Return the properly formatted URL for the Pokemon TCG API
  return `https://images.pokemontcg.io/${parts[0]}/${parts[1]}_${sizeParam}.png`;
};

/**
 * Gets a list of featured cards from the latest sets
 * Returns a variety of popular pokemon cards for the featured trades section
 */
export const getFeaturedCards = async () => {
  // Return a varied selection of featured cards
  const featuredCards = [
    {
      id: "swsh4-25",
      name: "Pikachu V",
      imageUrl: getFeaturedCardImageUrl("swsh4-25"),
      rarity: "Ultra Rare",
      condition: "Near Mint",
      estimatedValue: "£18.99"
    },
    {
      id: "swsh1-190",
      name: "Zacian V",
      imageUrl: getFeaturedCardImageUrl("swsh1-190"),
      rarity: "Ultra Rare",
      condition: "Excellent",
      estimatedValue: "£24.50"
    },
    {
      id: "sm12-222",
      name: "Charizard & Braixen GX",
      imageUrl: getFeaturedCardImageUrl("sm12-222"),
      rarity: "Secret Rare",
      condition: "Near Mint",
      estimatedValue: "£32.75"
    },
    {
      id: "swsh9-25",
      name: "Mew VMAX",
      imageUrl: getFeaturedCardImageUrl("swsh9-25"),
      rarity: "Ultra Rare",
      condition: "Mint",
      estimatedValue: "£45.00"
    },
    {
      id: "sv3-193",
      name: "Charizard ex",
      imageUrl: getFeaturedCardImageUrl("sv3-193"),
      rarity: "Ultra Rare",
      condition: "Near Mint",
      estimatedValue: "£56.25"
    },
    {
      id: "sv4-199",
      name: "Gardevoir ex",
      imageUrl: getFeaturedCardImageUrl("sv4-199"),
      rarity: "Ultra Rare",
      condition: "Excellent",
      estimatedValue: "£38.50"
    }
  ];
  
  console.log("Featured cards prepared with the following image URLs:");
  featuredCards.forEach(card => {
    console.log(`${card.name}: ${card.imageUrl}`);
  });
  
  return featuredCards;
};
