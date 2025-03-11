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

const BASE_URL = 'https://api.pokemontcg.io/v2';
const API_KEY = '3329f6d3-cb49-4b09-9997-2ee636a023e4';
const POKEMON_TCG_IO = 'https://images.pokemontcg.io';
const CARD_BACK_URL = 'https://archives.bulbagarden.net/media/upload/1/17/Cardback.jpg';

/**
 * Get cards with optional filtering
 */
export const getCards = async (page = 1, pageSize = 20, query = ''): Promise<PokemonCardResponse> => {
  const url = new URL(`${BASE_URL}/cards`);
  url.searchParams.append('page', page.toString());
  url.searchParams.append('pageSize', pageSize.toString());
  
  if (query) {
    if (!query.includes(':')) {
      url.searchParams.append('q', `name:"${query}"*`);
    } else {
      url.searchParams.append('q', query);
    }
  }
  
  try {
    console.log('Fetching cards with URL:', url.toString());
    const response = await fetch(url.toString(), {
      headers: {
        'X-Api-Key': API_KEY
      }
    });
    
    if (!response.ok) {
      console.error(`Failed to fetch cards: ${response.statusText}`);
      throw new Error(`Failed to fetch cards: ${response.statusText}`);
    }
    
    const data = await response.json();
    console.log(`Successfully fetched ${data.data?.length || 0} cards`);
    
    return data;
  } catch (error) {
    console.error('Error fetching Pokemon cards:', error);
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
    const response = await fetch(`${BASE_URL}/cards/${id}`, {
      headers: {
        'X-Api-Key': API_KEY
      }
    });
    
    if (!response.ok) {
      console.error(`Failed to fetch card: ${response.statusText}`);
      throw new Error(`Failed to fetch card: ${response.statusText}`);
    }
    
    const data = await response.json();
    console.log(`Successfully fetched card: ${data.data?.name || 'Unknown'}`);
    
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
  console.log(`Searching cards with query: "${query}"`);
  
  if (query && !query.includes(':')) {
    query = `name:"${query}"*`;
  }
  
  return getCards(page, pageSize, query);
};

/**
 * Generate a reliable image URL for a Pokemon card
 * @deprecated Use cardImageService.findWorkingImageUrl instead
 */
export const getReliableImageUrl = (cardId: string, size: 'small' | 'large' = 'small'): string => {
  if (!cardId) {
    return CARD_BACK_URL;
  }
  
  import('./cardImageService').then(cardImageService => {
    console.warn('getReliableImageUrl is deprecated. Use cardImageService.findWorkingImageUrl instead');
    cardImageService.findWorkingImageUrl({ id: cardId });
  });
  
  return `${POKEMON_TCG_IO}/${size}/${cardId}.png`;
};

/**
 * Get all possible image URLs for a card
 * @deprecated Use cardImageService.getImageUrlsForCard instead
 */
export const getAllPossibleImageUrls = (card: PokemonCard): string[] => {
  if (!card || !card.id) {
    return [CARD_BACK_URL];
  }
  
  return [
    card.images?.small,
    card.images?.large,
    `${POKEMON_TCG_IO}/small/${card.id}.png`,
    `${POKEMON_TCG_IO}/large/${card.id}.png`,
    CARD_BACK_URL
  ].filter(url => !!url && isValidUrl(url));
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
  
  import('./cardImageService').then(async cardImageService => {
    try {
      await cardImageService.findWorkingImageUrl({ 
        id: card.id, 
        name: card.name, 
        imageUrl: card.images.small 
      });
    } catch (e) {
      // Ignore errors in this warning code
    }
  });
  
  return {
    id: card.id,
    name: card.name,
    imageUrl: card.images.small || `${POKEMON_TCG_IO}/small/${card.id}.png`,
    condition: "Near Mint",
    estimatedValue: price,
    currency: "USD"
  };
};
