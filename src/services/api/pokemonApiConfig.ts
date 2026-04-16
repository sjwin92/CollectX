// API configuration and cache settings

export const BASE_URL = 'https://api.pokemontcg.io/v2';
export const CACHE_DURATION = 60 * 60 * 1000; // 1 hour

// Read API key from env — set VITE_POKEMON_TCG_API_KEY in .env.local
const API_KEY = import.meta.env.VITE_POKEMON_TCG_API_KEY || '';

// Build auth headers for every request
export const getApiHeaders = (): HeadersInit => {
  const headers: Record<string, string> = { 'Content-Type': 'application/json' };
  if (API_KEY) headers['X-Api-Key'] = API_KEY;
  return headers;
};

// Single fetch wrapper that always includes the API key
export const fetchFromApi = (url: string): Promise<Response> =>
  fetch(url, { headers: getApiHeaders() });

// localStorage-backed cache — survives page reloads unlike module variables
export const getCachedData = <T>(key: string): T[] | null => {
  try {
    const raw = localStorage.getItem(`ptcg_cache_${key}`);
    if (!raw) return null;
    const { data, timestamp } = JSON.parse(raw) as { data: T[]; timestamp: number };
    if (Date.now() - timestamp < CACHE_DURATION) return data;
    localStorage.removeItem(`ptcg_cache_${key}`);
    return null;
  } catch {
    return null;
  }
};

export const setCachedData = <T>(key: string, data: T[]): void => {
  try {
    localStorage.setItem(`ptcg_cache_${key}`, JSON.stringify({ data, timestamp: Date.now() }));
  } catch {
    // localStorage can be full in private browsing — fail silently
  }
};

// Legacy in-memory cache interface kept for backwards compat with setsCache references
export interface CacheStorage<T> {
  data: T[];
  timestamp: number;
}

export const setsCache: CacheStorage<any> = { data: [], timestamp: 0 };
export const cardsCache: CacheStorage<any> = { data: [], timestamp: 0 };

export const isCacheValid = (cache: CacheStorage<any>): boolean => {
  const now = Date.now();
  return cache.data.length > 0 && now - cache.timestamp < CACHE_DURATION;
};

export const createApiUrl = (endpoint: string, params: Record<string, string> = {}): URL => {
  const url = new URL(`${BASE_URL}/${endpoint}`);
  Object.entries(params).forEach(([key, value]) => {
    if (value) url.searchParams.append(key, value);
  });
  return url;
};
