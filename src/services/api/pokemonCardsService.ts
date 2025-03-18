
// Service for fetching and managing Pokemon cards
import { PokemonCard, PokemonCardResponse, CARD_BACK_URL } from './pokemonTypes';
import { BASE_URL, createApiUrl } from './pokemonApiConfig';
import { getAllPossibleImageUrlsFromCardObject } from './cardImageService';

/**
 * Get cards with optional filtering
 */
export const getCards = async (
  page = 1, 
  pageSize = 20, 
  params: Record<string, string> = {}
): Promise<PokemonCardResponse> => {
  try {
    // Build query parameters
    const queryParams = {
      page: page.toString(),
      pageSize: pageSize.toString(),
      ...params
    };
    
    const url = createApiUrl('cards', queryParams);
    
    console.log('Fetching cards with URL:', url.toString());
    const response = await fetch(url.toString());
    
    if (!response.ok) {
      console.error(`Failed to fetch cards: ${response.statusText}`);
      throw new Error(`Failed to fetch cards: ${response.statusText}`);
    }
    
    const data = await response.json();
    console.log(`Successfully fetched ${data.data?.length || 0} cards`);
    
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
  if (!id) {
    throw new Error('Card ID is required');
  }
  
  try {
    console.log(`Fetching card with ID: ${id}`);
    const response = await fetch(`${BASE_URL}/cards/${id}`);
    
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
 * Build a query string from search parameters
 */
export const buildQueryString = (params: Record<string, string>): string => {
  const queryParts: string[] = [];
  
  Object.entries(params).forEach(([key, value]) => {
    if (value) {
      // For set ID use the format set.id:
      if (key === 'setId') {
        queryParts.push(`set.id:${value}`);
      } 
      // For name use the format name: with wildcards
      else if (key === 'name') {
        queryParts.push(`name:*${value}*`);
      }
      // Other filters can be added here
    }
  });
  
  return queryParts.join(' ');
};

/**
 * Search cards with search parameters
 */
export const searchCards = async (
  queryString: string | Record<string, string>, 
  page = 1, 
  pageSize = 20
): Promise<PokemonCardResponse> => {
  // Convert string query to params object if needed
  let params: Record<string, string> = {};
  
  if (typeof queryString === 'string') {
    // If it's a string query, use it directly as the 'q' parameter
    if (queryString.trim()) {
      params.q = queryString;
    }
  } else {
    // If it's already an object, use buildQueryString to process it
    const builtQuery = buildQueryString(queryString);
    if (builtQuery) {
      params.q = builtQuery;
    }
  }
  
  console.log(`Searching cards with params:`, params);
  return getCards(page, pageSize, params);
};

/**
 * Get cards by set ID
 */
export const getCardsBySetId = async (
  setId: string, 
  page = 1, 
  pageSize = 20
): Promise<PokemonCardResponse> => {
  if (!setId) {
    return getCards(page, pageSize);
  }
  
  console.log(`Getting cards for set ID: ${setId}`);
  return searchCards({ setId }, page, pageSize);
};

/**
 * Generate a reliable image URL for a Pokemon card
 */
export const getReliableImageUrl = (cardId: string, size: 'small' | 'large' = 'small'): string => {
  if (!cardId) {
    return CARD_BACK_URL;
  }
  
  // The most reliable source is the official Pokemon TCG API image server
  return `https://images.pokemontcg.io/${size}/${cardId}.png`;
};

/**
 * Map Pokemon TCG card to TradeCard model
 */
export const mapToTradeCard = (card: PokemonCard): any => {
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
