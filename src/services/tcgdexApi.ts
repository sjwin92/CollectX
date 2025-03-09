
const BASE_URL = 'https://api.tcgdex.net/v2';

// Alternative reliable card image sources
const LIMITLESS_TCG_API = 'https://limitlesstcg.com/cards/en';
const POKEMON_COM_IMAGES = 'https://assets.pokemon.com/assets/cms2/img/cards/web';

export interface TCGDexCard {
  id: string;
  localId: string;
  name: {
    en: string;
    [key: string]: string;
  };
  category: string;
  illustrator: string;
  variants: {
    normal: string;
    reverse?: string;
    holo?: string;
    firstEdition?: string;
  };
  set: {
    id: string;
    name: {
      en: string;
      [key: string]: string;
    };
    logo: string;
    symbol: string;
    printedTotal: number;
    total: number;
    releaseDate: string;
  };
  rarity: string;
  hp?: number;
  types?: string[];
  legal: {
    standard: boolean;
    expanded: boolean;
    unlimited: boolean;
  };
}

/**
 * Validates image URLs and provides reliable fallbacks
 * @param url The image URL to validate
 * @returns Validated URL or a fallback if invalid
 */
const validateImageUrl = (url: string | undefined, cardId?: string): string => {
  if (!url) {
    return getFallbackImage(cardId);
  }
  
  // Check if the URL is valid format
  try {
    new URL(url);
    return url;
  } catch (e) {
    console.warn('Invalid image URL detected:', url);
    return getFallbackImage(cardId);
  }
};

/**
 * Get reliable fallback images from multiple sources
 */
const getFallbackImage = (cardId?: string): string => {
  if (!cardId) {
    return `${POKEMON_COM_IMAGES}/SV12/SV12_EN_1.png`;
  }
  
  // Try multiple sources
  // 1. Limitless TCG
  const limitlessUrl = `${LIMITLESS_TCG_API}/${cardId.replace(/-/g, "/")}`;
  
  // 2. If card ID looks like set-number format, try Pokemon.com pattern
  const parts = cardId.split('-');
  if (parts.length >= 2) {
    const setId = parts[0];
    const cardNumber = parts[parts.length - 1];
    return `${POKEMON_COM_IMAGES}/${setId.toUpperCase()}/${setId.toUpperCase()}_EN_${cardNumber}.png`;
  }
  
  return limitlessUrl;
};

/**
 * Get a list of cards
 */
export const getCards = async (page = 1, pageSize = 20): Promise<TCGDexCard[]> => {
  try {
    // TCGDex doesn't have pagination, so we'll fetch all and slice
    const response = await fetch(`${BASE_URL}/en/cards`);
    
    if (!response.ok) {
      console.error(`Failed to fetch cards: ${response.statusText}`);
      throw new Error(`Failed to fetch cards: ${response.statusText}`);
    }
    
    let cards = await response.json();
    
    // Check if it's an array or needs to be extracted
    if (!Array.isArray(cards) && cards.data && Array.isArray(cards.data)) {
      cards = cards.data;
    }
    
    // Handle pagination ourselves
    const startIndex = (page - 1) * pageSize;
    const paginatedCards = cards.slice(startIndex, startIndex + pageSize);
    
    // Process cards to ensure image URLs are valid
    return paginatedCards.map((card: TCGDexCard) => ({
      ...card,
      variants: {
        ...card.variants,
        normal: validateImageUrl(card.variants.normal, card.id),
        reverse: card.variants.reverse ? validateImageUrl(card.variants.reverse, card.id) : undefined,
        holo: card.variants.holo ? validateImageUrl(card.variants.holo, card.id) : undefined,
        firstEdition: card.variants.firstEdition ? validateImageUrl(card.variants.firstEdition, card.id) : undefined
      },
      set: {
        ...card.set,
        logo: validateImageUrl(card.set.logo),
        symbol: validateImageUrl(card.set.symbol)
      }
    }));
  } catch (error) {
    console.error('Error fetching TCGDex cards:', error);
    return [];
  }
};

