import { createClient } from "@supabase/supabase-js";
import { defineTool } from "@lovable.dev/mcp-js";
import { z } from "zod";

function publicClient() {
  return createClient(process.env.SUPABASE_URL!, process.env.SUPABASE_PUBLISHABLE_KEY!, {
    auth: { persistSession: false, autoRefreshToken: false },
  });
}

export default defineTool({
  name: "search_pokemon_cards",
  title: "Search Pokémon cards",
  description:
    "Search the CollectX Pokémon card catalog by name and/or set ID. Returns up to `limit` cards (default 20, max 50).",
  inputSchema: {
    name: z.string().trim().min(1).optional().describe("Card name (partial match)."),
    setId: z.string().trim().min(1).optional().describe("Set ID to filter by."),
    limit: z.number().int().min(1).max(50).optional().describe("Max results, default 20."),
  },
  annotations: { readOnlyHint: true, idempotentHint: true, openWorldHint: false },
  handler: async ({ name, setId, limit }) => {
    const supabase = publicClient();
    let q = supabase
      .from("pokemon_cards")
      .select("id, name, number, rarity, set_id, image_small")
      .limit(limit ?? 20);
    if (name) q = q.ilike("name", `%${name}%`);
    if (setId) q = q.eq("set_id", setId);
    const { data, error } = await q;
    if (error) return { content: [{ type: "text", text: error.message }], isError: true };
    return {
      content: [{ type: "text", text: JSON.stringify(data ?? []) }],
      structuredContent: { cards: data ?? [] },
    };
  },
});
