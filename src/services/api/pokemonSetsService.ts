
// Service for fetching and managing Pokemon sets
import { PokemonSet, PokemonSetResponse } from './pokemonTypes';
import { BASE_URL, createApiUrl, fetchFromApi, getCachedData, setCachedData } from './pokemonApiConfig';

export const getSets = async (page = 1, pageSize = 20): Promise<PokemonSetResponse> => {
  const params = {
    page: page.toString(),
    pageSize: pageSize.toString(),
    orderBy: '-releaseDate'
  };

  const url = createApiUrl('sets', params);

  try {
    console.log('Fetching sets with URL:', url.toString());
    const response = await fetchFromApi(url.toString());

    if (!response.ok) {
      throw new Error(`Failed to fetch sets: ${response.statusText}`);
    }

    const data = await response.json();
    console.log(`Successfully fetched ${data.data?.length || 0} sets`);

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

// Fetch all sets — checks localStorage cache first, then API
export const getAllSets = async (): Promise<PokemonSet[]> => {
  const cached = getCachedData<PokemonSet>('all_sets');
  if (cached) {
    console.log('Using cached sets data');
    return cached;
  }

  console.log('Fetching all sets from API...');

  try {
    const url = createApiUrl('sets', { pageSize: '250', orderBy: '-releaseDate' });
    const response = await fetchFromApi(url.toString());

    if (!response.ok) {
      throw new Error(`Failed to fetch all sets: ${response.statusText}`);
    }

    const data = await response.json();
    console.log(`Fetched ${data.data?.length || 0} sets`);

    const deduplicated: PokemonSet[] = data.data
      ? data.data.filter((set: PokemonSet, index: number, self: PokemonSet[]) =>
          self.findIndex(s => s.id === set.id) === index
        )
      : [];

    setCachedData('all_sets', deduplicated);
    return deduplicated;
  } catch (error) {
    console.error('Error fetching all Pokemon sets:', error);
    return [];
  }
};

export const getSetById = async (setId: string): Promise<PokemonSet | null> => {
  // Check localStorage cache
  const allCached = getCachedData<PokemonSet>('all_sets');
  if (allCached) {
    const found = allCached.find(s => s.id === setId);
    if (found) return found;
  }

  try {
    console.log(`Fetching set with ID: ${setId}`);
    const response = await fetchFromApi(`${BASE_URL}/sets/${setId}`);

    if (!response.ok) {
      throw new Error(`Failed to fetch set ${setId}: ${response.statusText}`);
    }

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
