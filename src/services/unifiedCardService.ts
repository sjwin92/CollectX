// Unified card service that abstracts Pokemon TCG API and provides fallbacks
import { 
  getCardById as pokemonGetCardById,
  searchCards as pokemonSearchCards,
  getCards as pokemonGetCards,
  mapToTradeCard as pokemonMapToTradeCard
} from './api/pokemonCardsService';
import { 
  PokemonCard, 
  PokemonCardResponse 
} from './api/pokemonTypes';
import { TradeCard } from '@/models/trade';
import { 
  convertTcgdxToPokemonTcg,
  convertPokemonTcgToTcgdx,
  parseCardId,
  isValidCardId
} from './cardIdMappingService';

export interface UnifiedCard extends PokemonCard {
  // Additional fields that might come from other APIs
  alternativeIds?: string[];
  source: 'pokemon-tcg' | 'tcgdx' | 'cache';
}

export interface UnifiedCardResponse extends PokemonCardResponse {
  data: UnifiedCard[];
}

/**
 * Get card by ID with automatic format conversion and fallbacks
 */
export const getCardById = async (cardId: string): Promise<UnifiedCard | null> => {
  if (!cardId || !isValidCardId(cardId)) {
    console.warn(`Invalid card ID format: ${cardId}`);
    return null;
  }

  try {
    // First try with the original ID
    console.log(`Fetching card with ID: ${cardId}`);
    let pokemonCard = await pokemonGetCardById(cardId);
    
    if (pokemonCard) {
      return {
        ...pokemonCard,
        alternativeIds: [convertPokemonTcgToTcgdx(cardId)],
        source: 'pokemon-tcg'
      };
    }

    // If that fails, try converting from TCGDx format to Pokemon TCG format
    const convertedId = convertTcgdxToPokemonTcg(cardId);
    if (convertedId !== cardId) {
      console.log(`Trying converted ID: ${convertedId}`);
      pokemonCard = await pokemonGetCardById(convertedId);
      
      if (pokemonCard) {
        return {
          ...pokemonCard,
          alternativeIds: [cardId, convertedId],
          source: 'pokemon-tcg'
        };
      }
    }

    // If still no results, try alternative formats
    const { setId, number } = parseCardId(cardId);
    const alternativeFormats = [
      `${setId}-${number}`,
      `${setId.toLowerCase()}-${number}`,
      `${setId.toUpperCase()}-${number}`,
      `${setId}${number}` // No dash format
    ];

    for (const altFormat of alternativeFormats) {
      if (altFormat !== cardId && altFormat !== convertedId) {
        try {
          console.log(`Trying alternative format: ${altFormat}`);
          pokemonCard = await pokemonGetCardById(altFormat);
          if (pokemonCard) {
            return {
              ...pokemonCard,
              alternativeIds: [cardId, altFormat],
              source: 'pokemon-tcg'
            };
          }
        } catch (error) {
          // Continue to next format
          console.log(`Alternative format ${altFormat} failed:`, error);
        }
      }
    }

    console.warn(`Card not found with any ID format for: ${cardId}`);
    return null;

  } catch (error) {
    console.error(`Error fetching card ${cardId}:`, error);
    return null;
  }
};

/**
 * Search cards with unified response
 */
export const searchCards = async (
  queryParams: string | Record<string, string>,
  page = 1,
  pageSize = 20
): Promise<UnifiedCardResponse> => {
  try {
    const response = await pokemonSearchCards(queryParams, page, pageSize);
    
    return {
      ...response,
      data: response.data.map(card => ({
        ...card,
        source: 'pokemon-tcg' as const
      }))
    };
  } catch (error) {
    console.error('Error in unified search:', error);
    return {
      data: [],
      page,
      pageSize,
      count: 0,
      totalCount: 0
    };
  }
};

/**
 * Search cards by name with fallbacks
 */
export const searchCardsByName = async (name: string): Promise<UnifiedCard[]> => {
  if (!name.trim()) {
    return [];
  }

  try {
    const response = await searchCards({ name: name.trim() });
    return response.data;
  } catch (error) {
    console.error('Error searching cards by name:', error);
    return [];
  }
};

/**
 * Get cards with pagination
 */
export const getCards = async (page = 1, pageSize = 20): Promise<UnifiedCardResponse> => {
  try {
    const response = await pokemonGetCards(page, pageSize);
    
    return {
      ...response,
      data: response.data.map(card => ({
        ...card,
        source: 'pokemon-tcg' as const
      }))
    };
  } catch (error) {
    console.error('Error in unified getCards:', error);
    return {
      data: [],
      page,
      pageSize,
      count: 0,
      totalCount: 0
    };
  }
};

/**
 * Map any card format to TradeCard
 */
export const mapToTradeCard = (card: UnifiedCard | PokemonCard | null): TradeCard => {
  if (!card) {
    return {
      id: 'unknown',
      name: 'Unknown Card',
      imageUrl: 'https://archives.bulbagarden.net/media/upload/1/17/Cardback.jpg',
      condition: 'Near Mint',
      estimatedValue: 0,
      currency: 'USD'
    };
  }

  // Use the existing Pokemon TCG mapping function
  return pokemonMapToTradeCard(card);
};

/**
 * Batch fetch multiple cards by IDs
 */
export const getCardsByIds = async (cardIds: string[]): Promise<(UnifiedCard | null)[]> => {
  const promises = cardIds.map(id => getCardById(id));
  return Promise.all(promises);
};

/**
 * Check if a card exists without fetching full data
 */
export const cardExists = async (cardId: string): Promise<boolean> => {
  try {
    const card = await getCardById(cardId);
    return card !== null;
  } catch (error) {
    return false;
  }
};

// Note: Types are already exported above with the interface declarations