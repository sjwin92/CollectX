
// API configuration and cache settings

// Base URL for Pokemon TCG API
export const BASE_URL = 'https://api.pokemontcg.io/v2';

// Cache duration in milliseconds
export const CACHE_DURATION = 60 * 60 * 1000; // 1 hour

// Cache storage
export interface CacheStorage<T> {
  data: T[];
  timestamp: number;
}

// Initialize empty caches
export const setsCache: CacheStorage<any> = {
  data: [],
  timestamp: 0
};

export const cardsCache: CacheStorage<any> = {
  data: [],
  timestamp: 0
};

// Check if cache is valid
export const isCacheValid = (cache: CacheStorage<any>): boolean => {
  const now = Date.now();
  return cache.data.length > 0 && now - cache.timestamp < CACHE_DURATION;
};

// Helper to create API URLs
export const createApiUrl = (endpoint: string, params: Record<string, string> = {}): URL => {
  const url = new URL(`${BASE_URL}/${endpoint}`);
  
  Object.entries(params).forEach(([key, value]) => {
    if (value) {
      url.searchParams.append(key, value);
    }
  });
  
  return url;
};
