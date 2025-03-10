
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

  // Initialize Supabase client
  const supabaseUrl = Deno.env.get('SUPABASE_URL') || '';
  const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') || '';
  const supabase = createClient(supabaseUrl, supabaseKey);
  
  // Get user ID from JWT
  try {
    // Get and verify JWT
    const authHeader = req.headers.get('Authorization') || '';
    const token = authHeader.replace('Bearer ', '');
    
    if (!token) {
      return new Response(JSON.stringify({ error: 'Unauthorized' }), { 
        status: 401, 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      });
    }
    
    // Verify token and get user ID
    const { data: { user }, error: authError } = await supabase.auth.getUser(token);
    
    if (authError || !user) {
      return new Response(JSON.stringify({ error: 'Unauthorized: Invalid token' }), { 
        status: 401, 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      });
    }
    
    const userId = user.id;
    const url = new URL(req.url);
    const path = url.pathname.split('/').pop() || '';
    
    if (req.method === 'GET') {
      // Get user's collection
      return await getUserCollection(supabase, userId);
    } else if (req.method === 'POST') {
      // Add card to collection
      const body = await req.json();
      return await addCardToCollection(supabase, userId, body);
    } else if (req.method === 'PATCH') {
      // Update card in collection
      const body = await req.json();
      return await updateCardInCollection(supabase, userId, body);
    } else if (req.method === 'DELETE') {
      // Remove card from collection
      const cardId = url.searchParams.get('cardId');
      if (!cardId) {
        return new Response(JSON.stringify({ error: 'Card ID is required' }), { 
          status: 400, 
          headers: { ...corsHeaders, 'Content-Type': 'application/json' }
        });
      }
      return await removeCardFromCollection(supabase, userId, cardId);
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

// Get user's collection
async function getUserCollection(supabase, userId: string) {
  const { data, error } = await supabase
    .from('user_collections')
    .select(`
      id, 
      quantity, 
      condition, 
      acquired_at, 
      notes, 
      for_trade,
      pokemon_cards_cache (id, name, data, image_url)
    `)
    .eq('user_id', userId);
  
  if (error) {
    throw new Error(`Error fetching collection: ${error.message}`);
  }
  
  // Format response to match frontend expectations
  const formattedCollection = data.map(item => ({
    id: item.id,
    quantity: item.quantity,
    condition: item.condition,
    acquired_at: item.acquired_at,
    notes: item.notes,
    for_trade: item.for_trade,
    card: item.pokemon_cards_cache.data
  }));
  
  return new Response(JSON.stringify({ data: formattedCollection }), { 
    headers: { ...corsHeaders, 'Content-Type': 'application/json' },
  });
}

// Add card to user's collection
async function addCardToCollection(supabase, userId: string, body: any) {
  const { cardId, quantity, condition, notes, for_trade } = body;
  
  if (!cardId) {
    return new Response(JSON.stringify({ error: 'Card ID is required' }), { 
      status: 400, 
      headers: { ...corsHeaders, 'Content-Type': 'application/json' }
    });
  }
  
  // Check if card exists in cache
  const { data: cardData, error: cardError } = await supabase
    .from('pokemon_cards_cache')
    .select('id')
    .eq('id', cardId)
    .maybeSingle();
  
  if (cardError) {
    throw new Error(`Error checking card existence: ${cardError.message}`);
  }
  
  // If card doesn't exist in cache, get and cache it
  if (!cardData) {
    const apiUrl = `https://api.pokemontcg.io/v2/cards/${cardId}`;
    const response = await fetch(apiUrl);
    
    if (!response.ok) {
      return new Response(JSON.stringify({ error: `Card with ID ${cardId} not found` }), { 
        status: 404, 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      });
    }
    
    const apiData = await response.json();
    
    // Cache this card
    const cardToCache = {
      id: apiData.data.id,
      name: apiData.data.name,
      data: apiData.data,
      image_url: apiData.data.images?.small || apiData.data.images?.large,
      cached_at: new Date()
    };
    
    const { error: cacheError } = await supabase
      .from('pokemon_cards_cache')
      .insert([cardToCache]);
    
    if (cacheError) {
      throw new Error(`Error caching card: ${cacheError.message}`);
    }
  }
  
  // Now add to user's collection
  const { data, error } = await supabase
    .from('user_collections')
    .upsert({
      user_id: userId,
      card_id: cardId,
      quantity: quantity || 1,
      condition: condition || 'Near Mint',
      notes: notes || null,
      for_trade: for_trade || false
    }, {
      onConflict: 'user_id,card_id',
      returning: 'minimal'
    });
  
  if (error) {
    throw new Error(`Error adding card to collection: ${error.message}`);
  }
  
  return new Response(JSON.stringify({ success: true }), { 
    headers: { ...corsHeaders, 'Content-Type': 'application/json' },
  });
}

// Update card in user's collection
async function updateCardInCollection(supabase, userId: string, body: any) {
  const { id, quantity, condition, notes, for_trade } = body;
  
  if (!id) {
    return new Response(JSON.stringify({ error: 'Collection item ID is required' }), { 
      status: 400, 
      headers: { ...corsHeaders, 'Content-Type': 'application/json' }
    });
  }
  
  // Update the collection item
  const { data, error } = await supabase
    .from('user_collections')
    .update({
      quantity: quantity,
      condition: condition,
      notes: notes,
      for_trade: for_trade
    })
    .eq('id', id)
    .eq('user_id', userId);
  
  if (error) {
    throw new Error(`Error updating collection: ${error.message}`);
  }
  
  return new Response(JSON.stringify({ success: true }), { 
    headers: { ...corsHeaders, 'Content-Type': 'application/json' },
  });
}

// Remove card from user's collection
async function removeCardFromCollection(supabase, userId: string, cardId: string) {
  const { error } = await supabase
    .from('user_collections')
    .delete()
    .eq('card_id', cardId)
    .eq('user_id', userId);
  
  if (error) {
    throw new Error(`Error removing card from collection: ${error.message}`);
  }
  
  return new Response(JSON.stringify({ success: true }), { 
    headers: { ...corsHeaders, 'Content-Type': 'application/json' },
  });
}
