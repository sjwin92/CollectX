
import { supabase } from "@/integrations/supabase/client";
import React from "react";

// Card type definition to match what's used in the app
interface Card {
  id: string;
  name: string;
  imageUrl?: string;
  images?: {
    small?: string;
    large?: string;
  };
}

// Default fallback image when nothing else works
const CARD_BACK_URL = "https://archives.bulbagarden.net/media/upload/1/17/Cardback.jpg";

/**
 * Handle image error and try to find alternative sources
 */
export const handleImageError = async (e: React.SyntheticEvent<HTMLImageElement>, card: Card) => {
  const img = e.currentTarget;
  const defaultImageUrl = CARD_BACK_URL;
  
  try {
    const { data: alternatives } = await supabase
      .from('card_alternative_images')
      .select('image_url, is_verified')
      .eq('card_id', card.id)
      .eq('is_verified', true)
      .limit(1);
    
    if (alternatives && alternatives.length > 0) {
      img.src = alternatives[0].image_url;
      return;
    }
    
    img.src = defaultImageUrl;
    
    try {
      const functionUrl = `${import.meta.env.VITE_SUPABASE_URL || 'https://psidmvvzcpodxbqcgomm.supabase.co'}/functions/v1/verify-card-images?id=${card.id}`;
      await fetch(functionUrl, {
        method: 'GET'
      });
    } catch (fetchError) {
      console.error("Error fetching alternative images:", fetchError);
    }
  } catch (error) {
    console.error("Error handling image error:", error);
    img.src = defaultImageUrl;
  }
};

/**
 * Get all possible image URLs for a card
 */
export const getImageUrlsForCard = (cardId: string): string[] => {
  if (!cardId) {
    return [CARD_BACK_URL];
  }
  
  const possibleUrls = [
    `https://images.pokemontcg.io/small/${cardId}.png`,
    `https://images.pokemontcg.io/large/${cardId}.png`,
    
    // Try alternative format with set prefix
    ...(cardId.includes("-") ? [
      `https://images.pokemontcg.io/${cardId.split("-")[0]}/small/${cardId.split("-")[1]}.png`,
      `https://images.pokemontcg.io/${cardId.split("-")[0]}/large/${cardId.split("-")[1]}.png`,
      `https://images.pokemontcg.io/${cardId.split("-")[0]}/${cardId.split("-")[1]}_hires.png`
    ] : []),
    
    CARD_BACK_URL
  ];
  
  return possibleUrls.filter(url => !!url && isValidUrl(url));
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
 * Find a working image URL for a card
 */
export const findWorkingImageUrl = async (cardId: string): Promise<string> => {
  if (!cardId) {
    console.warn("No card ID provided to findWorkingImageUrl");
    return CARD_BACK_URL;
  }
  
  try {
    console.log(`Finding best image for card ${cardId}`);
    
    const { data: cachedImage } = await supabase
      .from('card_alternative_images')
      .select('image_url')
      .eq('card_id', cardId)
      .eq('is_verified', true)
      .order('created_at', { ascending: false })
      .limit(1);
    
    if (cachedImage && cachedImage.length > 0) {
      console.log(`Found verified image in database for ${cardId}`);
      return cachedImage[0].image_url;
    }
    
    const possibleUrls = getImageUrlsForCard(cardId);
    
    for (const url of possibleUrls) {
      try {
        if (url === CARD_BACK_URL) continue;
        
        const response = await fetch(url, { method: 'HEAD' });
        if (response.ok) {
          await supabase
            .from('card_alternative_images')
            .upsert({
              card_id: cardId,
              image_url: url,
              is_verified: true,
              source: 'pokemon_tcg_io'
            }, { onConflict: 'card_id,image_url' });
          
          console.log(`Found working image URL for ${cardId}: ${url}`);
          return url;
        }
      } catch (error) {
        continue;
      }
    }
    
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
