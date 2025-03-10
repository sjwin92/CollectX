
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

// Additional reliable image sources (all public, no API key needed)
const LIMITLESSTCG_URL = 'https://images.limitlesstcg.com/cards';
const POKELLECTOR_URL = 'https://assets.pokellector.com/cards';
const POKEMON_COM_URL = 'https://assets.pokemon.com/assets/cms2/img/cards/web';
const PKMN_CARDS_URL = 'https://images.pokemoncards.com';
const SEREBII_URL = 'https://www.serebii.net/card/';

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
          small: getReliableImageUrl(card, false),
          large: getReliableImageUrl(card, true)
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
    console.log(`Fetching card with ID: ${id}`);
    const response = await fetch(`${BASE_URL}/cards/${id}`);
    
    if (!response.ok) {
      console.error(`Failed to fetch card: ${response.statusText}`);
      throw new Error(`Failed to fetch card: ${response.statusText}`);
    }
    
    const data = await response.json();
    
    // Enhance card with validated image URLs
    if (data.data) {
      data.data.images = {
        small: getReliableImageUrl(data.data, false),
        large: getReliableImageUrl(data.data, true)
      };
    }
    
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
  return getCards(page, pageSize, query);
};

/**
 * Generate a more reliable image URL using multiple sources
 */
export const getReliableImageUrl = (card: PokemonCard, large = false): string => {
  if (!card) {
    return 'https://archives.bulbagarden.net/media/upload/1/17/Cardback.jpg';
  }
  
  const setId = card.set?.id?.toLowerCase();
  const cardNumber = card.number;
  
  if (!setId || !cardNumber) {
    return 'https://archives.bulbagarden.net/media/upload/1/17/Cardback.jpg';
  }
  
  // Create an array of potential URLs to try (in order of preference)
  const imageUrls = [];
  
  // Option 1: Original URL from API (if present and valid)
  const originalUrl = large ? card.images?.large : card.images?.small;
  if (originalUrl && isValidUrl(originalUrl)) {
    imageUrls.push(originalUrl);
  }
  
  // Option 2: LimitlessTCG (very reliable source)
  imageUrls.push(`${LIMITLESSTCG_URL}/${setId}/${cardNumber}.jpg`);
  
  // Option 3: Pokellector
  const paddedNumber = cardNumber.padStart(3, '0');
  imageUrls.push(`${POKELLECTOR_URL}/${setId}/${paddedNumber}.webp`);
  imageUrls.push(`${POKELLECTOR_URL}/${setId}/${cardNumber}.webp`);
  
  // Option 4: Pokemon.com official images
  imageUrls.push(`${POKEMON_COM_URL}/${setId.toUpperCase()}/${setId.toUpperCase()}_EN_${cardNumber}.png`);
  
  // Option 5: PokemonCards.com
  imageUrls.push(`${PKMN_CARDS_URL}/${setId}/${cardNumber}.jpg`);
  
  // Option 6: Serebii
  const setNameParts = card.set?.name?.toLowerCase().split(/\s+/) || [];
  const setURLPart = setNameParts.join('');
  imageUrls.push(`${SEREBII_URL}${setURLPart}/${cardNumber}.jpg`);
  
  // Return the array of potential URLs to try
  return imageUrls[0]; // For now, just return the first URL
};

/**
 * Get a list of all potential image URLs for a card
 */
export const getAllPossibleImageUrls = (card: PokemonCard): string[] => {
  if (!card || !card.set?.id || !card.number) {
    return ['https://archives.bulbagarden.net/media/upload/1/17/Cardback.jpg'];
  }
  
  const setId = card.set.id.toLowerCase();
  const cardNumber = card.number;
  const paddedNumber = cardNumber.padStart(3, '0');
  const setNameParts = card.set.name.toLowerCase().split(/\s+/);
  const setURLPart = setNameParts.join('');
  
  // Create an array of potential URLs to try (in order of preference)
  return [
    card.images?.large,
    card.images?.small,
    `${LIMITLESSTCG_URL}/${setId}/${cardNumber}.jpg`,
    `${POKELLECTOR_URL}/${setId}/${paddedNumber}.webp`,
    `${POKELLECTOR_URL}/${setId}/${cardNumber}.webp`,
    `${POKEMON_COM_URL}/${setId.toUpperCase()}/${setId.toUpperCase()}_EN_${cardNumber}.png`,
    `${PKMN_CARDS_URL}/${setId}/${cardNumber}.jpg`,
    `${SEREBII_URL}${setURLPart}/${cardNumber}.jpg`,
    'https://archives.bulbagarden.net/media/upload/1/17/Cardback.jpg' // Final fallback
  ].filter(url => !!url); // Filter out any undefined URLs
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
    imageUrl: getReliableImageUrl(card),
    condition: "Near Mint", // Default condition, would be user-specified in real app
    estimatedValue: price,
    currency: "USD"
  };
};
