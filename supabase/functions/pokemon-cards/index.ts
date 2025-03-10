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

  // Get request parameters
  const url = new URL(req.url);
  const path = url.pathname.split('/').pop() || '';
  
  // Initialize Supabase client with the project URL and service role key
  const supabaseUrl = Deno.env.get('SUPABASE_URL') || '';
  const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') || '';
  const supabase = createClient(supabaseUrl, supabaseKey);
  
  try {
    // Handle different API endpoints
    if (req.method === 'GET') {
      if (path === 'search') {
        const query = url.searchParams.get('q') || '';
        return await handleSearchCards(supabase, query);
      } else if (path === 'card') {
        const cardId = url.searchParams.get('id') || '';
        return await handleGetCard(supabase, cardId);
      } else {
        return new Response(JSON.stringify({ error: 'Invalid endpoint' }), { 
          status: 400, 
          headers: { ...corsHeaders, 'Content-Type': 'application/json' }
        });
      }
    } else if (req.method === 'POST' && path === 'cache') {
      const body = await req.json();
      return await handleCacheCards(supabase, body.cards);
    }
    
    return new Response(JSON.stringify({ error: 'Method not allowed' }), { 
      status: 405, 
      headers: { ...corsHeaders, 'Content-Type': 'application/json' }
    });
  } catch (error) {
    console.error('Error:', error.message);
    return new Response(JSON.stringify({ error: error.message }), { 
      status: 500, 
      headers: { ...corsHeaders, 'Content-Type': 'application/json' }
    });
  }
});

// Function to search for Pokémon cards
async function handleSearchCards(supabase, query: string) {
  // First check if we have this query cached
  const { data: cachedCards, error: cacheError } = await supabase
    .from('pokemon_cards_cache')
    .select('id, name, data, image_url')
    .ilike('name', `%${query}%`)
    .limit(20);
  
  if (cacheError) {
    throw new Error(`Error fetching from cache: ${cacheError.message}`);
  }
  
  // If we have enough cached results, return them
  if (cachedCards && cachedCards.length >= 10) {
    return new Response(JSON.stringify({ data: cachedCards.map(card => card.data) }), { 
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
  
  // Otherwise, fetch from Pokemon TCG API
  const apiUrl = `https://api.pokemontcg.io/v2/cards?q=name:"${query}"`;
  const response = await fetch(apiUrl);
  
  if (!response.ok) {
    throw new Error(`API request failed with status ${response.status}`);
  }
  
  const apiData = await response.json();
  
  // Cache these results for future use
  if (apiData.data && apiData.data.length > 0) {
    const cardsToCache = apiData.data.map(card => ({
      id: card.id,
      name: card.name,
      data: card,
      image_url: card.images?.small || card.images?.large,
      cached_at: new Date()
    }));
    
    // Insert cards into cache
    const { error: insertError } = await supabase
      .from('pokemon_cards_cache')
      .upsert(cardsToCache, { onConflict: 'id' });
    
    if (insertError) {
      console.error('Failed to cache cards:', insertError);
    }
  }
  
  return new Response(JSON.stringify(apiData), { 
    headers: { ...corsHeaders, 'Content-Type': 'application/json' },
  });
}

// Function to get a specific Pokémon card by ID
async function handleGetCard(supabase, cardId: string) {
  if (!cardId) {
    return new Response(JSON.stringify({ error: 'Card ID is required' }), { 
      status: 400, 
      headers: { ...corsHeaders, 'Content-Type': 'application/json' }
    });
  }
  
  // Check if card is in cache
  const { data: cachedCard, error: cacheError } = await supabase
    .from('pokemon_cards_cache')
    .select('data')
    .eq('id', cardId)
    .maybeSingle();
  
  if (cacheError) {
    throw new Error(`Error fetching from cache: ${cacheError.message}`);
  }
  
  // If found in cache, return it
  if (cachedCard && cachedCard.data) {
    return new Response(JSON.stringify({ data: cachedCard.data }), { 
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
  
  // Otherwise, fetch from Pokemon TCG API
  const apiUrl = `https://api.pokemontcg.io/v2/cards/${cardId}`;
  const response = await fetch(apiUrl);
  
  if (!response.ok) {
    throw new Error(`API request failed with status ${response.status}`);
  }
  
  const apiData = await response.json();
  
  // Cache this card for future use
  if (apiData.data) {
    const cardToCache = {
      id: apiData.data.id,
      name: apiData.data.name,
      data: apiData.data,
      image_url: apiData.data.images?.small || apiData.data.images?.large,
      cached_at: new Date()
    };
    
    // Insert card into cache
    const { error: insertError } = await supabase
      .from('pokemon_cards_cache')
      .upsert([cardToCache], { onConflict: 'id' });
    
    if (insertError) {
      console.error('Failed to cache card:', insertError);
    }
  }
  
  return new Response(JSON.stringify(apiData), { 
    headers: { ...corsHeaders, 'Content-Type': 'application/json' },
  });
}

// Function to cache multiple cards at once
async function handleCacheCards(supabase, cards: any[]) {
  if (!cards || !Array.isArray(cards) || cards.length === 0) {
    return new Response(JSON.stringify({ error: 'Valid cards array is required' }), { 
      status: 400, 
      headers: { ...corsHeaders, 'Content-Type': 'application/json' }
    });
  }
  
  const cardsToCache = cards.map(card => ({
    id: card.id,
    name: card.name,
    data: card,
    image_url: card.images?.small || card.images?.large,
    cached_at: new Date()
  }));
  
  // Insert cards into cache
  const { data, error } = await supabase
    .from('pokemon_cards_cache')
    .upsert(cardsToCache, { onConflict: 'id' });
  
  if (error) {
    throw new Error(`Failed to cache cards: ${error.message}`);
  }
  
  return new Response(JSON.stringify({ success: true, count: cardsToCache.length }), { 
    headers: { ...corsHeaders, 'Content-Type': 'application/json' },
  });
}
