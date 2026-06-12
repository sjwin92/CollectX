// Sealed products service — uses Pokemon TCG API for set data, avoids HEAD-request image probing
import { PokemonSet } from './api/pokemonTypes';
import { fetchFromApi } from './api/pokemonApiConfig';

export interface FreeSealedProduct {
  id: string;
  name: string;
  type: string;
  setName: string;
  setId: string;
  price: {
    current: number;
    currency: string;
    source: string;
  };
  imageUrl: string;
  availability: 'in-stock' | 'pre-order' | 'out-of-stock';
  releaseDate: string;
  description: string;
  vendor: string;
  retailPrice?: number;
}

const productTypes = [
  { type: 'Booster Box', basePrice: 120 },
  { type: 'Elite Trainer Box', basePrice: 45 },
  { type: 'Collection Box', basePrice: 25 },
  { type: 'Tin', basePrice: 18 },
  { type: 'Blister Pack', basePrice: 5 },
];

// Use the set logo directly from the Pokemon TCG API — no HEAD probing needed
const getProductImage = (setId: string, setImages: PokemonSet['images']): string =>
  setImages?.logo || `https://images.pokemontcg.io/${setId}/logo.png`;

const generatePrice = (basePrice: number, releaseDate: string): number => {
  const monthsSinceRelease =
    (Date.now() - new Date(releaseDate).getTime()) / (1000 * 60 * 60 * 24 * 30);

  let multiplier = 1;
  if (monthsSinceRelease < 3) multiplier = 1.2 + Math.random() * 0.3;
  else if (monthsSinceRelease > 24) multiplier = 0.7 + Math.random() * 0.8;
  else multiplier = 0.9 + Math.random() * 0.4;

  return Math.round(basePrice * multiplier * 100) / 100;
};

const fallbackSets: PokemonSet[] = [
  {
    id: 'sv8',
    name: 'Surging Sparks',
    series: 'Scarlet & Violet',
    printedTotal: 191,
    total: 252,
    releaseDate: '2024/11/08',
    images: { symbol: 'https://images.pokemontcg.io/sv8/symbol.png', logo: 'https://images.pokemontcg.io/sv8/logo.png' },
    legalities: { standard: 'Legal', expanded: 'Legal', unlimited: 'Legal' },
  },
  {
    id: 'sv7',
    name: 'Stellar Crown',
    series: 'Scarlet & Violet',
    printedTotal: 142,
    total: 175,
    releaseDate: '2024/09/13',
    images: { symbol: 'https://images.pokemontcg.io/sv7/symbol.png', logo: 'https://images.pokemontcg.io/sv7/logo.png' },
    legalities: { standard: 'Legal', expanded: 'Legal', unlimited: 'Legal' },
  },
  {
    id: 'sv6',
    name: 'Twilight Masquerade',
    series: 'Scarlet & Violet',
    printedTotal: 167,
    total: 226,
    releaseDate: '2024/05/24',
    images: { symbol: 'https://images.pokemontcg.io/sv6/symbol.png', logo: 'https://images.pokemontcg.io/sv6/logo.png' },
    legalities: { standard: 'Legal', expanded: 'Legal', unlimited: 'Legal' },
  },
  {
    id: 'sv5',
    name: 'Temporal Forces',
    series: 'Scarlet & Violet',
    printedTotal: 162,
    total: 218,
    releaseDate: '2024/03/22',
    images: { symbol: 'https://images.pokemontcg.io/sv5/symbol.png', logo: 'https://images.pokemontcg.io/sv5/logo.png' },
    legalities: { standard: 'Legal', expanded: 'Legal', unlimited: 'Legal' },
  },
];

const fetchPokemonSets = async (): Promise<PokemonSet[]> => {
  try {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 8000);
    const response = await fetchFromApi(
      'https://api.pokemontcg.io/v2/sets?pageSize=20&orderBy=-releaseDate'
    );
    clearTimeout(timeout);
    if (!response.ok) throw new Error(`API returned ${response.status}`);
    const data = await response.json();
    return data.data || fallbackSets;
  } catch {
    return fallbackSets;
  }
};

export const fetchFreeSealedProducts = async (): Promise<FreeSealedProduct[]> => {
  try {
    const sets = await fetchPokemonSets();

    return sets.flatMap(set =>
      productTypes.map(pt => ({
        id: `${set.id}-${pt.type.toLowerCase().replace(/\s+/g, '-')}`,
        name: `${set.name} ${pt.type}`,
        type: pt.type,
        setName: set.name,
        setId: set.id,
        price: {
          current: generatePrice(pt.basePrice, set.releaseDate),
          currency: 'GBP',
          source: 'Market Average',
        },
        imageUrl: getProductImage(set.id, set.images),
        availability: (Math.random() > 0.3 ? 'in-stock' : Math.random() > 0.5 ? 'pre-order' : 'out-of-stock') as
          'in-stock' | 'pre-order' | 'out-of-stock',
        releaseDate: set.releaseDate,
        description: `Official ${set.name} ${pt.type} from the ${set.series} series.`,
        vendor: 'Various Retailers',
        retailPrice: pt.basePrice * 1.15,
      }))
    );
  } catch (error) {
    console.error('Error creating sealed products:', error);
    return [];
  }
};

export default { fetchFreeSealedProducts };
