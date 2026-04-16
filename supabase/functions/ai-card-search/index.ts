import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const anthropicApiKey = Deno.env.get('ANTHROPIC_API_KEY');
    if (!anthropicApiKey) {
      return new Response(JSON.stringify({ error: 'ANTHROPIC_API_KEY not configured' }), {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const { query } = await req.json();
    if (!query) {
      return new Response(JSON.stringify({ error: 'query is required' }), {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const response = await fetch('https://api.anthropic.com/v1/messages', {
      method: 'POST',
      headers: {
        'x-api-key': anthropicApiKey,
        'anthropic-version': '2023-06-01',
        'content-type': 'application/json',
      },
      body: JSON.stringify({
        model: 'claude-haiku-4-5-20251001',
        max_tokens: 512,
        system: `You are a Pokemon TCG card search assistant. Transform natural language queries into structured search parameters for the Pokemon TCG API.

Return ONLY a valid JSON object with these optional fields:
{
  "name": "card name",
  "setName": "set name if mentioned",
  "setCode": "set code if mentioned",
  "cardNumber": "card number if mentioned",
  "rarity": "rarity if mentioned",
  "type": "pokemon type if mentioned",
  "searchTerms": ["alternative", "terms"],
  "interpretation": "human readable summary"
}

Examples:
- "shiny charizard" → {"name":"Charizard","rarity":"secret rare","interpretation":"Secret Rare Charizard cards"}
- "pikachu base set" → {"name":"Pikachu","setName":"Base Set","interpretation":"Pikachu from Base Set"}
- "card 25" → {"cardNumber":"25","interpretation":"Card number 25 from any set"}`,
        messages: [{ role: 'user', content: query }],
      }),
    });

    if (!response.ok) {
      const err = await response.text();
      throw new Error(`Claude API error ${response.status}: ${err}`);
    }

    const data = await response.json();
    const text = data.content?.[0]?.text || '';

    try {
      // Strip markdown code fences if present
      const cleaned = text.replace(/```json?\n?/g, '').replace(/```/g, '').trim();
      return new Response(JSON.stringify(JSON.parse(cleaned)), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    } catch {
      return new Response(JSON.stringify({ interpretation: text }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }
  } catch (error) {
    console.error('Error in ai-card-search:', error);
    return new Response(JSON.stringify({ error: error.message }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});
