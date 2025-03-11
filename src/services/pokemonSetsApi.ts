
// API service for Pokemon TCG sets
export interface PokemonSet {
  id: string;
  name: string;
  series: string;
  printedTotal: number;
  total: number;
  releaseDate: string;
  logo: string;
  symbol: string;
  legalities?: Record<string, string>;
  images: {
    symbol: string;
    logo: string;
  };
}

export interface PokemonSetsResponse {
  data: PokemonSet[];
}

const BASE_URL = 'https://api.pokemontcg.io/v2';
const API_KEY = '3329f6d3-cb49-4b09-9997-2ee636a023e4';

/**
 * Get all Pokemon TCG sets
 */
export const getAllSets = async (): Promise<PokemonSet[]> => {
  try {
    console.log('Fetching all Pokemon TCG sets');
    const response = await fetch(`${BASE_URL}/sets`, {
      headers: {
        'X-Api-Key': API_KEY
      }
    });
    
    if (!response.ok) {
      console.error(`Failed to fetch sets: ${response.statusText}`);
      throw new Error(`Failed to fetch sets: ${response.statusText}`);
    }
    
    const data: PokemonSetsResponse = await response.json();
    console.log(`Successfully fetched ${data.data?.length || 0} sets`);
    
    // Sort by release date, oldest first
    const sortedSets = [...data.data].sort((a, b) => {
      return new Date(a.releaseDate).getTime() - new Date(b.releaseDate).getTime();
    });
    
    return sortedSets;
  } catch (error) {
    console.error('Error fetching Pokemon sets:', error);
    return [];
  }
};

/**
 * Group sets by series
 */
export const groupSetsBySeries = (sets: PokemonSet[]) => {
  const seriesMap = new Map<string, PokemonSet[]>();
  
  sets.forEach(set => {
    if (!seriesMap.has(set.series)) {
      seriesMap.set(set.series, []);
    }
    seriesMap.get(set.series)?.push(set);
  });
  
  // Convert map to array of [series, sets] pairs
  return Array.from(seriesMap.entries()).sort((a, b) => {
    // Get the earliest release date from each series
    const aDate = Math.min(...a[1].map(set => new Date(set.releaseDate).getTime()));
    const bDate = Math.min(...b[1].map(set => new Date(set.releaseDate).getTime()));
    return aDate - bDate;
  });
};

/**
 * Search sets by name, series, or card name
 */
export const searchSets = async (sets: PokemonSet[], query: string): Promise<PokemonSet[]> => {
  if (!query) return sets;
  
  const lowerQuery = query.toLowerCase();
  
  // First check if it's a set name or series match
  const directMatches = sets.filter(set => 
    set.name.toLowerCase().includes(lowerQuery) || 
    set.series.toLowerCase().includes(lowerQuery)
  );
  
  // If we have direct matches, return them immediately
  if (directMatches.length > 0) {
    return directMatches;
  }
  
  // If no direct matches, search for cards containing the query
  try {
    console.log(`Searching for cards containing: ${query}`);
    const cardResponse = await fetch(`${BASE_URL}/cards?q=name:"${query}"*&pageSize=20`, {
      headers: {
        'X-Api-Key': API_KEY
      }
    });
    
    if (!cardResponse.ok) {
      throw new Error(`Failed to search cards: ${cardResponse.statusText}`);
    }
    
    const cardData = await cardResponse.json();
    
    if (!cardData.data || cardData.data.length === 0) {
      return [];
    }
    
    // Get unique set IDs from the card results
    const setIds = new Set(cardData.data.map((card: any) => card.set.id));
    
    // Filter our sets array to only include those that contain matching cards
    return sets.filter(set => setIds.has(set.id));
    
  } catch (error) {
    console.error('Error searching for cards:', error);
    return [];
  }
};

/**
 * Format release date for display
 */
export const formatReleaseDate = (dateString: string): string => {
  const date = new Date(dateString);
  return new Intl.DateTimeFormat('en-US', { 
    year: 'numeric', 
    month: 'long', 
    day: 'numeric' 
  }).format(date);
};
