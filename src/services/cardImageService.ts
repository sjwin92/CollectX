
import { supabase } from "@/integrations/supabase/client";
import React from "react";

// Card type definition to match what's used in the app
export interface Card {
  id: string;
  name?: string; // Name is optional since we don't always have it
  imageUrl?: string;
  images?: {
    small?: string;
    large?: string;
  };
}

// Default fallback image when nothing else works
const CARD_BACK_URL = "https://archives.bulbagarden.net/media/upload/1/17/Cardback.jpg";

/**
 * Primary domains for pokemon card images
 */
const TRUSTED_IMAGE_DOMAINS = [
  "images.pokemontcg.io",
  "assets.tcgdex.net",
  "tcgplayer.com",
  "product-images.tcgplayer.com",
  "pokemoncard.io"
];

/**
 * Handle image error and try to find alternative sources
 */
export const handleImageError = async (e: React.SyntheticEvent<HTMLImageElement>, card: Card) => {
  const img = e.currentTarget;
  
  try {
    console.log(`Image failed to load for card ${card.id}, finding alternative...`);
    
    // First try to get a verified image from the database
    const { data: alternatives } = await supabase
      .from('card_alternative_images')
      .select('image_url, is_verified')
      .eq('card_id', card.id)
      .eq('is_verified', true)
      .order('created_at', { ascending: false })
      .limit(1);
    
    if (alternatives && alternatives.length > 0) {
      console.log(`Found verified alternative image for ${card.id}: ${alternatives[0].image_url}`);
      img.src = alternatives[0].image_url;
      return;
    }
    
    // Try the Pokemon TCG API (with the format that works for card sets)
    const tcgioUrl = getPokemonTcgIoUrl(card.id);
    if (tcgioUrl) {
      img.src = tcgioUrl;
      console.log(`Trying Pokemon TCG IO URL for ${card.id}: ${tcgioUrl}`);
      return;
    }
    
    // If not, try all possible URLs
    const possibleUrls = getImageUrlsForCard(card);
    
    // We'll try each URL until one works or we run out
    for (const url of possibleUrls) {
      if (url === img.src || url === CARD_BACK_URL) continue;
      
      try {
        const response = await fetch(url, { method: 'HEAD' });
        if (response.ok) {
          console.log(`Found working URL for ${card.id}: ${url}`);
          img.src = url;
          
          // Store this working URL for future use
          await supabase
            .from('card_alternative_images')
            .upsert({
              card_id: card.id,
              image_url: url,
              is_verified: true,
              source: 'found_by_error_handler'
            }, { onConflict: 'card_id,image_url' });
          
          return;
        }
      } catch (error) {
        continue; // Try next URL
      }
    }
    
    // If we get here, no URLs worked
    console.log(`No working image found for ${card.id}, using fallback`);
    img.src = CARD_BACK_URL;
    
    // Trigger serverless function to find better images
    try {
      const functionUrl = `${import.meta.env.VITE_SUPABASE_URL || 'https://psidmvvzcpodxbqcgomm.supabase.co'}/functions/v1/verify-card-images?id=${card.id}`;
      fetch(functionUrl, { method: 'GET' });
    } catch (fetchError) {
      console.error("Error fetching alternative images:", fetchError);
    }
  } catch (error) {
    console.error("Error handling image error:", error);
    img.src = CARD_BACK_URL;
  }
};

/**
 * Get Pokemon TCG IO URL directly - this is the format that works for card sets
 */
export const getPokemonTcgIoUrl = (cardId: string): string | null => {
  if (!cardId) return null;
  
  // Parse the set code and card number from the ID
  const parts = cardId.split("-");
  if (parts.length >= 2) {
    const setCode = parts[0];
    const cardNumber = parts[1];
    
    return `https://images.pokemontcg.io/${setCode}/${cardNumber}_hires.png`;
  }
  
  return null;
};

/**
 * Get TCGDex URL - this is kept for backwards compatibility
 * @deprecated Use getPokemonTcgIoUrl instead
 */
export const getTCGDexUrl = (cardId: string): string | null => {
  console.warn('getTCGDexUrl is deprecated, use getPokemonTcgIoUrl instead');
  return getPokemonTcgIoUrl(cardId);
};

/**
 * Generate all possible image URLs for a card based on its ID
 */
export const getImageUrlsForCard = (cardIdOrCard: string | Card): string[] => {
  // Extract card ID and any existing URLs we know about
  const cardId = typeof cardIdOrCard === 'string' ? cardIdOrCard : cardIdOrCard.id;
  let existingUrl = '';
  let smallImage = '';
  let largeImage = '';
  
  if (typeof cardIdOrCard !== 'string') {
    existingUrl = cardIdOrCard.imageUrl || '';
    smallImage = cardIdOrCard.images?.small || '';
    largeImage = cardIdOrCard.images?.large || '';
  }
  
  if (!cardId) {
    return [CARD_BACK_URL];
  }
  
  // Array to hold all possible URL formats
  const possibleUrls = [];
  
  // Try Pokemon TCG IO first (most reliable for card sets)
  const tcgioUrl = getPokemonTcgIoUrl(cardId);
  if (tcgioUrl) {
    possibleUrls.push(tcgioUrl);
  }
  
  // Add any existing URLs we already know about
  if (existingUrl) possibleUrls.push(existingUrl);
  if (smallImage) possibleUrls.push(smallImage);
  if (largeImage) possibleUrls.push(largeImage);
  
  // Parse the set code and card number from the ID
  const parts = cardId.split("-");
  if (parts.length >= 2) {
    const setCode = parts[0];
    const cardNumber = parts[1];
    
    // Add various format variations in order of reliability for our app
    possibleUrls.push(
      `https://images.pokemontcg.io/${setCode}/${cardNumber}_hires.png`,
      `https://images.pokemontcg.io/${setCode}/${cardNumber}.png`,
      `https://images.pokemontcg.io/${setCode}/small/${cardNumber}.png`,
      `https://images.pokemontcg.io/${setCode}/large/${cardNumber}.png`
    );
  }
  
  // Add the fallback as last resort
  possibleUrls.push(CARD_BACK_URL);
  
  // Filter out any invalid or duplicate URLs
  return [...new Set(possibleUrls.filter(url => !!url && isValidUrl(url)))];
};