/**
 * Get a single card by ID
 */
export const getCardById = async (id: string): Promise<TCGDexCard> => {
  try {
    const response = await fetch(`${BASE_URL}/en/cards/${id}`);
    
    if (!response.ok) {
      console.error(`Failed to fetch card: ${response.statusText}`);
      throw new Error(`Failed to fetch card: ${response.statusText}`);
    }
    
    const card = await response.json();
    
    // Validate image URLs
    return {
      ...card,
      variants: {
        ...card.variants,
        normal: validateImageUrl(card.variants.normal, card.id),
        reverse: card.variants.reverse ? validateImageUrl(card.variants.reverse, card.id) : undefined,
        holo: card.variants.holo ? validateImageUrl(card.variants.holo, card.id) : undefined,
        firstEdition: card.variants.firstEdition ? validateImageUrl(card.variants.firstEdition, card.id) : undefined
      },
      set: {
        ...card.set,
        logo: validateImageUrl(card.set.logo),
        symbol: validateImageUrl(card.set.symbol)
      }
    };
  } catch (error) {
    console.error('Error fetching TCGDex card by ID:', error);
    throw error;
  }
};

/**
 * Search cards by name
 */
export const searchCards = async (query: string): Promise<TCGDexCard[]> => {
  try {
    const response = await fetch(`${BASE_URL}/en/cards/search/${encodeURIComponent(query)}`);
    
    if (!response.ok) {
      console.error(`Failed to search cards: ${response.statusText}`);
      throw new Error(`Failed to search cards: ${response.statusText}`);
    }
    
    const data = await response.json();
    
    let cards: TCGDexCard[] = [];
    
    // Handle both array format and object format with data property
    if (Array.isArray(data)) {
      cards = data;
    } else if (data && data.data && Array.isArray(data.data)) {
      cards = data.data;
    }
    
    // Validate and process image URLs for all cards
    return cards.map((card: TCGDexCard) => ({
      ...card,
      variants: {
        ...card.variants,
        normal: validateImageUrl(card.variants.normal, card.id),
        reverse: card.variants.reverse ? validateImageUrl(card.variants.reverse, card.id) : undefined,
        holo: card.variants.holo ? validateImageUrl(card.variants.holo, card.id) : undefined,
        firstEdition: card.variants.firstEdition ? validateImageUrl(card.variants.firstEdition, card.id) : undefined
      },
      set: {
        ...card.set,
        logo: validateImageUrl(card.set.logo),
        symbol: validateImageUrl(card.set.symbol)
      }
    }));
  } catch (error) {
    console.error('Error searching TCGDex cards:', error);
    return [];
  }
};

/**
 * Get all sets
 */
export const getSets = async (): Promise<any[]> => {
  try {
    const response = await fetch(`${BASE_URL}/en/sets`);
    
    if (!response.ok) {
      console.error(`Failed to fetch sets: ${response.statusText}`);
      throw new Error(`Failed to fetch sets: ${response.statusText}`);
    }
    
    const sets = await response.json();
    
    // Validate set image URLs
    return sets.map((set: any) => ({
      ...set,
      logo: validateImageUrl(set.logo),
      symbol: validateImageUrl(set.symbol)
    }));
  } catch (error) {
    console.error('Error fetching TCGDex sets:', error);
    return [];
  }
};

/**
 * Map TCGDex card to TradeCard model
 */
export const mapToTradeCard = (card: TCGDexCard): import("@/models/escrow").TradeCard => {
  return {
    id: card.id,
    name: card.name.en,
    imageUrl: validateImageUrl(card.variants.normal, card.id),
    condition: "Near Mint", // Default condition
    estimatedValue: 0, // TCGDex doesn't provide prices
    currency: "USD"
  };
};
