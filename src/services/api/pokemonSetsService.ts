
// Service for fetching Pokemon set data from the external API.
// Caching is handled by React Query at the call site — no localStorage here.
import { PokemonSet, PokemonSetResponse } from './pokemonTypes';
import { BASE_URL, createApiUrl, fetchFromApi } from './pokemonApiConfig';

export const getSets = async (page = 1, pageSize = 20): Promise<PokemonSetResponse> => {
  const url = createApiUrl('sets', {
    page: page.toString(),
    pageSize: pageSize.toString(),
    orderBy: '-releaseDate',
  });

  try {
    const response = await fetchFromApi(url.toString());
    if (!response.ok) throw new Error(`Failed to fetch sets: ${response.statusText}`);
    const data = await response.json();
    const deduplicatedData = data.data
      ? data.data.filter((set: PokemonSet, index: number, self: PokemonSet[]) =>
          self.findIndex(s => s.id === set.id) === index
        )
      : [];
    return { ...data, data: deduplicatedData };
  } catch (error) {
    console.error('Error fetching Pokemon sets:', error);
    return { data: [], page, pageSize, count: 0, totalCount: 0 };
  }
};

export const getAllSets = async (): Promise<PokemonSet[]> => {
  try {
    const url = createApiUrl('sets', { pageSize: '250', orderBy: '-releaseDate' });
    const response = await fetchFromApi(url.toString());
    if (!response.ok) throw new Error(`Failed to fetch all sets: ${response.statusText}`);
    const data = await response.json();
    return data.data
      ? data.data.filter((set: PokemonSet, index: number, self: PokemonSet[]) =>
          self.findIndex(s => s.id === set.id) === index
        )
      : [];
  } catch (error) {
    console.error('Error fetching all Pokemon sets:', error);
    return [];
  }
};

export const getSetById = async (setId: string): Promise<PokemonSet | null> => {
  try {
    const response = await fetchFromApi(`${BASE_URL}/sets/${setId}`);
    if (!response.ok) throw new Error(`Failed to fetch set ${setId}: ${response.statusText}`);
    const data = await response.json();
    return data?.data ?? null;
  } catch (error) {
    console.error(`Error fetching set ${setId}:`, error);
    return null;
  }
};

export const getSetInfoForCard = async (cardId: string): Promise<PokemonSet | null> => {
  if (!cardId) return null;
  const setId = cardId.split('-')[0];
  if (!setId) return null;
  return getSetById(setId);
};
