
import { PokemonCard } from "./pokemonTcgApi";
import { TCGDexCard } from "./tcgdexApi";

const CARD_BACK_URL = "https://archives.bulbagarden.net/media/upload/1/17/Cardback.jpg";
const PLACEHOLDER_URL = "/placeholder.svg";

/**
 * Generate a list of potential image URLs for a card ID
 */
export const generateImageUrlsById = (cardId: string): string[] => {
  if (!cardId) return [CARD_BACK_URL];
  
  // Split the ID to get set and number
  const parts = cardId.split('-');
  if (parts.length !== 2) return [CARD_BACK_URL];
  
  const [setId, cardNumber] = parts;
  
  return [
    // Pokemon TCG API images
    `https://images.pokemontcg.io/small/${cardId}.png`,
    `https://images.pokemontcg.io/large/${cardId}.png`,
    `https://images.pokemontcg.io/${setId}/${cardNumber}.png`,
    
    // TCGDex format
    `https://assets.tcgdex.net/en/${setId}/${cardNumber}`,
    `https://assets.tcgdex.net/en/${setId}/${cardNumber}.jpg`,
    `https://assets.tcgdex.net/en/${setId}/${cardNumber}.png`,
    
    // Pokellector format (padding card number to 3 digits)
    `https://assets.pokellector.com/cards/${setId}/${cardNumber.padStart(3, '0')}.webp`,
    
    // Pokemon.com format
    `https://assets.pokemon.com/assets/cms2/img/cards/web/${setId.toUpperCase()}/${setId.toUpperCase()}_EN_${cardNumber}.png`,
    
    // PokemonCards.com format
    `https://images.pokemoncards.com/${setId}/${cardNumber}.jpg`,
    
    // Card back as last resort
    CARD_BACK_URL
  ];
};

/**
 * Get all possible image URLs for a PokemonCard
 */
export const getImageUrlsForPokemonCard = (card: PokemonCard): string[] => {
  if (!card) return [CARD_BACK_URL];
  
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
  if (!card) return [CARD_BACK_URL];
  
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
  if (!card) return [CARD_BACK_URL];
  
  // Check if it's a PokemonCard
  if (card.images?.small || card.images?.large) {
    return getImageUrlsForPokemonCard(card as PokemonCard);
  }
  
  // Check if it's a TCGDexCard
  if (card.variants || card.image) {
    return getImageUrlsForTCGDexCard(card as TCGDexCard);
  }
  
  // If it's just a string ID
  if (typeof card === 'string') {
    return generateImageUrlsById(card);
  }
  
  // If it has an ID, try to generate URLs from that
  if (card.id) {
    return generateImageUrlsById(card.id);
  }
  
  // Check if it has an imageUrl property (for listings and trades)
  if (card.imageUrl) {
    return [card.imageUrl, ...generateImageUrlsById(card.id || '')];
  }
  
  return [CARD_BACK_URL];
};

/**
 * Find the best image URL based on preference order and API
 */
export const getBestImageUrl = (card: any): string => {
  const urls = getImageUrlsForCard(card);
  return urls[0] || PLACEHOLDER_URL;
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

/**
 * Check if a URL exists and is accessible
 */
export const checkImageUrl = async (url: string): Promise<boolean> => {
  try {
    const response = await fetch(url, { method: 'HEAD' });
    return response.ok;
  } catch (error) {
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
