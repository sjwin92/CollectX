
export interface PokemonCard {
  id: string;
  name: string;
  supertype: string;
  subtypes: string[];
  hp?: string;
  types?: string[];
  evolves_from?: string;
  attacks?: {
    name: string;
    cost: string[];
    convertedEnergyCost: number;
    damage: string;
    text: string;
  }[];
  weaknesses?: {
    type: string;
    value: string;
  }[];
  resistances?: {
    type: string;
    value: string;
  }[];
  retreat_cost?: string[];
  convertedRetreatCost?: number;
  set: {
    id: string;
    name: string;
    series: string;
    printedTotal: number;
    total: number;
    legalities: Record<string, string>;
    ptcgoCode: string;
    releaseDate: string;
    updatedAt: string;
    images: {
      symbol: string;
      logo: string;
    };
  };
  number: string;
  artist: string;
  rarity: string;
  legalities: Record<string, string>;
  images: {
    small: string;
    large: string;
  };
  tcgplayer?: {
    url: string;
    updatedAt: string;
    prices: Record<string, {
      low: number;
      mid: number;
      high: number;
      market: number;
      directLow: number;
    }>;
  };
}

export interface PokemonCardResponse {
  data: PokemonCard[];
  page: number;
  pageSize: number;
  count: number;
  totalCount: number;
}

/**
 * Pokemon TCG API client
 * Using the official Pokemon TCG API: https://pokemontcg.io/
 */
const BASE_URL = 'https://api.pokemontcg.io/v2';
const API_KEY = ''; // You can obtain an API key from https://dev.pokemontcg.io/

/**
 * Get cards with optional filtering
 */
export const getCards = async (page = 1, pageSize = 20, query = ''): Promise<PokemonCardResponse> => {
  const url = new URL(`${BASE_URL}/cards`);
  url.searchParams.append('page', page.toString());
  url.searchParams.append('pageSize', pageSize.toString());
  
  if (query) {
    url.searchParams.append('q', query);
  }
  
  const headers: HeadersInit = {};
  if (API_KEY) {
    headers['X-Api-Key'] = API_KEY;
  }
  
  try {
    const response = await fetch(url.toString(), { headers });
    
    if (!response.ok) {
      console.error(`Failed to fetch cards: ${response.statusText}`);
      throw new Error(`Failed to fetch cards: ${response.statusText}`);
    }
    
    return await response.json();
  } catch (error) {
    console.error('Error fetching Pokemon cards:', error);
    // Return empty response structure in case of error
    return {
      data: [],
      page: page,
      pageSize: pageSize,
      count: 0,
      totalCount: 0
    };
  }
};

/**
 * Get card by ID
 */
export const getCardById = async (id: string): Promise<PokemonCard> => {
  const headers: HeadersInit = {};
  if (API_KEY) {
    headers['X-Api-Key'] = API_KEY;
  }
  
  try {
    const response = await fetch(`${BASE_URL}/cards/${id}`, { headers });
    
    if (!response.ok) {
      console.error(`Failed to fetch card: ${response.statusText}`);
      throw new Error(`Failed to fetch card: ${response.statusText}`);
    }
    
    const data = await response.json();
    return data.data;
  } catch (error) {
    console.error('Error fetching Pokemon card by ID:', error);
    throw error;
  }
};

/**
 * Get sets
 */
export const getSets = async (): Promise<any> => {
  const headers: HeadersInit = {};
  if (API_KEY) {
    headers['X-Api-Key'] = API_KEY;
  }
  
  try {
    const response = await fetch(`${BASE_URL}/sets`, { headers });
    
    if (!response.ok) {
      console.error(`Failed to fetch sets: ${response.statusText}`);
      throw new Error(`Failed to fetch sets: ${response.statusText}`);
    }
    
    return await response.json();
  } catch (error) {
    console.error('Error fetching Pokemon sets:', error);
    throw error;
  }
};

/**
 * Search cards with a query string
 */
export const searchCards = async (query: string, page = 1, pageSize = 20): Promise<PokemonCardResponse> => {
  return getCards(page, pageSize, query);
};

/**
 * Validate image URL - if it's not valid or doesn't exist, attempt to use alternate sources
 */
export const getValidImageUrl = (card: PokemonCard): string => {
  if (!card || !card.images) {
    return '';
  }
  
  // First try small image
  if (card.images.small) {
    return card.images.small;
  }
  
  // Then try large image
  if (card.images.large) {
    return card.images.large;
  }
  
  // Fall back to a default image based on the set if possible
  if (card.set && card.set.images && card.set.images.logo) {
    return card.set.images.logo;
  }
  
  // Last resort - use a generic Pokemon card back
  return 'https://assets.pokemon.com/assets/cms2/img/cards/web/SV12/SV12_EN_1.png';
};

/**
 * Map Pokemon TCG card to TradeCard model
 */
export const mapToTradeCard = (card: PokemonCard): import("@/models/escrow").TradeCard => {
  const price = card.tcgplayer?.prices?.holofoil?.market 
    || card.tcgplayer?.prices?.normal?.market 
    || card.tcgplayer?.prices?.reverseHolofoil?.market
    || 0;
  
  return {
    id: card.id,
    name: card.name,
    imageUrl: getValidImageUrl(card),
    condition: "Near Mint", // Default condition, would be user-specified in real app
    estimatedValue: price,
    currency: "USD"
  };
};
