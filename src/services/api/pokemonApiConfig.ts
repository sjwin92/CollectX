// API configuration for the Pokémon TCG external API.
// Caching is handled entirely by React Query — do not add localStorage cache here.

export const BASE_URL = 'https://api.pokemontcg.io/v2';

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

export const createApiUrl = (endpoint: string, params: Record<string, string> = {}): URL => {
  const url = new URL(`${BASE_URL}/${endpoint}`);
  Object.entries(params).forEach(([key, value]) => {
    if (value) url.searchParams.append(key, value);
  });
  return url;
};
