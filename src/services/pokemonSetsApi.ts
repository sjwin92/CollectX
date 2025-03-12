export interface PokemonSet {
  id: string;
  name: string;
  series: string;
  printedTotal: number;
  total: number;
  releaseDate: string;
  images: {
    symbol: string;
    logo: string;
  };
  legalities: {
    standard?: string;
    expanded?: string;
    unlimited?: string;
  };
}

export interface PokemonSetResponse {
  data: PokemonSet[];
  page: number;
  pageSize: number;
  count: number;
  totalCount: number;
}

// Cache for storing fetched sets to avoid duplicate requests
let setsCache: PokemonSet[] = [];
let lastFetchTime = 0;
const CACHE_DURATION = 60 * 60 * 1000; // 1 hour in milliseconds

const BASE_URL = 'https://api.pokemontcg.io/v2';

export const getSets = async (page = 1, pageSize = 20): Promise<PokemonSetResponse> => {
  const url = new URL(`${BASE_URL}/sets`);
  url.searchParams.append('page', page.toString());
  url.searchParams.append('pageSize', pageSize.toString());
  url.searchParams.append('orderBy', '-releaseDate'); // Latest sets first
  
  try {
    console.log('Fetching sets with URL:', url.toString());
    const response = await fetch(url.toString());
    
    if (!response.ok) {
      throw new Error(`Failed to fetch sets: ${response.statusText}`);
    }
    
    const data = await response.json();
    console.log(`Successfully fetched ${data.data?.length || 0} sets`);
    
    // Update cache with the fetched sets
    if (data.data && data.data.length > 0) {
      // Add only sets that aren't already in the cache
      const newSets = data.data.filter(
        (set: PokemonSet) => !setsCache.some(cachedSet => cachedSet.id === set.id)
      );
      
      if (newSets.length > 0) {
        setsCache = [...setsCache, ...newSets];
        lastFetchTime = Date.now();
      }
    }
    
    return data;
  } catch (error) {
    console.error('Error fetching Pokemon sets:', error);
    return {
      data: [],
      page,
      pageSize,
      count: 0,
      totalCount: 0
    };
  }
};

// Fetch all sets at once for reference purposes
export const getAllSets = async (): Promise<PokemonSet[]> => {
  // Check if cache is valid
  const now = Date.now();
  if (setsCache.length > 0 && now - lastFetchTime < CACHE_DURATION) {
    console.log('Using cached sets data');
    return setsCache;
  }
  
  // If cache is empty or expired, fetch all sets
  console.log('Fetching all sets for reference...');
  
  try {
    const url = new URL(`${BASE_URL}/sets`);
    url.searchParams.append('pageSize', '250'); // Fetch a large number to get all sets
    url.searchParams.append('orderBy', '-releaseDate');
    
    const response = await fetch(url.toString());
    
    if (!response.ok) {
      throw new Error(`Failed to fetch all sets: ${response.statusText}`);
    }
    
    const data = await response.json();
    console.log(`Successfully fetched all ${data.data?.length || 0} sets`);
    
    // Update cache
    setsCache = data.data || [];
    lastFetchTime = now;
    
    return setsCache;
  } catch (error) {
    console.error('Error fetching all Pokemon sets:', error);
    return [];
  }
};

// Helper function to get a specific set by ID
export const getSetById = async (setId: string): Promise<PokemonSet | null> => {
  // Check cache first
  const cachedSet = setsCache.find(set => set.id === setId);
  if (cachedSet) {
    return cachedSet;
  }
  
  // If not in cache, fetch from API
  try {
    const response = await fetch(`${BASE_URL}/sets/${setId}`);
    
    if (!response.ok) {
      throw new Error(`Failed to fetch set with ID ${setId}: ${response.statusText}`);
    }
    
    const data = await response.json();
    
    // Add to cache
    if (data && data.data) {
      setsCache = [...setsCache, data.data];
      lastFetchTime = Date.now();
      return data.data;
    }
    
    return null;
  } catch (error) {
    console.error(`Error fetching set with ID ${setId}:`, error);
    return null;
  }
};

// Normalize a card ID to ensure consistent format
export const normalizeCardId = (cardId: string): string => {
  // Some IDs come in different formats, this normalizes them
  return cardId.trim().toLowerCase();
};

// Get the proper set information for a card based on its ID
export const getSetInfoForCard = async (cardId: string): Promise<PokemonSet | null> => {
  const normalizedId = normalizeCardId(cardId);
  
  // Extract set ID from card ID (usually format is setId-cardNumber)
  const setId = normalizedId.split('-')[0];
  
  if (!setId) {
    console.error(`Could not extract set ID from card ID: ${cardId}`);
    return null;
  }
  
  return await getSetById(setId);
};

// Get the proper card image URL based on set information
export const getConsistentCardImageUrl = (cardId: string, size: 'small' | 'large' = 'large'): string => {
  const normalizedId = normalizeCardId(cardId);
  
  // The official Pokemon TCG API format
  return `https://images.pokemontcg.io/${size}/${normalizedId}.png`;
};

// Get all possible image URLs for a card (for fallback purposes)
export const getAllPossibleCardImageUrls = (cardId: string): string[] => {
  if (!cardId) {
    return ["https://archives.bulbagarden.net/media/upload/1/17/Cardback.jpg"];
  }
  
  const normalizedId = cardId.trim().toLowerCase();
  
  // If there's no hyphen, it might not be in the standard format
  if (!normalizedId.includes('-')) {
    return [
      `https://images.pokemontcg.io/large/${normalizedId}.png`,
      `https://images.pokemontcg.io/small/${normalizedId}.png`,
      "https://archives.bulbagarden.net/media/upload/1/17/Cardback.jpg"
    ];
  }
  
  const setId = normalizedId.split('-')[0];
  const cardNumber = normalizedId.split('-')[1];
  
  // Order these URLs from most reliable to least reliable
  return [
    // Primary source - Pokemon TCG API
    `https://images.pokemontcg.io/large/${normalizedId}.png`,
    `https://images.pokemontcg.io/small/${normalizedId}.png`,
    
    // Alternative format with set ID
    `https://images.pokemontcg.io/${setId}/${cardNumber}_hires.png`,
    `https://images.pokemontcg.io/${setId}/${cardNumber}.png`,
    
    // TCGDex format
    `https://assets.tcgdex.net/en/cards/${setId}/${cardNumber}`,
    `https://assets.tcgdex.net/en/cards/${setId}/${cardNumber}.jpg`,
    `https://assets.tcgdex.net/en/cards/${setId}/${cardNumber}.png`,
    
    // Another TCGDex format
    `https://assets.tcgdex.net/en/${setId}/${cardNumber}`,
    `https://assets.tcgdex.net/en/${setId}/${cardNumber}.jpg`,
    `https://assets.tcgdex.net/en/${setId}/${cardNumber}.png`,
    
    // Pokellector format (with padding to ensure 3 digits)
    `https://assets.pokellector.com/cards/${setId}/${cardNumber.padStart(3, '0')}.webp`,
    
    // Pokemon.com format
    `https://assets.pokemon.com/assets/cms2/img/cards/web/${setId.toUpperCase()}/${setId.toUpperCase()}_EN_${cardNumber}.png`,
    
    // PokemonCards.com format
    `https://images.pokemoncards.com/${setId}/${cardNumber}.jpg`,
    
    // Last resort official card back
    "https://archives.bulbagarden.net/media/upload/1/17/Cardback.jpg"
  ];
};
