// Service for handling Pokemon card images
import { CARD_BACK_URL } from './pokemonTypes';
import { supabase } from "@/integrations/supabase/client";

// Normalize a card ID to ensure consistent format
export const normalizeCardId = (cardId: string): string => {
  if (!cardId) return '';
  // Some IDs come in different formats, this normalizes them
  return cardId.trim().toLowerCase();
};

// Get the proper card image URL based on set information
export const getConsistentCardImageUrl = (cardId: string, size: 'small' | 'large' = 'small'): string => {
  if (!cardId) {
    return CARD_BACK_URL;
  }
  
  try {
    // Extract set and card number from ID format like "swsh4-25"
    const [setId, number] = cardId.split('-');
    
    if (!setId || !number) {
      console.log(`Invalid card ID format: ${cardId}`);
      return CARD_BACK_URL;
    }
    
    // The Pokemon TCG API image URL format
    return `https://images.pokemontcg.io/${setId}/${number}_${size}.png`;
  } catch (error) {
    console.error(`Error generating URL for card ${cardId}:`, error);
    return CARD_BACK_URL;
  }
};

// Check if a URL is valid format
export const isValidUrl = (url: string): boolean => {
  try {
    new URL(url);
    return true;
  } catch {
    return false;
  }
};

// Get alternative image URLs from Supabase database
export const getAlternativeImagesFromSupabase = async (cardId: string): Promise<string[]> => {
  if (!cardId) return [];
  
  try {
    const { data, error } = await supabase
      .from('card_alternative_images')
      .select('image_url')
      .eq('card_id', cardId)
      .eq('is_verified', true)
      .order('created_at', { ascending: false });
    
    if (error) {
      console.error('Error fetching alternative images from Supabase:', error);
      return [];
    }
    
    return data.map(item => item.image_url).filter(url => isValidUrl(url));
  } catch (err) {
    console.error('Failed to fetch alternative images from Supabase:', err);
    return [];
  }
};

// Get cached card information including backup image URL
export const getCachedCardInfo = async (cardId: string): Promise<{ image_url?: string, backup_image_url?: string } | null> => {
  if (!cardId) return null;
  
  try {
    const { data, error } = await supabase
      .from('pokemon_cards_cache')
      .select('image_url, backup_image_url')
      .eq('id', cardId)
      .maybeSingle();
    
    if (error) {
      console.error('Error fetching cached card info from Supabase:', error);
      return null;
    }
    
    return data;
  } catch (err) {
    console.error('Failed to fetch cached card info from Supabase:', err);
    return null;
  }
};

// Get all possible image URLs for a card (now including Supabase sources)
export const getAllPossibleCardImageUrls = async (cardId: string): Promise<string[]> => {
  if (!cardId) return [];
  
  try {
    const [setId, number] = cardId.split('-');
    if (!setId || !number) return [];
    
    // Start with standard API URLs
    let urls: string[] = [];
    
    // Try different formats - some card IDs might need adjustment
    const normalizedNumber = number.replace(/^0+/, ''); // Remove leading zeros
    
    // Pokemon TCG API images (primary source) - with exact ID format
    urls.push(`https://images.pokemontcg.io/${setId}/${number}_small.png`);
    urls.push(`https://images.pokemontcg.io/${setId}/${number}_large.png`);
    
    // Try without leading zeros for the card number
    urls.push(`https://images.pokemontcg.io/${setId}/${normalizedNumber}_small.png`);
    urls.push(`https://images.pokemontcg.io/${setId}/${normalizedNumber}_large.png`);
    
    // TCGDex API images (reliable secondary source)
    urls.push(`https://assets.tcgdex.net/en/${setId}/${number}/card.png`);
    urls.push(`https://assets.tcgdex.net/en/${setId}/${normalizedNumber}/card.png`);
    
    // Get alternative URLs from Supabase
    const supabaseUrls = await getAlternativeImagesFromSupabase(cardId);
    
    // Get cached card info
    const cachedCard = await getCachedCardInfo(cardId);
    
    // Add cached URLs if they exist and are valid
    if (cachedCard) {
      if (cachedCard.image_url && isValidUrl(cachedCard.image_url)) {
        urls.push(cachedCard.image_url);
      }
      
      if (cachedCard.backup_image_url && isValidUrl(cachedCard.backup_image_url)) {
        urls.push(cachedCard.backup_image_url);
      }
    }
    
    // Combine all sources and filter out duplicates
    urls = [...urls, ...supabaseUrls];
    
    // Return unique URLs
    return [...new Set(urls)];
  } catch (error) {
    console.error(`Error generating URLs for card ${cardId}:`, error);
    return [];
  }
};

