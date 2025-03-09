
const BASE_URL = 'https://api.tcgdex.net/v2';

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
 * Validates image URLs to ensure they're properly formatted
 * @param url The image URL to validate
 * @returns Validated URL or a placeholder if invalid
 */
const validateImageUrl = (url: string | undefined): string => {
  if (!url) return '/placeholder.svg';
  
  // Check if the URL is valid format
  try {
    new URL(url);
    return url;
  } catch (e) {
    console.warn('Invalid image URL detected:', url);
    return '/placeholder.svg';
  }
};

/**
 * Get a list of cards
 */
export const getCards = async (page = 1, pageSize = 20): Promise<TCGDexCard[]> => {
  try {
    const response = await fetch(`${BASE_URL}/en/cards?page=${page}&pageSize=${pageSize}`);
    
    if (!response.ok) {
      console.error(`Failed to fetch cards: ${response.statusText}`);
      throw new Error(`Failed to fetch cards: ${response.statusText}`);
    }
    
    const cards = await response.json();
    
    // Process cards to ensure image URLs are valid
    return cards.map((card: TCGDexCard) => ({
      ...card,
      variants: {
        ...card.variants,
        normal: validateImageUrl(card.variants.normal),
        reverse: card.variants.reverse ? validateImageUrl(card.variants.reverse) : undefined,
        holo: card.variants.holo ? validateImageUrl(card.variants.holo) : undefined,
        firstEdition: card.variants.firstEdition ? validateImageUrl(card.variants.firstEdition) : undefined
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
      throw new Error(`Failed to fetch card: ${response.statusText}`);
    }
    
    const card = await response.json();
    
    // Validate image URLs
    return {
      ...card,
      variants: {
        ...card.variants,
        normal: validateImageUrl(card.variants.normal),
        reverse: card.variants.reverse ? validateImageUrl(card.variants.reverse) : undefined,
        holo: card.variants.holo ? validateImageUrl(card.variants.holo) : undefined,
        firstEdition: card.variants.firstEdition ? validateImageUrl(card.variants.firstEdition) : undefined
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
 * Note: TCGDex search results are an array of cards, not an object with data property
 */
export const searchCards = async (query: string): Promise<TCGDexCard[]> => {
  try {
    // TCGDex search endpoint is different - it returns an array directly
    const response = await fetch(`${BASE_URL}/en/cards/search/${encodeURIComponent(query)}`);
    
    if (!response.ok) {
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
        normal: validateImageUrl(card.variants.normal),
        reverse: card.variants.reverse ? validateImageUrl(card.variants.reverse) : undefined,
        holo: card.variants.holo ? validateImageUrl(card.variants.holo) : undefined,
        firstEdition: card.variants.firstEdition ? validateImageUrl(card.variants.firstEdition) : undefined
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
    imageUrl: validateImageUrl(card.variants.normal),
    condition: "Near Mint", // Default condition
    estimatedValue: 0, // TCGDex doesn't provide prices
    currency: "USD"
  };
};
