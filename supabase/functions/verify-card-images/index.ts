import { serve } from "https://deno.land/std@0.177.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.31.0";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  // Initialize Supabase client with the project URL and service role key
  const supabaseUrl = Deno.env.get('SUPABASE_URL') || '';
  const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') || '';
  const supabase = createClient(supabaseUrl, supabaseKey);
  
  try {
    const url = new URL(req.url);
    const cardId = url.searchParams.get('id');
    
    // If a specific card ID is provided, verify just that card
    if (cardId) {
      return await verifyCardImage(supabase, cardId);
    }
    
    // Otherwise, run batch verification
    return await batchVerifyCardImages(supabase);
  } catch (error) {
    console.error('Error:', error.message);
    return new Response(JSON.stringify({ error: error.message }), { 
      status: 500, 
      headers: { ...corsHeaders, 'Content-Type': 'application/json' }
    });
  }
});

// Function to check if an image URL is valid
async function isImageValid(url: string): Promise<boolean> {
  try {
    // Skip checking for empty URLs
    if (!url) return false;
    
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 5000); // 5 second timeout
    
    const response = await fetch(url, { 
      method: 'HEAD', 
      signal: controller.signal,
      headers: { 'Cache-Control': 'no-cache' }
    });
    
    clearTimeout(timeoutId);
    return response.ok && response.headers.get('content-type')?.startsWith('image/');
  } catch (error) {
    console.log(`Image validation failed for URL: ${url}`, error);
    return false;
  }
}

// Function to verify a single card's image and update alternatives
async function verifyCardImage(supabase: any, cardId: string) {
  console.log(`Verifying card image for ID: ${cardId}`);
  
  // Get the card from the cache
  const { data: card, error: cardError } = await supabase
    .from('pokemon_cards_cache')
    .select('id, name, image_url, data')
    .eq('id', cardId)
    .maybeSingle();
  
  if (cardError || !card) {
    return new Response(JSON.stringify({ error: 'Card not found', cardId }), { 
      status: 404, 
      headers: { ...corsHeaders, 'Content-Type': 'application/json' }
    });
  }
  
  // 1. First check if the primary image_url is valid
  let primaryImageValid = false;
  if (card.image_url) {
    primaryImageValid = await isImageValid(card.image_url);
  }
  
  // 2. Get all alternative images for this card
  const { data: alternativeImages } = await supabase
    .from('card_alternative_images')
    .select('id, image_url, is_verified')
    .eq('card_id', cardId);
  
  // 3. Validate all alternative images
  const verifiedResults = await Promise.all(
    (alternativeImages || []).map(async (image: any) => {
      const isValid = await isImageValid(image.image_url);
      
      // Update verification status for this alternative
      await supabase
        .from('card_alternative_images')
        .update({ is_verified: isValid })
        .eq('id', image.id);
        
      return {
        id: image.id,
        url: image.image_url,
        isValid
      };
    })
  );
  
  // 4. Find the best alternative if the primary is invalid
  let backupImageUrl = null;
  if (!primaryImageValid) {
    const validAlternative = verifiedResults.find(img => img.isValid);
    if (validAlternative) {
      backupImageUrl = validAlternative.url;
    }
  }
  
  // 5. Extract additional image URLs from card data
  const cardData = card.data;
  const additionalUrls = [];
  
  if (cardData && typeof cardData === 'object') {
    // Extract from standard images object
    if (cardData.images) {
      if (cardData.images.small) additionalUrls.push({
        url: cardData.images.small,
        source: 'tcg_api_small'
      });
      
      if (cardData.images.large) additionalUrls.push({
        url: cardData.images.large,
        source: 'tcg_api_large'
      });
    }
    
    // Extract from any variants object (TCGDex format)
    if (cardData.variants) {
      if (cardData.variants.normal) additionalUrls.push({
        url: cardData.variants.normal,
        source: 'tcgdex_normal'
      });
      
      if (cardData.variants.holo) additionalUrls.push({
        url: cardData.variants.holo,
        source: 'tcgdex_holo'
      });
    }
  }
  
  // 6. Add any new additional URLs to alternatives
  for (const imgData of additionalUrls) {
    const exists = (alternativeImages || []).some(
      (alt: any) => alt.image_url === imgData.url
    );
    
    if (!exists) {
      // Check if this URL is valid
      const isValid = await isImageValid(imgData.url);
      
      // Add to alternatives
      await supabase
        .from('card_alternative_images')
        .upsert({
          card_id: cardId,
          image_url: imgData.url,
          source: imgData.source,
          is_verified: isValid
        }, { onConflict: 'card_id,image_url' });
        
      // If primary is invalid and we don't have a backup yet, use this if valid
      if (!primaryImageValid && !backupImageUrl && isValid) {
        backupImageUrl = imgData.url;
      }
    }
  }
  
  // 7. Update the card cache with verification status and backup image
  await supabase
    .from('pokemon_cards_cache')
    .update({
      image_verified: primaryImageValid,
      backup_image_url: backupImageUrl,
      last_verified: new Date().toISOString()
    })
    .eq('id', cardId);
  
  return new Response(JSON.stringify({
    cardId,
    primaryImage: card.image_url,
    primaryImageValid,
    backupImage: backupImageUrl,
    verifiedAlternatives: verifiedResults
  }), { 
    headers: { ...corsHeaders, 'Content-Type': 'application/json' }
  });
}

// Function to batch verify multiple cards
async function batchVerifyCardImages(supabase: any) {
  // Get cards that haven't been verified or were verified a long time ago
  const { data: cards, error } = await supabase
    .from('pokemon_cards_cache')
    .select('id')
    .or('image_verified.is.null,image_verified=false')
    .order('cached_at', { ascending: false })
    .limit(10);  // Process in batches of 10
  
  if (error) {
    return new Response(JSON.stringify({ error: error.message }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' }
    });
  }
  
  // Process each card
  const results = [];
  for (const card of cards || []) {
    try {
      const response = await verifyCardImage(supabase, card.id);
      const result = await response.json();
      results.push(result);
    } catch (err) {
      console.error(`Error processing card ${card.id}:`, err);
      results.push({ cardId: card.id, error: err.message });
    }
  }
  
  return new Response(JSON.stringify({
    processedCount: results.length,
    results
  }), {
    headers: { ...corsHeaders, 'Content-Type': 'application/json' }
  });
}
