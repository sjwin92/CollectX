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
  name: "list_my_trades",
  title: "List my trades",
  description:
    "List trades where the signed-in user is a participant (initiator or recipient). Optionally filter by status.",
  inputSchema: {
    status: z
      .enum(["proposed", "accepted", "shipped", "completed", "disputed", "cancelled"])
      .optional()
      .describe("Filter by trade status."),
    limit: z.number().int().min(1).max(100).optional().describe("Max results, default 25."),
  },
  annotations: { readOnlyHint: true, idempotentHint: true, openWorldHint: false },
  handler: async ({ status, limit }, ctx) => {
    if (!ctx.isAuthenticated())
      return { content: [{ type: "text", text: "Not authenticated" }], isError: true };
    const uid = ctx.getUserId();
    let q = userClient(ctx)
      .from("trades")
      .select("id, status, initiator_user_id, recipient_user_id, created_at, updated_at")
      .or(`initiator_user_id.eq.${uid},recipient_user_id.eq.${uid}`)
      .order("updated_at", { ascending: false })
      .limit(limit ?? 25);
    if (status) q = q.eq("status", status);
    const { data, error } = await q;
    if (error) return { content: [{ type: "text", text: error.message }], isError: true };
    return {
      content: [{ type: "text", text: JSON.stringify(data ?? []) }],
      structuredContent: { trades: data ?? [], count: data?.length ?? 0 },
    };
  },
});
