
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
    // Direct image URLs (most reliable)
    `https://images.pokemontcg.io/${setId}/${cardNumber}.png`,
    
    // Pokemon TCG API images (small first since they load faster)
    `https://images.pokemontcg.io/small/${cardId}.png`,
    `https://images.pokemontcg.io/large/${cardId}.png`,
    
    // TCGDex format
    `https://assets.tcgdex.net/en/${setId}/${cardNumber}.png`,
    `https://assets.tcgdex.net/en/${setId}/${cardNumber}.jpg`,
    `https://assets.tcgdex.net/en/${setId}/${cardNumber}`,
    
    // Pokellector format (padding card number to 3 digits)
    `https://assets.pokellector.com/cards/${setId}/${cardNumber.padStart(3, '0')}.webp`,
    
    // Pokemon.com format
    `https://assets.pokemon.com/assets/cms2/img/cards/web/${setId.toUpperCase()}/${setId.toUpperCase()}_EN_${cardNumber}.png`,
    
    // PokemonCards.com format
    `https://images.pokemoncards.com/${setId}/${cardNumber}.jpg`,
    
    // Placeholder as last resort (NOT card back)
    PLACEHOLDER_URL
  ];
};

/**
 * Get all possible image URLs for a PokemonCard
 */
export const getImageUrlsForPokemonCard = (card: PokemonCard): string[] => {
  if (!card) return [PLACEHOLDER_URL];
  
  return [
    // Direct URLs from the card data
    card.images?.small,
    card.images?.large,
    
    // Generated URLs from the card ID
    ...generateImageUrlsById(card.id)
  ].filter(url => !!url);
};

/**
 * Get all possible image URLs for a TCGDexCard
 */
export const getImageUrlsForTCGDexCard = (card: TCGDexCard): string[] => {
  if (!card) return [PLACEHOLDER_URL];
  
  return [
    // Direct URLs from the card data
    card.image,
    card.variants?.normal,
    card.variants?.holo,
    card.variants?.reverse,
    
    // Generated URLs from the card ID
    ...generateImageUrlsById(card.id)
  ].filter(url => !!url);
};

/**
 * Universal function to get image URLs for any card type
 */
export const getImageUrlsForCard = (card: any): string[] => {
  if (!card) return [PLACEHOLDER_URL];
  
  // Check if it's a PokemonCard
  if (card.images?.small || card.images?.large) {
    return getImageUrlsForPokemonCard(card as PokemonCard);
  }
  
  // Check if it's a TCGDexCard
  if (card.variants || card.image) {
    return getImageUrlsForTCGDexCard(card as TCGDexCard);
  }
  
  // If it has an imageUrl property (for listings and trades)
  if (card.imageUrl) {
    return [card.imageUrl, ...generateImageUrlsById(card.id || '')];
  }
  
  // If it has an ID, try to generate URLs from that
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
      signal: controller.signal 
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
