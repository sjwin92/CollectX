
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
    
    // Handle different endpoints
    if (req.method === 'GET') {
      if (path === 'list') {
        return await getTradesList(supabase, userId);
      } else if (path === 'detail') {
        const tradeId = url.searchParams.get('id');
        if (!tradeId) {
          return new Response(JSON.stringify({ error: 'Trade ID is required' }), { 
            status: 400, 
            headers: { ...corsHeaders, 'Content-Type': 'application/json' }
          });
        }
        return await getTradeDetail(supabase, tradeId, userId);
      }
    } else if (req.method === 'POST') {
      if (path === 'create') {
        const body = await req.json();
        return await createTrade(supabase, userId, body);
      } else if (path === 'respond') {
        const body = await req.json();
        return await respondToTrade(supabase, userId, body);
      } else if (path === 'message') {
        const body = await req.json();
        return await addTradeMessage(supabase, userId, body);
      }
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

// Get list of trades for a user
async function getTradesList(supabase, userId: string) {
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
    .order('updated_at', { ascending: false });
  
  if (error) {
    throw new Error(`Error fetching trades: ${error.message}`);
  }
  
  // Get cards for each trade
  const tradesWithCards = await Promise.all(data.map(async (trade) => {
    const { data: cards, error: cardsError } = await supabase
      .from('trade_cards')
      .select(`
        id,
        user_id,
        condition,
        estimated_value,
        currency,
        pokemon_cards_cache (id, name, data, image_url)
      `)
      .eq('trade_id', trade.id);
    
    if (cardsError) {
      console.error(`Error fetching cards for trade ${trade.id}:`, cardsError);
      return { ...trade, cards: [] };
    }
    
    const formattedCards = cards.map(item => ({
      id: item.id,
      user_id: item.user_id,
      condition: item.condition,
      estimated_value: item.estimated_value,
      currency: item.currency,
      card: item.pokemon_cards_cache.data
    }));
    
    return { ...trade, cards: formattedCards };
  }));
  
  return new Response(JSON.stringify({ data: tradesWithCards }), { 
    headers: { ...corsHeaders, 'Content-Type': 'application/json' },
  });
}

// Get details of a specific trade
async function getTradeDetail(supabase, tradeId: string, userId: string) {
  // Get the trade
  const { data: trade, error } = await supabase
    .from('trade_proposals')
    .select(`
      id, 
      status, 
      created_at,
      updated_at,
      initiator:initiator_id (id),
      recipient:recipient_id (id)
    `)
    .eq('id', tradeId)
    .or(`initiator_id.eq.${userId},recipient_id.eq.${userId}`)
    .maybeSingle();
  
  if (error) {
    throw new Error(`Error fetching trade: ${error.message}`);
  }
  
  if (!trade) {
    return new Response(JSON.stringify({ error: 'Trade not found or access denied' }), { 
      status: 404, 
      headers: { ...corsHeaders, 'Content-Type': 'application/json' }
    });
  }
  
  // Get cards for this trade
  const { data: cards, error: cardsError } = await supabase
    .from('trade_cards')
    .select(`
      id,
      user_id,
      condition,
      estimated_value,
      currency,
      pokemon_cards_cache (id, name, data, image_url)
    `)
    .eq('trade_id', tradeId);
  
  if (cardsError) {
    throw new Error(`Error fetching trade cards: ${cardsError.message}`);
  }
  
  // Get messages for this trade
  const { data: messages, error: messagesError } = await supabase
    .from('trade_messages')
    .select('id, message, system_message, created_at, user_id')
    .eq('trade_id', tradeId)
    .order('created_at', { ascending: true });
  
  if (messagesError) {
    throw new Error(`Error fetching trade messages: ${messagesError.message}`);
  }
  
  // Format the response
  const formattedCards = cards.map(item => ({
    id: item.id,
    user_id: item.user_id,
    condition: item.condition,
    estimated_value: item.estimated_value,
    currency: item.currency,
    card: item.pokemon_cards_cache.data
  }));
  
  const tradeDetail = {
    ...trade,
    cards: formattedCards,
    messages: messages
  };
  
  return new Response(JSON.stringify({ data: tradeDetail }), { 
    headers: { ...corsHeaders, 'Content-Type': 'application/json' },
  });
}

// Create a new trade
async function createTrade(supabase, userId: string, body: any) {
  const { recipient_id, cards, message } = body;
  
  if (!cards || !Array.isArray(cards) || cards.length === 0) {
    return new Response(JSON.stringify({ error: 'At least one card must be offered' }), { 
      status: 400, 
      headers: { ...corsHeaders, 'Content-Type': 'application/json' }
    });
  }
  
  // Start a transaction
  const { data: tradeData, error: tradeError } = await supabase
    .from('trade_proposals')
    .insert({
      initiator_id: userId,
      recipient_id: recipient_id,
      status: 'proposed',
      created_at: new Date(),
      updated_at: new Date()
    })
    .select('id')
    .single();
  
  if (tradeError) {
    throw new Error(`Error creating trade: ${tradeError.message}`);
  }
  
  const tradeId = tradeData.id;
  
  // Add cards to the trade
  const tradeCards = cards.map(card => ({
    trade_id: tradeId,
    user_id: userId,
    card_id: card.id,
    condition: card.condition || 'Near Mint',
    estimated_value: card.estimated_value || null,
    currency: card.currency || 'USD'
  }));
  
  const { error: cardsError } = await supabase
    .from('trade_cards')
    .insert(tradeCards);
  
  if (cardsError) {
    throw new Error(`Error adding cards to trade: ${cardsError.message}`);
  }
  
  // Add initial message if provided
  if (message) {
    const { error: messageError } = await supabase
      .from('trade_messages')
      .insert({
        trade_id: tradeId,
        user_id: userId,
        message: message,
        system_message: false,
        created_at: new Date()
      });
    
    if (messageError) {
      console.error('Error adding message to trade:', messageError);
    }
  }
  
  // Add system message to record trade creation
  const { error: systemMessageError } = await supabase
    .from('trade_messages')
    .insert({
      trade_id: tradeId,
      user_id: userId,
      message: 'Trade proposal created',
      system_message: true,
      created_at: new Date()
    });
  
  if (systemMessageError) {
    console.error('Error adding system message:', systemMessageError);
  }
  
  return new Response(JSON.stringify({ success: true, trade_id: tradeId }), { 
    headers: { ...corsHeaders, 'Content-Type': 'application/json' },
  });
}

// Respond to a trade (accept/reject/counter)
async function respondToTrade(supabase, userId: string, body: any) {
  const { trade_id, action, counter_cards, message } = body;
  
  if (!trade_id) {
    return new Response(JSON.stringify({ error: 'Trade ID is required' }), { 
      status: 400, 
      headers: { ...corsHeaders, 'Content-Type': 'application/json' }
    });
  }
  
  // Verify user is recipient of the trade
  const { data: trade, error: tradeError } = await supabase
    .from('trade_proposals')
    .select('initiator_id, recipient_id, status')
    .eq('id', trade_id)
    .maybeSingle();
  
  if (tradeError) {
    throw new Error(`Error fetching trade: ${tradeError.message}`);
  }
  
  if (!trade) {
    return new Response(JSON.stringify({ error: 'Trade not found' }), { 
      status: 404, 
      headers: { ...corsHeaders, 'Content-Type': 'application/json' }
    });
  }
  
  // Only recipient can accept/reject/counter
  if (trade.recipient_id !== userId) {
    return new Response(JSON.stringify({ error: 'Only the trade recipient can respond to the trade' }), { 
      status: 403, 
      headers: { ...corsHeaders, 'Content-Type': 'application/json' }
    });
  }
  
  // Trade must be in proposed or countered state
  if (trade.status !== 'proposed' && trade.status !== 'countered') {
    return new Response(JSON.stringify({ error: `Cannot respond to trade in ${trade.status} state` }), { 
      status: 400, 
      headers: { ...corsHeaders, 'Content-Type': 'application/json' }
    });
  }
  
  // Handle the specified action
  if (action === 'accept') {
    // Update trade status
    const { error: updateError } = await supabase
      .from('trade_proposals')
      .update({
        status: 'accepted',
        updated_at: new Date()
      })
      .eq('id', trade_id);
    
    if (updateError) {
      throw new Error(`Error accepting trade: ${updateError.message}`);
    }
    
    // Add system message
    await supabase
      .from('trade_messages')
      .insert({
        trade_id: trade_id,
        user_id: userId,
        message: 'Trade accepted',
        system_message: true,
        created_at: new Date()
      });
  } else if (action === 'reject') {
    // Update trade status
    const { error: updateError } = await supabase
      .from('trade_proposals')
      .update({
        status: 'rejected',
        updated_at: new Date()
      })
      .eq('id', trade_id);
    
    if (updateError) {
      throw new Error(`Error rejecting trade: ${updateError.message}`);
    }
    
    // Add system message
    await supabase
      .from('trade_messages')
      .insert({
        trade_id: trade_id,
        user_id: userId,
        message: 'Trade rejected',
        system_message: true,
        created_at: new Date()
      });
  } else if (action === 'counter') {
    // Validate counter offer
    if (!counter_cards || !Array.isArray(counter_cards) || counter_cards.length === 0) {
      return new Response(JSON.stringify({ error: 'Counter offer must include at least one card' }), { 
        status: 400, 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      });
    }
    
    // Update trade status
    const { error: updateError } = await supabase
      .from('trade_proposals')
      .update({
        status: 'countered',
        updated_at: new Date()
      })
      .eq('id', trade_id);
    
    if (updateError) {
      throw new Error(`Error making counter offer: ${updateError.message}`);
    }
    
    // Add counter cards to the trade
    const tradeCards = counter_cards.map(card => ({
      trade_id: trade_id,
      user_id: userId,
      card_id: card.id,
      condition: card.condition || 'Near Mint',
      estimated_value: card.estimated_value || null,
      currency: card.currency || 'USD'
    }));
    
    const { error: cardsError } = await supabase
      .from('trade_cards')
      .insert(tradeCards);
    
    if (cardsError) {
      throw new Error(`Error adding counter cards to trade: ${cardsError.message}`);
    }
    
    // Add system message
    await supabase
      .from('trade_messages')
      .insert({
        trade_id: trade_id,
        user_id: userId,
        message: 'Counter offer made',
        system_message: true,
        created_at: new Date()
      });
  } else {
    return new Response(JSON.stringify({ error: 'Invalid action. Must be accept, reject, or counter' }), { 
      status: 400, 
      headers: { ...corsHeaders, 'Content-Type': 'application/json' }
    });
  }
  
  // Add message if provided
  if (message) {
    await supabase
      .from('trade_messages')
      .insert({
        trade_id: trade_id,
        user_id: userId,
        message: message,
        system_message: false,
        created_at: new Date()
      });
  }
  
  return new Response(JSON.stringify({ success: true }), { 
    headers: { ...corsHeaders, 'Content-Type': 'application/json' },
  });
}

// Add a message to a trade
async function addTradeMessage(supabase, userId: string, body: any) {
  const { trade_id, message } = body;
  
  if (!trade_id) {
    return new Response(JSON.stringify({ error: 'Trade ID is required' }), { 
      status: 400, 
      headers: { ...corsHeaders, 'Content-Type': 'application/json' }
    });
  }
  
  if (!message) {
    return new Response(JSON.stringify({ error: 'Message text is required' }), { 
      status: 400, 
      headers: { ...corsHeaders, 'Content-Type': 'application/json' }
    });
  }
  
  // Verify user is part of the trade
  const { data: trade, error: tradeError } = await supabase
    .from('trade_proposals')
    .select('initiator_id, recipient_id, status')
    .eq('id', trade_id)
    .maybeSingle();
  
  if (tradeError) {
    throw new Response(JSON.stringify({ error: `Error fetching trade: ${tradeError.message}` }), { 
      status: 500, 
      headers: { ...corsHeaders, 'Content-Type': 'application/json' }
    });
  }
  
  if (!trade) {
    return new Response(JSON.stringify({ error: 'Trade not found' }), { 
      status: 404, 
      headers: { ...corsHeaders, 'Content-Type': 'application/json' }
    });
  }
  
  if (trade.initiator_id !== userId && trade.recipient_id !== userId) {
    return new Response(JSON.stringify({ error: 'You are not a participant in this trade' }), { 
      status: 403, 
      headers: { ...corsHeaders, 'Content-Type': 'application/json' }
    });
  }
  
  // Add message
  const { error: messageError } = await supabase
    .from('trade_messages')
    .insert({
      trade_id: trade_id,
      user_id: userId,
      message: message,
      system_message: false,
      created_at: new Date()
    });
  
  if (messageError) {
    throw new Error(`Error adding message: ${messageError.message}`);
  }
  
  // Update trade updated_at
  await supabase
    .from('trade_proposals')
    .update({ updated_at: new Date() })
    .eq('id', trade_id);
  
  return new Response(JSON.stringify({ success: true }), { 
    headers: { ...corsHeaders, 'Content-Type': 'application/json' },
  });
}
