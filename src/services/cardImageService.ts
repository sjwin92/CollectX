
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
export const handleImageError = async (e: React.SyntheticEvent<HTMLImageElement>, card: any) => {
  const img = e.currentTarget;
  
  // Default fallback image for when nothing else works
  const defaultImageUrl = CARD_BACK_URL;
  
  try {
    // First check if we have alternatives in our DB
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
    
    // If no alternatives, set to default
    img.src = defaultImageUrl;
    
    // If we got here, the card wasn't in the cache or verification failed
    // Trigger our image verification edge function
    try {
      // Use the environment variable instead of functions.url
      const functionUrl = `${import.meta.env.VITE_SUPABASE_URL || 'https://psidmvvzcpodxbqcgomm.supabase.co'}/functions/v1/verify-card-images?id=${card.id}`;
      await fetch(functionUrl, {
        method: 'GET'
      });
      // Don't wait for the response as it can be slow
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
export const getImageUrlsForCard = (card: Card): string[] => {
  if (!card || !card.id) {
    return [CARD_BACK_URL];
  }
  
  const possibleUrls = [
    // Card might have direct imageUrl property
    card.imageUrl,
    
    // Card might have images object with small and large properties
    card.images?.small,
    card.images?.large,
    
    // Try Pokemon TCG IO standard format
    `https://images.pokemontcg.io/small/${card.id}.png`,
    `https://images.pokemontcg.io/large/${card.id}.png`,
    
    // Try alternative format with set prefix
    ...(card.id.includes("-") ? [
      `https://images.pokemontcg.io/${card.id.split("-")[0]}/small/${card.id.split("-")[1]}.png`,
      `https://images.pokemontcg.io/${card.id.split("-")[0]}/large/${card.id.split("-")[1]}.png`,
      `https://images.pokemontcg.io/${card.id.split("-")[0]}/${card.id.split("-")[1]}_hires.png`
    ] : []),
    
    // Default fallback as last resort
    CARD_BACK_URL
  ];
  
  // Filter out undefined, null, or invalid URLs
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
 * This tries multiple sources and checks the DB cache
 */
export const findWorkingImageUrl = async (card: Card): Promise<string> => {
  if (!card || !card.id) {
    console.warn("No card or card ID provided to findWorkingImageUrl");
    return CARD_BACK_URL;
  }
  
  try {
    console.log(`Finding best image for card ${card.id} (${card.name})`);
    
    // First, check if we have a verified image in our database
    const { data: cachedImage } = await supabase
      .from('card_alternative_images')
      .select('image_url')
      .eq('card_id', card.id)
      .eq('is_verified', true)
      .order('created_at', { ascending: false })
      .limit(1);
    
    if (cachedImage && cachedImage.length > 0) {
      console.log(`Found verified image in database for ${card.id}`);
      return cachedImage[0].image_url;
    }
    
    // Next, try to find a working image from various sources
    const possibleUrls = getImageUrlsForCard(card);
    
    // Start with the original image URL if available
    if (card.imageUrl) {
      // Verify that it's working by doing a HEAD request
      try {
        const response = await fetch(card.imageUrl, { method: 'HEAD' });
        if (response.ok) {
          // Store this URL in our database for future use
          await supabase
            .from('card_alternative_images')
            .upsert({
              card_id: card.id,
              image_url: card.imageUrl,
              is_verified: true
            }, { onConflict: 'card_id,image_url' });
          
          return card.imageUrl;
        }
      } catch (error) {
        console.log(`Original image URL failed for ${card.id}: ${card.imageUrl}`);
      }
    }
    
    // Try each URL in our list
    for (const url of possibleUrls) {
      try {
        if (url === CARD_BACK_URL) continue; // Skip testing the fallback
        
        const response = await fetch(url, { method: 'HEAD' });
        if (response.ok) {
          // Found a working URL, store it in our database
          await supabase
            .from('card_alternative_images')
            .upsert({
              card_id: card.id,
              image_url: url,
              is_verified: true
            }, { onConflict: 'card_id,image_url' });
          
          console.log(`Found working image URL for ${card.id}: ${url}`);
          return url;
        }
      } catch (error) {
        // Just continue to the next URL
        continue;
      }
    }
    
    // If we got here, no working URL was found, trigger the edge function to find one
    try {
      const functionUrl = `${import.meta.env.VITE_SUPABASE_URL || 'https://psidmvvzcpodxbqcgomm.supabase.co'}/functions/v1/verify-card-images?id=${card.id}`;
      fetch(functionUrl, { method: 'GET' }); // Don't await, let it run in background
    } catch (error) {
      console.error("Error triggering verify-card-images function:", error);
    }
    
    // Return the default card back as fallback
    console.log(`No working image found for ${card.id}, using fallback`);
    return CARD_BACK_URL;
  } catch (error) {
    console.error(`Error in findWorkingImageUrl for ${card.id}:`, error);
    return CARD_BACK_URL;
  }
};
