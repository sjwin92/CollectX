
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
 * Get a list of cards
 */
export const getCards = async (page = 1, pageSize = 20): Promise<TCGDexCard[]> => {
  const response = await fetch(`${BASE_URL}/en/cards?page=${page}&pageSize=${pageSize}`);
  
  if (!response.ok) {
    throw new Error(`Failed to fetch cards: ${response.statusText}`);
  }
  
  return await response.json();
};

/**
 * Get a single card by ID
 */
export const getCardById = async (id: string): Promise<TCGDexCard> => {
  const response = await fetch(`${BASE_URL}/en/cards/${id}`);
  
  if (!response.ok) {
    throw new Error(`Failed to fetch card: ${response.statusText}`);
  }
  
  return await response.json();
};

/**
 * Search cards by name
 * Note: TCGDex search results are an array of cards, not an object with data property
 */
export const searchCards = async (query: string): Promise<TCGDexCard[]> => {
  // TCGDex search endpoint is different - it returns an array directly
  const response = await fetch(`${BASE_URL}/en/cards/search/${encodeURIComponent(query)}`);
  
  if (!response.ok) {
    throw new Error(`Failed to search cards: ${response.statusText}`);
  }
  
  const data = await response.json();
  
  // Handle both array format and object format with data property
  if (Array.isArray(data)) {
    return data;
  } else if (data && data.data && Array.isArray(data.data)) {
    return data.data;
  }
  
  // If neither format matches, return empty array
  return [];
};

/**
 * Get all sets
 */
export const getSets = async (): Promise<any[]> => {
  const response = await fetch(`${BASE_URL}/en/sets`);
  
  if (!response.ok) {
    throw new Error(`Failed to fetch sets: ${response.statusText}`);
  }
  
  return await response.json();
};

/**
 * Map TCGDex card to TradeCard model
 */
export const mapToTradeCard = (card: TCGDexCard): import("@/models/escrow").TradeCard => {
  return {
    id: card.id,
    name: card.name.en,
    imageUrl: card.variants.normal,
    condition: "Near Mint", // Default condition
    estimatedValue: 0, // TCGDex doesn't provide prices
    currency: "USD"
  };
};
