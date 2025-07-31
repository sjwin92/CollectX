import "https://deno.land/x/xhr@0.1.0/mod.ts";
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const openAIApiKey = Deno.env.get('OPENAI_API_KEY');

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { query } = await req.json();

    const response = await fetch('https://api.openai.com/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${openAIApiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: 'gpt-4o-mini',
        messages: [
          {
            role: 'system',
            content: `You are a Pokemon card search assistant. Help users find Pokemon cards by interpreting their natural language queries.

Transform user queries into structured search parameters:
- Extract card names (e.g., "Charizard", "Pikachu")
- Identify set names or codes (e.g., "Base Set", "SVI", "Stellar Crown")
- Recognize card numbers (e.g., "25/100", "SVI025")
- Understand rarities (e.g., "rare", "ultra rare", "secret rare")
- Interpret types (e.g., "fire type", "electric")

Return a JSON object with these possible fields:
{
  "name": "extracted card name",
  "setName": "set name if mentioned",
  "setCode": "set code if mentioned", 
  "cardNumber": "card number if mentioned",
  "rarity": "rarity if mentioned",
  "type": "pokemon type if mentioned",
  "searchTerms": ["alternative", "search", "terms"],
  "interpretation": "human readable interpretation of the query"
}

Examples:
- "looking for a shiny charizard" → {"name": "Charizard", "rarity": "secret rare", "interpretation": "Searching for Secret Rare Charizard cards"}
- "pikachu from base set" → {"name": "Pikachu", "setName": "Base Set", "interpretation": "Searching for Pikachu cards from Base Set"}
- "card 25 from any set" → {"cardNumber": "25", "interpretation": "Searching for card number 25 from any set"}`
          },
          {
            role: 'user',
            content: query
          }
        ],
        temperature: 0.3,
      }),
    });

    const data = await response.json();
    const aiResponse = data.choices[0].message.content;
    
    try {
      const parsedResponse = JSON.parse(aiResponse);
      return new Response(JSON.stringify(parsedResponse), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    } catch (parseError) {
      return new Response(JSON.stringify({ 
        interpretation: aiResponse,
        error: "Could not parse AI response" 
      }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

  } catch (error) {
    console.error('Error in ai-card-search function:', error);
    return new Response(JSON.stringify({ error: error.message }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});