
import { PokemonCard } from "./pokemonTcgApi";
import { TCGDexCard } from "./tcgdexApi";

const CARD_BACK_URL = "https://archives.bulbagarden.net/media/upload/1/17/Cardback.jpg";
const PLACEHOLDER_URL = "/placeholder.svg";

/**
 * Generate a list of potential image URLs for a card ID
 */
export const generateImageUrlsById = (cardId: string): string[] => {
  if (!cardId) return [PLACEHOLDER_URL];
  
  // Split the ID to get set and number
  const parts = cardId.split('-');
  if (parts.length !== 2) return [PLACEHOLDER_URL];
  
  const [setId, cardNumber] = parts;
  
  return [
    // Direct API image URLs - most reliable source
    `https://images.pokemontcg.io/${setId}/${cardNumber}.png`,
    `https://images.pokemontcg.io/${setId}/${cardNumber}_hires.png`,
    
    // Pokemon TCG API standard format images
    `https://images.pokemontcg.io/large/${cardId}.png`,
    `https://images.pokemontcg.io/small/${cardId}.png`,
    
    // TCGDex format
    `https://assets.tcgdex.net/en/${setId}/${cardNumber}.png`,
    `https://assets.tcgdex.net/en/${setId}/${cardNumber}.jpg`,
    `https://assets.tcgdex.net/en/${setId}/${cardNumber}`,
    
    // Pokellector format (padding card number to 3 digits)
    `https://assets.pokellector.com/cards/${setId}/${cardNumber.padStart(3, '0')}.webp`,
    
    // Pokemon.com format
    `https://assets.pokemon.com/assets/cms2/img/cards/web/${setId.toUpperCase()}/${setId.toUpperCase()}_EN_${cardNumber}.png`,
    
    // Fallback options
    PLACEHOLDER_URL
  ];
};

/**
 * Get all possible image URLs for a PokemonCard
 */
export const getImageUrlsForPokemonCard = (card: PokemonCard): string[] => {
  if (!card) return [PLACEHOLDER_URL];
  
  // If we have direct image URLs from the API data, prioritize those
  const directUrls = [];
  if (card.images?.large) directUrls.push(card.images.large);
  if (card.images?.small) directUrls.push(card.images.small);
  
  // Get ID-based URLs as fallbacks
  const idBasedUrls = generateImageUrlsById(card.id);
  
  return [...directUrls, ...idBasedUrls].filter(url => !!url);
};

/**
 * Get all possible image URLs for a TCGDexCard
 */
export const getImageUrlsForTCGDexCard = (card: TCGDexCard): string[] => {
  if (!card) return [PLACEHOLDER_URL];
  
  // Direct URLs from the card data
  const directUrls = [];
  if (card.image) directUrls.push(card.image);
  if (card.variants?.normal) directUrls.push(card.variants.normal);
  if (card.variants?.holo) directUrls.push(card.variants.holo);
  if (card.variants?.reverse) directUrls.push(card.variants.reverse);
  
  // Get ID-based URLs as fallbacks
  const idBasedUrls = generateImageUrlsById(card.id);
  
  return [...directUrls, ...idBasedUrls].filter(url => !!url);
};

/**
 * Universal function to get image URLs for any card type
 */
export const getImageUrlsForCard = (card: any): string[] => {
  if (!card) return [PLACEHOLDER_URL];
  
  // Check if it's a PokemonCard (from Pokemon TCG API)
  if (card.images?.small || card.images?.large) {
    return getImageUrlsForPokemonCard(card as PokemonCard);
  }
  
  // Check if it's a TCGDexCard
  if (card.variants || (card.image && card.set)) {
    return getImageUrlsForTCGDexCard(card as TCGDexCard);
  }
  
  // If it has a specific imageUrl property (for listings and trades)
  if (card.imageUrl) {
    const urls = [card.imageUrl];
    
    // If it also has an ID, add generated URLs as fallbacks
    if (card.id) {
      urls.push(...generateImageUrlsById(card.id));
    }
    
    return urls;
  }
  
  // If it just has an ID, try to generate URLs from that
  if (card.id) {
    return generateImageUrlsById(card.id);
  }
  
  // If it's just a string ID
  if (typeof card === 'string') {
    return generateImageUrlsById(card);
  }
  
  return [PLACEHOLDER_URL];
};

/**
 * Find the best image URL based on preference order and API
 */
export const getBestImageUrl = (card: any): string => {
  const urls = getImageUrlsForCard(card);
  return urls[0] || PLACEHOLDER_URL;
};

/**
 * Check if a URL exists and is accessible
 */
export const checkImageUrl = async (url: string): Promise<boolean> => {
  try {
    // Skip checking for placeholder and card back
    if (url === PLACEHOLDER_URL || url === CARD_BACK_URL) {
      return true;
    }
    
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 3000); // 3 seconds timeout
    
    const response = await fetch(url, { 
      method: 'HEAD', 
      signal: controller.signal,
      cache: 'no-store' // Prevent caching to ensure we get fresh results
    });
    
    clearTimeout(timeoutId);
    return response.ok;
  } catch (error) {
    console.log(`Failed to check image URL: ${url}`, error);
    return false;
  }
};

/**
 * Find the first working image URL for a card
 */
export const findWorkingImageUrl = async (card: any): Promise<string> => {
  const urls = getImageUrlsForCard(card);
  
  for (const url of urls) {
    if (await checkImageUrl(url)) {
      return url;
    }
  }
  
  return PLACEHOLDER_URL;
};

/**
 * Handle image loading with fallbacks
 */
export const handleImageError = (e: React.SyntheticEvent<HTMLImageElement>, card: any): void => {
  const imgElement = e.target as HTMLImageElement;
  const urls = getImageUrlsForCard(card);
  const currentIndex = urls.indexOf(imgElement.src);
  
  if (currentIndex < urls.length - 1) {
    // Try the next URL in the list
    imgElement.src = urls[currentIndex + 1];
    console.log(`Image failed to load. Trying alternative: ${urls[currentIndex + 1]}`);
  } else {
    // If we've tried all URLs, use the placeholder
    imgElement.src = PLACEHOLDER_URL;
    console.log('All image sources failed, using placeholder');
  }
};
