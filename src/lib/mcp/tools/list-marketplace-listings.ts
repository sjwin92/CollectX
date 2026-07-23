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
  name: "list_marketplace_listings",
  title: "List marketplace listings",
  description:
    "Browse active card-for-card marketplace listings. Optionally filter by card name.",
  inputSchema: {
    name: z.string().trim().min(1).optional().describe("Filter by card name (partial match)."),
    limit: z.number().int().min(1).max(50).optional().describe("Max results, default 20."),
  },
  annotations: { readOnlyHint: true, idempotentHint: true, openWorldHint: false },
  handler: async ({ name, limit }, ctx) => {
    if (!ctx.isAuthenticated())
      return { content: [{ type: "text", text: "Not authenticated" }], isError: true };
    let q = userClient(ctx)
      .from("marketplace_listings")
      .select("id, user_id, card_id, card_name, condition, quantity, status, created_at")
      .eq("status", "active")
      .order("created_at", { ascending: false })
      .limit(limit ?? 20);
    if (name) q = q.ilike("card_name", `%${name}%`);
    const { data, error } = await q;
    if (error) return { content: [{ type: "text", text: error.message }], isError: true };
    return {
      content: [{ type: "text", text: JSON.stringify(data ?? []) }],
      structuredContent: { listings: data ?? [], count: data?.length ?? 0 },
    };
  },
});
