import { createClient } from "@supabase/supabase-js";
import { defineTool, type ToolContext } from "@lovable.dev/mcp-js";
import { z } from "zod";

function userClient(ctx: ToolContext) {
  return createClient(process.env.SUPABASE_URL!, process.env.SUPABASE_PUBLISHABLE_KEY!, {
    global: { headers: { Authorization: `Bearer ${ctx.getToken()}` } },
    auth: { persistSession: false, autoRefreshToken: false },
  });
}

export default defineTool({
  name: "list_my_collection",
  title: "List my collection",
  description:
    "List the signed-in user's collected cards. Optionally filter by name or for_trade flag.",
  inputSchema: {
    name: z.string().trim().min(1).optional().describe("Filter by card name (partial match)."),
    forTradeOnly: z.boolean().optional().describe("If true, only return cards marked for trade."),
    limit: z.number().int().min(1).max(100).optional().describe("Max results, default 50."),
  },
  annotations: { readOnlyHint: true, idempotentHint: true, openWorldHint: false },
  handler: async ({ name, forTradeOnly, limit }, ctx) => {
    if (!ctx.isAuthenticated())
      return { content: [{ type: "text", text: "Not authenticated" }], isError: true };
    let q = userClient(ctx)
      .from("user_cards")
      .select(
        "id, card_id, card_name, card_number, condition, grading_company, grade_score, for_trade, for_sale, product_type, quantity, created_at",
      )
      .eq("user_id", ctx.getUserId())
      .limit(limit ?? 50);
    if (name) q = q.ilike("card_name", `%${name}%`);
    if (forTradeOnly) q = q.eq("for_trade", true);
    const { data, error } = await q;
    if (error) return { content: [{ type: "text", text: error.message }], isError: true };
    return {
      content: [{ type: "text", text: JSON.stringify(data ?? []) }],
      structuredContent: { cards: data ?? [], count: data?.length ?? 0 },
    };
  },
});
