import { supabase } from "@/integrations/supabase/client";
import React from "react";

/**
 * Handle image error and try to find alternative sources
 */
export const handleImageError = async (e: React.SyntheticEvent<HTMLImageElement>, card: any) => {
  const img = e.currentTarget;
  
  // Default fallback image for when nothing else works
  const defaultImageUrl = "https://archives.bulbagarden.net/media/upload/1/17/Cardback.jpg";
  
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
      // Instead of using functions.url which is protected, use the VITE environment variable
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