/**
 * Check if a URL is valid
 */
const isValidUrl = (url: string): boolean => {
  try {
    new URL(url);
    return true;
  } catch {
    return false;
  }
};

/**
 * Find a working image URL for a card with intelligent fallbacks
 */
export const findWorkingImageUrl = async (cardIdOrCard: string | Card): Promise<string> => {
  // Extract card ID and name for logging
  const cardId = typeof cardIdOrCard === 'string' ? cardIdOrCard : cardIdOrCard.id;
  const cardName = typeof cardIdOrCard === 'string' ? cardId : (cardIdOrCard.name || cardId);
  
  if (!cardId) {
    console.warn("No card ID provided to findWorkingImageUrl");
    return CARD_BACK_URL;
  }
  
  try {
    console.log(`Finding best image for card ${cardId} (${cardName})`);
    
    // PRIORITY 1: Try Pokemon TCG IO URL directly (from card sets)
    const tcgioUrl = getPokemonTcgIoUrl(cardId);
    if (tcgioUrl) {
      try {
        console.log(`Testing Pokemon TCG IO URL for ${cardId}: ${tcgioUrl}`);
        const response = await fetch(tcgioUrl, { method: 'HEAD' });
        if (response.ok) {
          console.log(`Found working Pokemon TCG IO URL for ${cardId}: ${tcgioUrl}`);
          
          // Store this working URL for future use
          await supabase
            .from('card_alternative_images')
            .upsert({
              card_id: cardId,
              image_url: tcgioUrl,
              is_verified: true,
              source: 'pokemon_tcg_io_direct'
            }, { onConflict: 'card_id,image_url' });
            
          return tcgioUrl;
        }
      } catch (error) {
        // Continue to other strategies
        console.log(`Pokemon TCG IO URL failed for ${cardId}, trying other sources`);
      }
    }
    
    // PRIORITY 2: Check the database for verified images
    const { data: verifiedImages } = await supabase
      .from('card_alternative_images')
      .select('image_url')
      .eq('card_id', cardId)
      .eq('is_verified', true)
      .order('created_at', { ascending: false })
      .limit(1);
    
    if (verifiedImages && verifiedImages.length > 0) {
      console.log(`Found verified image in database for ${cardId}: ${verifiedImages[0].image_url}`);
      return verifiedImages[0].image_url;
    }
    
    // PRIORITY 3: Look in pokemon_cards_cache table
    const { data: cachedCard } = await supabase
      .from('pokemon_cards_cache')
      .select('image_url, backup_image_url')
      .eq('id', cardId)
      .maybeSingle();
    
    if (cachedCard) {
      if (cachedCard.image_url) {
        // Try the primary image URL first
        try {
          const response = await fetch(cachedCard.image_url, { method: 'HEAD' });
          if (response.ok) {
            console.log(`Found working cached image for ${cardId}: ${cachedCard.image_url}`);
            return cachedCard.image_url;
          }
        } catch (error) {
          // Continue to backup
        }
      }
      
      if (cachedCard.backup_image_url) {
        try {
          const response = await fetch(cachedCard.backup_image_url, { method: 'HEAD' });
          if (response.ok) {
            console.log(`Found working backup image for ${cardId}: ${cachedCard.backup_image_url}`);
            return cachedCard.backup_image_url;
          }
        } catch (error) {
          // Continue to generated URLs
        }
      }
    }
    
    // PRIORITY 4: Generate and try all possible URLs
    const possibleUrls = getImageUrlsForCard(cardIdOrCard);
    console.log(`Generated ${possibleUrls.length} potential image URLs for card ${cardId}`);
    
    for (const url of possibleUrls) {
      if (url === CARD_BACK_URL) continue; // Skip the fallback for now
      
      try {
        const response = await fetch(url, { method: 'HEAD' });
        if (response.ok) {
          // Store this working URL in the database for future use
          await supabase
            .from('card_alternative_images')
            .upsert({
              card_id: cardId,
              image_url: url,
              is_verified: true,
              source: 'found_by_service'
            }, { onConflict: 'card_id,image_url' });
          
          console.log(`Found working URL for ${cardId}: ${url}`);
          return url;
        }
      } catch (error) {
        continue; // Try next URL
      }
    }
    
    // PRIORITY 5: If everything fails, trigger the verification function and return fallback
    try {
      const functionUrl = `${import.meta.env.VITE_SUPABASE_URL || 'https://psidmvvzcpodxbqcgomm.supabase.co'}/functions/v1/verify-card-images?id=${cardId}`;
      fetch(functionUrl, { method: 'GET' });
    } catch (error) {
      console.error("Error triggering verify-card-images function:", error);
    }
    
    console.log(`No working image found for ${cardId}, using fallback`);
    return CARD_BACK_URL;
  } catch (error) {
    console.error(`Error in findWorkingImageUrl for ${cardId}:`, error);
    return CARD_BACK_URL;
  }
};
