
import { PokemonCard } from "./pokemonTcgApi";
import { TCGDexCard } from "./tcgdexApi";
import { supabase } from "@/integrations/supabase/client";

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
    `https://images.pokemontcg.io/${setId}/${cardNumber}_hires.png`,
    `https://images.pokemontcg.io/${setId}/${cardNumber}.png`,
    
    // Pokemon TCG API standard format images
    `https://images.pokemontcg.io/large/${cardId}.png`,
    `https://images.pokemontcg.io/small/${cardId}.png`,
    
    // Alternative source: Pokellector with padding
    `https://assets.pokellector.com/cards/${setId.toLowerCase()}/${cardNumber.padStart(3, '0')}.webp`,
    `https://assets.pokellector.com/cards/${setId.toUpperCase()}/${cardNumber.padStart(3, '0')}.webp`,
    
    // TCGDex format
    `https://assets.tcgdex.net/en/${setId}/${cardNumber}.png`,
    `https://assets.tcgdex.net/en/${setId}/${cardNumber}.jpg`,
    `https://assets.tcgdex.net/en/${setId}/${cardNumber}`,
    
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
    
    // Also try searching by name for better results if available
    if (card.name) {
      // We'll add this at the end as it's a fallback method
      urls.push(`https://api.pokemontcg.io/v2/cards?q=name:"${encodeURIComponent(card.name)}"&pageSize=1`);
    }
    
    return urls;
  }
  
  // If it just has an ID, try to generate URLs from that
  if (card.id) {
    return generateImageUrlsById(card.id);
  }
  
  // If we have a name but no ID, try to find by name
  if (card.name) {
    return [
      `https://api.pokemontcg.io/v2/cards?q=name:"${encodeURIComponent(card.name)}"&pageSize=1`,
      PLACEHOLDER_URL
    ];
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
    
    // Skip API search URLs, which need special handling
    if (url.includes('/v2/cards?q=name:')) {
      return false;
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
  // First try to get the card from Supabase cache if we have an ID
  if (card.id) {
    try {
      const { data: cachedCard } = await supabase
        .from('pokemon_cards_cache')
        .select('data, image_url')
        .eq('id', card.id)
        .maybeSingle();
        
      if (cachedCard) {
        // If we have a cached card with data that contains images
        if (typeof cachedCard.data === 'object' && cachedCard.data !== null) {
          // Safely type check and access the image properties
          const typedData = cachedCard.data as Record<string, any>;
          
          if (
            'images' in typedData && 
            typedData.images && 
            typeof typedData.images === 'object'
          ) {
            if ('large' in typedData.images && typedData.images.large) {
              const largeUrl = typedData.images.large as string;
              const works = await checkImageUrl(largeUrl);
              if (works) return largeUrl;
            }
            
            if ('small' in typedData.images && typedData.images.small) {
              const smallUrl = typedData.images.small as string;
              const works = await checkImageUrl(smallUrl);
              if (works) return smallUrl;
            }
          }
        }
        
        // Try the image_url field as a fallback
        if (cachedCard.image_url && typeof cachedCard.image_url === 'string') {
          const works = await checkImageUrl(cachedCard.image_url);
          if (works) return cachedCard.image_url;
        }
      }
    } catch (error) {
      console.error("Error checking cache for card image:", error);
    }
  }
  
  // If we have a name but no successful image yet, try to search by name
  if (card.name && typeof card.name === 'string') {
    try {
      console.log(`Searching Pokemon TCG API for card by name: ${card.name}`);
      const searchUrl = `https://api.pokemontcg.io/v2/cards?q=name:"${encodeURIComponent(card.name)}"&pageSize=1`;
      const response = await fetch(searchUrl);
      
      if (response.ok) {
        const data = await response.json();
        if (
          data.data?.length > 0 && 
          data.data[0].images && 
          typeof data.data[0].images === 'object' &&
          'large' in data.data[0].images
        ) {
          const imageUrl = data.data[0].images.large;
          console.log(`Found image by name search: ${imageUrl}`);
          
          // Verify this image works
          const works = await checkImageUrl(imageUrl);
          if (works) return imageUrl;
        }
      }
    } catch (error) {
      console.error("Error searching for card by name:", error);
    }
  }
  
  // Fall back to checking each URL in sequence
  const urls = getImageUrlsForCard(card);
  
  for (const url of urls) {
    // Skip API search URLs, as we've already tried them above
    if (url.includes('/v2/cards?q=name:')) continue;
    
    try {
      const works = await checkImageUrl(url);
      if (works) {
        console.log(`Found working image URL: ${url}`);
        return url;
      }
    } catch (error) {
      console.error(`Error checking URL ${url}:`, error);
    }
  }
  
  console.log(`Could not find working image for card: ${card.name || card.id || 'unknown'}`);
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
