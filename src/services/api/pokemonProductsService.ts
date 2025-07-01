
// Service for fetching Pokémon TCG products including ETBs, booster boxes, etc.
import { BASE_URL, createApiUrl } from './pokemonApiConfig';

export interface ProductSet {
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
  ptcgoCode?: string;
  updatedAt: string;
}

export interface ProductResponse {
  data: ProductSet[];
  page: number;
  pageSize: number;
  count: number;
  totalCount: number;
}

// Transform set data into product data with different product types
const transformSetToProducts = (set: ProductSet) => {
  const baseProduct = {
    series: set.series,
    setId: set.id,
    releaseDate: set.releaseDate,
    description: `From the ${set.name} expansion in the ${set.series} series.`,
    imageUrl: set.images?.logo
  };

  return [
    // Elite Trainer Box
    {
      id: `${set.id}-etb`,
      name: `${set.name} Elite Trainer Box`,
      productType: 'etb' as const,
      packCount: 9,
      msrp: 49.99,
      ...baseProduct
    },
    // Booster Box
    {
      id: `${set.id}-bb`,
      name: `${set.name} Booster Box`,
      productType: 'box' as const,
      packCount: 36,
      msrp: 143.99,
      ...baseProduct
    },
    // 3-Pack Blister
    {
      id: `${set.id}-blister-3`,
      name: `${set.name} 3-Pack Blister`,
      productType: 'blister-pack' as const,
      packCount: 3,
      msrp: 14.99,
      ...baseProduct
    },
    // Single Pack Blister
    {
      id: `${set.id}-blister-1`,
      name: `${set.name} Single Pack Blister`,
      productType: 'blister-pack' as const,
      packCount: 1,
      msrp: 4.99,
      ...baseProduct
    },
    // Collector Tin
    {
      id: `${set.id}-tin`,
      name: `${set.name} Collector Tin`,
      productType: 'tin' as const,
      packCount: 4,
      msrp: 24.99,
      ...baseProduct
    },
    // Theme Deck
    {
      id: `${set.id}-deck`,
      name: `${set.name} Battle Deck`,
      productType: 'deck' as const,
      msrp: 19.99,
      ...baseProduct
    }
  ];
};

export const getProducts = async (page = 1, pageSize = 20): Promise<any[]> => {
  try {
    // Fetch sets from the API and transform them into products
    const params = {
      page: Math.ceil(page / 6).toString(), // Each set generates 6 products
      pageSize: Math.ceil(pageSize / 6).toString(),
      orderBy: '-releaseDate'
    };
    
    const url = createApiUrl('sets', params);
    console.log('Fetching sets to generate products:', url.toString());
    
    const response = await fetch(url.toString());
    
    if (!response.ok) {
      throw new Error(`Failed to fetch sets: ${response.statusText}`);
    }
    
    const data = await response.json();
    console.log(`Successfully fetched ${data.data?.length || 0} sets for product generation`);
    
    // Transform sets into products
    const allProducts = data.data?.flatMap(transformSetToProducts) || [];
    
    // Apply pagination to the products
    const startIndex = (page - 1) * pageSize;
    const endIndex = startIndex + pageSize;
    
    return allProducts.slice(startIndex, endIndex);
  } catch (error) {
    console.error('Error fetching products:', error);
    return [];
  }
};

export const getFeaturedProducts = async (): Promise<any[]> => {
  try {
    // Get the latest 2 sets and generate featured products from them
    const params = {
      page: '1',
      pageSize: '2',
      orderBy: '-releaseDate'
    };
    
    const url = createApiUrl('sets', params);
    const response = await fetch(url.toString());
    
    if (!response.ok) {
      throw new Error(`Failed to fetch sets for featured products: ${response.statusText}`);
    }
    
    const data = await response.json();
    
    // Generate products from the latest sets and take the first 4
    const featuredProducts = data.data?.flatMap(transformSetToProducts).slice(0, 4) || [];
    
    console.log(`Generated ${featuredProducts.length} featured products`);
    return featuredProducts;
  } catch (error) {
    console.error('Error fetching featured products:', error);
    return [];
  }
};
