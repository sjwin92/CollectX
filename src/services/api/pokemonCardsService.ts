
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
      // Ignore "all" value for setId as it means no filter
      if (key === 'setId' && value !== 'all') {
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
  queryParams: string | Record<string, string>, 
  page = 1, 
  pageSize = 20
): Promise<PokemonCardResponse> => {
  // Create a params object for the API call
  let params: Record<string, string> = { page: page.toString(), pageSize: pageSize.toString() };
  
  if (typeof queryParams === 'string') {
    // If it's a raw query string, use it directly as 'q' parameter
    if (queryParams.trim()) {
      params.q = queryParams;
    }
  } else {
    // If it's an object of search parameters, build a query string
    const builtQuery = buildQueryString(queryParams);
    if (builtQuery) {
      params.q = builtQuery;
    }
  }
  
  console.log(`Searching cards with final API params:`, params);
  
  try {
    const url = createApiUrl('cards', params);
    
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
    console.error('Error searching Pokemon cards:', error);
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
 * Get cards by set ID
 */
export const getCardsBySetId = async (
  setId: string, 
  page = 1, 
  pageSize = 20
): Promise<PokemonCardResponse> => {
  if (!setId || setId === 'all') {
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
