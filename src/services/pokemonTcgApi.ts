
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
 * Using the public Pokemon TCG API: https://pokemontcg.io/
 * No API key required for basic usage
 */
const BASE_URL = 'https://api.pokemontcg.io/v2';

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
  
  try {
    const response = await fetch(url.toString());
    
    if (!response.ok) {
      console.error(`Failed to fetch cards: ${response.statusText}`);
      throw new Error(`Failed to fetch cards: ${response.statusText}`);
    }
    
    const data = await response.json();
    
    // Enhance cards with validated image URLs
    if (data.data && Array.isArray(data.data)) {
      data.data = data.data.map(card => ({
        ...card,
        images: {
          small: getValidImageUrl(card),
          large: getValidImageUrl(card, true)
        }
      }));
    }
    
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
    const response = await fetch(`${BASE_URL}/cards/${id}`);
    
    if (!response.ok) {
      console.error(`Failed to fetch card: ${response.statusText}`);
      throw new Error(`Failed to fetch card: ${response.statusText}`);
    }
    
    const data = await response.json();
    
    // Enhance card with validated image URLs
    if (data.data) {
      data.data.images = {
        small: getValidImageUrl(data.data),
        large: getValidImageUrl(data.data, true)
      };
    }
    
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
  return getCards(page, pageSize, query);
};

/**
 * Generate reliable image URLs for Pokemon cards
 */
export const getValidImageUrl = (card: PokemonCard, large = false): string => {
  if (!card) {
    return '';
  }
  
  // Try official source first
  const originalUrl = large ? card.images?.large : card.images?.small;
  if (originalUrl) {
    return originalUrl;
  }
  
  // Try alternative sources based on card ID and set
  if (card.id) {
    // Try Limitless TCG (public API without key requirements)
    return `https://limitlesstcg.com/cards/en/${card.id.replace(/-/g, "/")}`;
  }
  
  // Try using set number if available
  if (card.set?.id && card.number) {
    return `https://images.pokemontcg.io/${card.set.id}/${card.number}.png`;
  }
  
  // Default fallback
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
