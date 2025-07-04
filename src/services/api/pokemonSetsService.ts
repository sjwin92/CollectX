
// Service for fetching and managing Pokemon sets
import { PokemonSet, PokemonSetResponse } from './pokemonTypes';
import { BASE_URL, setsCache, isCacheValid, createApiUrl } from './pokemonApiConfig';

export const getSets = async (page = 1, pageSize = 20): Promise<PokemonSetResponse> => {
  const params = {
    page: page.toString(),
    pageSize: pageSize.toString(),
    orderBy: '-releaseDate' // Latest sets first
  };
  
  const url = createApiUrl('sets', params);
  
  try {
    console.log('Fetching sets with URL:', url.toString());
    const response = await fetch(url.toString());
    
    if (!response.ok) {
      throw new Error(`Failed to fetch sets: ${response.statusText}`);
    }
    
    const data = await response.json();
    console.log(`Successfully fetched ${data.data?.length || 0} sets`);
    
    // Deduplicate the fetched data first
    const deduplicatedData = data.data ? 
      data.data.filter((set: PokemonSet, index: number, self: PokemonSet[]) => 
        self.findIndex(s => s.id === set.id) === index
      ) : [];
    
    // Update cache with the deduplicated sets
    if (deduplicatedData.length > 0) {
      // Add only sets that aren't already in the cache
      const newSets = deduplicatedData.filter(
        (set: PokemonSet) => !setsCache.data.some(cachedSet => cachedSet.id === set.id)
      );
      
      if (newSets.length > 0) {
        setsCache.data = [...setsCache.data, ...newSets];
        setsCache.timestamp = Date.now();
      }
    }
    
    return {
      ...data,
      data: deduplicatedData
    };
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
  if (isCacheValid(setsCache)) {
    console.log('Using cached sets data');
    return setsCache.data;
  }
  
  // If cache is empty or expired, fetch all sets
  console.log('Fetching all sets for reference...');
  
  try {
    const params = {
      pageSize: '250', // Fetch a large number to get all sets
      orderBy: '-releaseDate'
    };
    
    const url = createApiUrl('sets', params);
    
    const response = await fetch(url.toString());
    
    if (!response.ok) {
      throw new Error(`Failed to fetch all sets: ${response.statusText}`);
    }
    
    const data = await response.json();
    console.log(`Successfully fetched all ${data.data?.length || 0} sets`);
    
    // Deduplicate the fetched data
    const deduplicatedData = data.data ? 
      data.data.filter((set: PokemonSet, index: number, self: PokemonSet[]) => 
        self.findIndex(s => s.id === set.id) === index
      ) : [];
    
    // Update cache
    setsCache.data = deduplicatedData;
    setsCache.timestamp = Date.now();
    
    return setsCache.data;
  } catch (error) {
    console.error('Error fetching all Pokemon sets:', error);
    return [];
  }
};

// Helper function to get a specific set by ID
export const getSetById = async (setId: string): Promise<PokemonSet | null> => {
  // Check cache first
  const cachedSet = setsCache.data.find(set => set.id === setId);
  if (cachedSet) {
    console.log(`Using cached set data for ${setId}`);
    return cachedSet;
  }
  
  // If not in cache, fetch from API
  try {
    console.log(`Fetching set with ID: ${setId}`);
    const response = await fetch(`${BASE_URL}/sets/${setId}`);
    
    if (!response.ok) {
      console.error(`Failed to fetch set with ID ${setId}: ${response.statusText}`);
      throw new Error(`Failed to fetch set with ID ${setId}: ${response.statusText}`);
    }
    
    const data = await response.json();
    
    // Add to cache
    if (data && data.data) {
      setsCache.data = [...setsCache.data, data.data];
      setsCache.timestamp = Date.now();
      console.log(`Successfully fetched set: ${data.data.name}`);
      return data.data;
    }
    
    return null;
  } catch (error) {
    console.error(`Error fetching set with ID ${setId}:`, error);
    return null;
  }
};

// Get the proper set information for a card based on its ID
export const getSetInfoForCard = async (cardId: string): Promise<PokemonSet | null> => {
  if (!cardId) return null;
  
  // Extract set ID from card ID (usually format is setId-cardNumber)
  const parts = cardId.split('-');
  const setId = parts[0];
  
  if (!setId) {
    console.error(`Could not extract set ID from card ID: ${cardId}`);
    return null;
  }
  
  return await getSetById(setId);
};