// For backward compatibility, keep the sync version of this function
export const getAllPossibleCardImageUrlsSync = (cardId: string): string[] => {
  if (!cardId) return [];
  
  try {
    const [setId, number] = cardId.split('-');
    if (!setId || !number) return [];
    
    // Try different formats - some card IDs might need adjustment
    const normalizedNumber = number.replace(/^0+/, ''); // Remove leading zeros
    
    const urls = [
      // Pokemon TCG API images (primary source) - with exact ID format
      `https://images.pokemontcg.io/${setId}/${number}_small.png`,
      `https://images.pokemontcg.io/${setId}/${number}_large.png`,
      
      // Try without leading zeros for the card number
      `https://images.pokemontcg.io/${setId}/${normalizedNumber}_small.png`,
      `https://images.pokemontcg.io/${setId}/${normalizedNumber}_large.png`,
      
      // TCGDex API images (reliable secondary source)
      `https://assets.tcgdex.net/en/${setId}/${number}/card.png`,
      `https://assets.tcgdex.net/en/${setId}/${normalizedNumber}/card.png`
    ];
    
    // Return unique URLs
    return [...new Set(urls)];
  } catch (error) {
    console.error(`Error generating URLs for card ${cardId}:`, error);
    return [];
  }
};

// Get a guaranteed working image URL for featured cards
export const getGuaranteedImageUrl = async (cardId: string): Promise<string> => {
  // This is a small set of hardcoded URLs for known featured cards
  // to ensure they always have a working image
  const guaranteedUrls: Record<string, string> = {
    'swsh4-25': 'https://images.pokemontcg.io/swsh4/25_large.png',
    'swsh1-190': 'https://images.pokemontcg.io/swsh1/190_large.png',
    'sm12-222': 'https://images.pokemontcg.io/sm12/222_large.png',
    'swsh9-25': 'https://images.pokemontcg.io/swsh9/25_large.png',
    'base1-4': 'https://images.pokemontcg.io/base1/4_large.png',
    'xy12-13': 'https://images.pokemontcg.io/xy12/13_large.png',
    'sm10-158': 'https://images.pokemontcg.io/sm10/158_large.png',
    'cel25c-12': 'https://images.pokemontcg.io/cel25c/12_large.png',
    'dp7-130': 'https://images.pokemontcg.io/dp7/130_large.png'
  };
  
  // First try Supabase for verified images
  const cachedCardInfo = await getCachedCardInfo(cardId);
  if (cachedCardInfo && cachedCardInfo.backup_image_url) {
    return cachedCardInfo.backup_image_url;
  }
  
  if (cachedCardInfo && cachedCardInfo.image_url) {
    return cachedCardInfo.image_url;
  }
  
  // If we have a guaranteed URL for this card, use it
  if (cardId && guaranteedUrls[cardId]) {
    return guaranteedUrls[cardId];
  }
  
  // Otherwise fall back to our regular URL generation
  return getConsistentCardImageUrl(cardId, 'large');
};

// For backward compatibility, keep the sync version of this function
export const getGuaranteedImageUrlSync = (cardId: string): string => {
  // This is a small set of hardcoded URLs for known featured cards
  // to ensure they always have a working image
  const guaranteedUrls: Record<string, string> = {
    'swsh4-25': 'https://images.pokemontcg.io/swsh4/25_large.png',
    'swsh1-190': 'https://images.pokemontcg.io/swsh1/190_large.png',
    'sm12-222': 'https://images.pokemontcg.io/sm12/222_large.png',
    'swsh9-25': 'https://images.pokemontcg.io/swsh9/25_large.png',
    'base1-4': 'https://images.pokemontcg.io/base1/4_large.png',
    'xy12-13': 'https://images.pokemontcg.io/xy12/13_large.png',
    'sm10-158': 'https://images.pokemontcg.io/sm10/158_large.png',
    'cel25c-12': 'https://images.pokemontcg.io/cel25c/12_large.png',
    'dp7-130': 'https://images.pokemontcg.io/dp7/130_large.png'
  };
  
  // If we have a guaranteed URL for this card, use it
  if (cardId && guaranteedUrls[cardId]) {
    return guaranteedUrls[cardId];
  }
  
  // Otherwise fall back to our regular URL generation
  return getConsistentCardImageUrl(cardId, 'large');
};

// Get all possible image URLs for a card object
export const getAllPossibleImageUrlsFromCardObject = (card: any): string[] => {
  if (!card) return [];
  
  const urls: string[] = [];
  
  // Add direct image URLs if they exist in the card object
  if (card.images) {
    if (card.images.small) urls.push(card.images.small);
    if (card.images.large) urls.push(card.images.large);
  }
  
  // Add TCG API URLs based on card ID
  if (card.id) {
    urls.push(getConsistentCardImageUrl(card.id, 'small'));
    urls.push(getConsistentCardImageUrl(card.id, 'large'));
    
    // Add all possible URLs for completeness
    const allPossible = getAllPossibleCardImageUrlsSync(card.id);
    urls.push(...allPossible);
  }
  
  // Add other potential sources
  if (card.set?.id && card.number) {
    // TCGDex format
    urls.push(`https://assets.tcgdex.net/en/${card.set.id}/${card.number}/card.png`);
  }
  
  // Filter out duplicates
  return [...new Set(urls)];
};
