import { supabase } from "@/integrations/supabase/client";

type SetImages = { logo?: string; symbol?: string };

class SupabasePokemonService {
  async getBatchSetImages(setIds: string[]): Promise<Record<string, SetImages>> {
    if (setIds.length === 0) return {};

    const { data, error } = await supabase
      .from("set_images")
      .select("set_id,image_url,image_type")
      .in("set_id", setIds)
      .eq("is_working", true)
      .order("last_checked", { ascending: false });

    if (error) throw error;

    const result: Record<string, SetImages> = {};
    for (const item of data ?? []) {
      if (!item.set_id) continue;
      if (!result[item.set_id]) result[item.set_id] = {};

      if (item.image_type === "logo" && !result[item.set_id].logo) {
        result[item.set_id].logo = item.image_url;
      } else if (item.image_type === "symbol" && !result[item.set_id].symbol) {
        result[item.set_id].symbol = item.image_url;
      }
    }

    return result;
  }

  async getSetImages(setId: string): Promise<SetImages> {
    const { data, error } = await supabase
      .from("set_images")
      .select("image_url,image_type")
      .eq("set_id", setId)
      .eq("is_working", true)
      .order("last_checked", { ascending: false });

    if (error) throw error;

    const result: SetImages = {};
    for (const item of data ?? []) {
      if (item.image_type === "logo" && !result.logo) {
        result.logo = item.image_url;
      } else if (item.image_type === "symbol" && !result.symbol) {
        result.symbol = item.image_url;
      }
    }

    return result;
  }
}

// Catalogue mutation is intentionally absent from the browser. Imports are
// performed only by the audited server-side maintenance workflow.
export const supabasePokemonService = new SupabasePokemonService();
