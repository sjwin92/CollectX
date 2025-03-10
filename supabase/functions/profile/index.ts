
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
  
  try {
    // Get and verify JWT for non-public endpoints
    const url = new URL(req.url);
    const path = url.pathname.split('/').pop() || '';
    
    if (path !== 'public') {
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
    }
    
    if (req.method === 'GET') {
      if (path === 'user') {
        const userId = url.searchParams.get('id');
        if (!userId) {
          return new Response(JSON.stringify({ error: 'User ID is required' }), { 
            status: 400, 
            headers: { ...corsHeaders, 'Content-Type': 'application/json' }
          });
        }
        return await getUserProfile(supabase, userId);
      } else if (path === 'stats') {
        const userId = url.searchParams.get('id');
        if (!userId) {
          return new Response(JSON.stringify({ error: 'User ID is required' }), { 
            status: 400, 
            headers: { ...corsHeaders, 'Content-Type': 'application/json' }
          });
        }
        return await getUserStats(supabase, userId);
      } else if (path === 'trades') {
        const userId = url.searchParams.get('id');
        if (!userId) {
          return new Response(JSON.stringify({ error: 'User ID is required' }), { 
            status: 400, 
            headers: { ...corsHeaders, 'Content-Type': 'application/json' }
          });
        }
        return await getUserTradeHistory(supabase, userId);
      } else if (path === 'public') {
        const username = url.searchParams.get('username');
        if (!username) {
          return new Response(JSON.stringify({ error: 'Username is required' }), { 
            status: 400, 
            headers: { ...corsHeaders, 'Content-Type': 'application/json' }
          });
        }
        return await getPublicProfile(supabase, username);
      }
    } else if (req.method === 'POST' && path === 'update') {
      const body = await req.json();
      return await updateUserProfile(supabase, body);
    }
    
    return new Response(JSON.stringify({ error: 'Invalid endpoint or method' }), { 
      status: 400, 
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

// Get basic user profile
async function getUserProfile(supabase, userId: string) {
  const { data: userData, error: userError } = await supabase.auth.admin.getUserById(userId);
  
  if (userError) {
    throw new Error(`Error fetching user: ${userError.message}`);
  }
  
  if (!userData || !userData.user) {
    return new Response(JSON.stringify({ error: 'User not found' }), { 
      status: 404, 
      headers: { ...corsHeaders, 'Content-Type': 'application/json' }
    });
  }
  
  // Format response
  const profile = {
    id: userData.user.id,
    email: userData.user.email,
    username: userData.user.user_metadata?.username || userData.user.email?.split('@')[0] || "User",
    created_at: userData.user.created_at,
    last_sign_in_at: userData.user.last_sign_in_at
  };
  
  return new Response(JSON.stringify({ data: profile }), { 
    headers: { ...corsHeaders, 'Content-Type': 'application/json' },
  });
}

// Get user collection stats
async function getUserStats(supabase, userId: string) {
  // Get collection count
  const { count: collectionCount, error: collectionError } = await supabase
    .from('user_collections')
    .select('id', { count: 'exact', head: true })
    .eq('user_id', userId);
  
  if (collectionError) {
    throw new Error(`Error fetching collection count: ${collectionError.message}`);
  }
  
  // Get trade counts
  const { data: tradeData, error: tradeError } = await supabase
    .from('trade_proposals')
    .select(`
      id,
      status
    `)
    .or(`initiator_id.eq.${userId},recipient_id.eq.${userId}`);
  
  if (tradeError) {
    throw new Error(`Error fetching trade data: ${tradeError.message}`);
  }
  
  const tradeStats = {
    total: tradeData.length,
    completed: tradeData.filter(t => t.status === 'accepted').length,
    pending: tradeData.filter(t => t.status === 'proposed' || t.status === 'countered').length,
    rejected: tradeData.filter(t => t.status === 'rejected').length
  };
  
  // Get for_trade count
  const { count: forTradeCount, error: forTradeError } = await supabase
    .from('user_collections')
    .select('id', { count: 'exact', head: true })
    .eq('user_id', userId)
    .eq('for_trade', true);
  
  if (forTradeError) {
    throw new Error(`Error fetching for_trade count: ${forTradeError.message}`);
  }
  
  // Get card value estimation
  const { data: valueData, error: valueError } = await supabase
    .from('user_collections')
    .select(`
      pokemon_cards_cache (data)
    `)
    .eq('user_id', userId);
  
  if (valueError) {
    throw new Error(`Error fetching collection value: ${valueError.message}`);
  }
  
  // Calculate collection value (if price data is available)
  let totalValue = 0;
  let cardsWithPrice = 0;
  
  for (const item of valueData) {
    if (item.pokemon_cards_cache?.data?.tcgplayer?.prices) {
      const prices = item.pokemon_cards_cache.data.tcgplayer.prices;
      let price = 0;
      
      if (prices.holofoil?.market) {
        price = prices.holofoil.market;
      } else if (prices.normal?.market) {
        price = prices.normal.market;
      } else if (prices.reverseHolofoil?.market) {
        price = prices.reverseHolofoil.market;
      }
      
      if (price > 0) {
        totalValue += price;
        cardsWithPrice++;
      }
    }
  }
  
  const stats = {
    collection_size: collectionCount || 0,
    for_trade_count: forTradeCount || 0,
    trade_stats: tradeStats,
    estimated_value: totalValue.toFixed(2),
    cards_with_price: cardsWithPrice,
    average_card_value: cardsWithPrice > 0 ? (totalValue / cardsWithPrice).toFixed(2) : '0.00'
  };
  
  return new Response(JSON.stringify({ data: stats }), { 
    headers: { ...corsHeaders, 'Content-Type': 'application/json' },
  });
}

// Get user trade history
async function getUserTradeHistory(supabase, userId: string) {
  const { data, error } = await supabase
    .from('trade_proposals')
    .select(`
      id, 
      status, 
      created_at,
      updated_at,
      initiator:initiator_id (id),
      recipient:recipient_id (id)
    `)
    .or(`initiator_id.eq.${userId},recipient_id.eq.${userId}`)
    .order('updated_at', { ascending: false })
    .limit(20);
  
  if (error) {
    throw new Error(`Error fetching trade history: ${error.message}`);
  }
  
  return new Response(JSON.stringify({ data }), { 
    headers: { ...corsHeaders, 'Content-Type': 'application/json' },
  });
}

// Get public profile by username (no auth required)
async function getPublicProfile(supabase, username: string) {
  // Find user by username in user_metadata
  const { data: users, error: userError } = await supabase.auth.admin.listUsers({
    page: 1,
    perPage: 20,
  });
  
  if (userError) {
    throw new Error(`Error searching for user: ${userError.message}`);
  }
  
  const matchedUser = users.users.find(u => 
    (u.user_metadata?.username && u.user_metadata.username.toLowerCase() === username.toLowerCase()) ||
    (u.email && u.email.split('@')[0].toLowerCase() === username.toLowerCase())
  );
  
  if (!matchedUser) {
    return new Response(JSON.stringify({ error: 'User not found' }), { 
      status: 404, 
      headers: { ...corsHeaders, 'Content-Type': 'application/json' }
    });
  }
  
  // Get user's tradable cards
  const { data: forTradeData, error: tradeError } = await supabase
    .from('user_collections')
    .select(`
      id,
      condition,
      pokemon_cards_cache (id, name, data, image_url)
    `)
    .eq('user_id', matchedUser.id)
    .eq('for_trade', true)
    .limit(50);
  
  if (tradeError) {
    throw new Error(`Error fetching tradable cards: ${tradeError.message}`);
  }
  
  // Format response
  const tradableCards = forTradeData.map(item => ({
    id: item.id,
    condition: item.condition,
    card: item.pokemon_cards_cache.data
  }));
  
  const profile = {
    id: matchedUser.id,
    username: matchedUser.user_metadata?.username || matchedUser.email?.split('@')[0] || "User",
    last_active: matchedUser.last_sign_in_at,
    created_at: matchedUser.created_at,
    cards_for_trade: tradableCards,
    cards_for_trade_count: tradableCards.length
  };
  
  return new Response(JSON.stringify({ data: profile }), { 
    headers: { ...corsHeaders, 'Content-Type': 'application/json' },
  });
}

// Update user profile
async function updateUserProfile(supabase, body: any) {
  const { userId, metadata } = body;
  
  if (!userId) {
    return new Response(JSON.stringify({ error: 'User ID is required' }), { 
      status: 400, 
      headers: { ...corsHeaders, 'Content-Type': 'application/json' }
    });
  }
  
  // Update user metadata
  const { error } = await supabase.auth.admin.updateUserById(userId, {
    user_metadata: metadata
  });
  
  if (error) {
    throw new Error(`Error updating user profile: ${error.message}`);
  }
  
  return new Response(JSON.stringify({ success: true }), { 
    headers: { ...corsHeaders, 'Content-Type': 'application/json' },
  });
}
