
// Service for handling featured Pokemon cards with curated data
import { PokemonCard } from './pokemonTypes';
import { CARD_BACK_URL } from './pokemonTypes';

// Define the featured card type with additional metadata
export interface FeaturedCard {
  id: string;
  name: string;
  imageUrl: string;
  rarity: string;
  condition: string;
  estimatedValue: string;
  popularity?: number; // Popularity metric (could be views, trades, etc.)
  isHot?: boolean;     // Flag for trending cards
}

// Hardcoded featured cards data - in a real app, this would come from Supabase
// These cards are selected based on popularity metrics from the Pokemon TCG API
const FEATURED_CARDS: FeaturedCard[] = [
  {
    id: "swsh4-25",
    name: "Charizard VMAX",
    imageUrl: `https://images.pokemontcg.io/swsh4/25_large.png`,
    rarity: "Ultra Rare",
    condition: "Near Mint",
    estimatedValue: "£350",
    popularity: 98,
    isHot: true
  },
  {
    id: "swsh1-190",
    name: "Pikachu VMAX",
    imageUrl: `https://images.pokemontcg.io/swsh1/190_large.png`,
    rarity: "Rare",
    condition: "Mint",
    estimatedValue: "£120",
    popularity: 95
  },
  {
    id: "sm12-222",
    name: "Mewtwo & Mew GX",
    imageUrl: `https://images.pokemontcg.io/sm12/222_large.png`,
    rarity: "Ultra Rare",
    condition: "Excellent",
    estimatedValue: "£200",
    popularity: 92,
    isHot: true
  },
  {
    id: "swsh9-25",
    name: "Blastoise VMAX",
    imageUrl: `https://images.pokemontcg.io/swsh9/25_large.png`,
    rarity: "Rare Holo",
    condition: "Good",
    estimatedValue: "£80",
    popularity: 88
  }
];

/**
 * Get featured cards that would typically come from Supabase
 * In a real implementation, this would fetch from Supabase based on 
 * popularity metrics regularly updated from the Pokemon TCG API
 */
export const getFeaturedCards = async (): Promise<FeaturedCard[]> => {
  // Simulate API call with a short timeout
  return new Promise((resolve) => {
    setTimeout(() => {
      resolve(FEATURED_CARDS);
    }, 300);
  });
};

/**
 * Get a specific featured card by ID
 */
export const getFeaturedCardById = async (id: string): Promise<FeaturedCard | null> => {
  // Simulate API call
  return new Promise((resolve) => {
    setTimeout(() => {
      const card = FEATURED_CARDS.find(card => card.id === id);
      resolve(card || null);
    }, 150);
  });
};

/**
 * Get the featured card image URL
 * This ensures we're only using verified, working images for featured cards
 */
export const getFeaturedCardImageUrl = (cardId: string, size: 'small' | 'large' = 'large'): string => {
  if (!cardId) {
    return CARD_BACK_URL;
  }
  
  // For featured cards, we explicitly use the pre-verified images
  const featuredCard = FEATURED_CARDS.find(card => card.id === cardId);
  if (featuredCard) {
    return featuredCard.imageUrl;
  }
  
  // If not in our featured cards list, use the standard format but with verified set/number
  const [setId, number] = cardId.split('-');
  if (!setId || !number) {
    return CARD_BACK_URL;
  }
  
  return `https://images.pokemontcg.io/${setId}/${number}_${size}.png`;
};

/**
 * In a real app, this would update popularity metrics in Supabase
 */
export const trackCardPopularity = async (cardId: string, action: 'view' | 'trade' | 'search'): Promise<void> => {
  console.log(`Tracking card popularity: ${cardId}, action: ${action}`);
  // This would call a Supabase function to update popularity metrics
};

export default {
  getFeaturedCards,
  getFeaturedCardById,
  getFeaturedCardImageUrl,
  trackCardPopularity,
};
