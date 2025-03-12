
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
