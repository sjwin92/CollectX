
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

// Using multiple reliable sources that don't require API keys
const BASE_URL = 'https://api.pokemontcg.io/v2';

// These are the most reliable image sources for Pokemon cards
const POKEMON_TCG_IO = 'https://images.pokemontcg.io';
const CARD_BACK_URL = 'https://play.pokemoncarddeck.com/Content/pokemon-back-mini.png';

/**
 * Get cards with optional filtering
 */
export const getCards = async (page = 1, pageSize = 20, query = ''): Promise<PokemonCardResponse> => {
  const url = new URL(`${BASE_URL}/cards`);
  url.searchParams.append('page', page.toString());
  url.searchParams.append('pageSize', pageSize.toString());
  
  if (query) {
    // If the query doesn't already have a specific filter like "name:",
    // we'll add it to ensure better search results
    if (!query.includes(':')) {
      // Use partial match with wildcards instead of exact match
      url.searchParams.append('q', `name:${query}*`);
    } else {
      url.searchParams.append('q', query);
    }
  }
  
  try {
    const response = await fetch(url.toString());
    
    if (!response.ok) {
      console.error(`Failed to fetch cards: ${response.statusText}`);
      throw new Error(`Failed to fetch cards: ${response.statusText}`);
    }
    
    const data = await response.json();
    
    // Preserve the original image URLs from the API response
    return data;
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
  try {
    console.log(`Fetching card with ID: ${id}`);
    const response = await fetch(`${BASE_URL}/cards/${id}`);
    
    if (!response.ok) {
      console.error(`Failed to fetch card: ${response.statusText}`);
      throw new Error(`Failed to fetch card: ${response.statusText}`);
    }
    
    const data = await response.json();
    console.log(`Successfully fetched card: ${data.data?.name || 'Unknown'}`);
    
    // Return the data as-is without modifying image URLs
    return data.data;
  } catch (error) {
    console.error('Error fetching Pokemon card by ID:', error);
    throw error;
  }
};

/**
 * Search cards with a query string
 */
export const searchCards = async (query: string, page = 1, pageSize = 20): Promise<PokemonCardResponse> => {
  // If the query is simple (no advanced search operators), format it for better results
  if (query && !query.includes(':')) {
    query = `name:${query}*`; // Use wildcards for partial matching
  }
  return getCards(page, pageSize, query);
};

/**
 * Generate a reliable image URL for a Pokemon card
 */
export const getReliableImageUrl = (cardId: string, size: 'small' | 'large' = 'small'): string => {
  if (!cardId) {
    return CARD_BACK_URL;
  }
  
  // The most reliable source is the official Pokemon TCG API image server
  return `${POKEMON_TCG_IO}/${size}/${cardId}.png`;
};

/**
 * Get all possible image URLs for a card
 */
export const getAllPossibleImageUrls = (card: PokemonCard): string[] => {
  if (!card || !card.id) {
    return [CARD_BACK_URL];
  }
  
  // Return an array of URLs to try in sequence
  return [
    // Original API URLs if present - try these first
    card.images?.small,
    card.images?.large,
    // Our generated URLs as fallbacks
    `${POKEMON_TCG_IO}/small/${card.id}.png`,
    `${POKEMON_TCG_IO}/large/${card.id}.png`,
    // Last resort
    CARD_BACK_URL
  ].filter(url => !!url && isValidUrl(url)); // Filter out any undefined or invalid URLs
};

/**
 * Check if a URL is valid format
 */
const isValidUrl = (url: string): boolean => {
  try {
    new URL(url);
    return true;
  } catch {
    return false;
  }
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
    imageUrl: card.images.small || getReliableImageUrl(card.id),
    condition: "Near Mint", // Default condition, would be user-specified in real app
    estimatedValue: price,
    currency: "USD"
  };
};
