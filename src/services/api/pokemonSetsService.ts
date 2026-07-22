import { supabase } from "@/integrations/supabase/client";
import type { PokemonSet, PokemonSetResponse } from "./pokemonTypes";

type SetRow = {
  id: string;
  name: string;
  series: string | null;
  printed_total: number | null;
  total: number | null;
  release_date: string | null;
  legalities: Record<string, string> | null;
  images: { symbol?: string; logo?: string } | null;
  symbol_url: string | null;
  logo_url: string | null;
};

const mapSet = (row: SetRow): PokemonSet => ({
  id: row.id,
  name: row.name,
  series: row.series ?? "Unknown series",
  printedTotal: row.printed_total ?? 0,
  total: row.total ?? row.printed_total ?? 0,
  releaseDate: row.release_date ?? "",
  legalities: row.legalities ?? {},
  images: {
    symbol: row.images?.symbol ?? row.symbol_url ?? "",
    logo: row.images?.logo ?? row.logo_url ?? "",
  },
});

const setColumns =
  "id,name,series,printed_total,total,release_date,legalities,images,symbol_url,logo_url";

export const getSets = async (page = 1, pageSize = 20): Promise<PokemonSetResponse> => {
  const safePage = Math.max(1, page);
  const safePageSize = Math.min(250, Math.max(1, pageSize));
  const from = (safePage - 1) * safePageSize;
  const to = from + safePageSize - 1;

  const { data, count, error } = await supabase
    .from("pokemon_sets")
    .select(setColumns, { count: "exact" })
    .order("release_date", { ascending: false })
    .range(from, to);

  if (error) throw error;
  const rows = (data ?? []) as unknown as SetRow[];
  return {
    data: rows.map(mapSet),
    page: safePage,
    pageSize: safePageSize,
    count: rows.length,
    totalCount: count ?? rows.length,
  };
};

export const getAllSets = async (): Promise<PokemonSet[]> => {
  const { data, error } = await supabase
    .from("pokemon_sets")
    .select(setColumns)
    .order("release_date", { ascending: false });

  if (error) throw error;
  return ((data ?? []) as unknown as SetRow[]).map(mapSet);
};

export const getSetById = async (setId: string): Promise<PokemonSet | null> => {
  const { data, error } = await supabase
    .from("pokemon_sets")
    .select(setColumns)
    .eq("id", setId)
    .maybeSingle();

  if (error) throw error;
  return data ? mapSet(data as unknown as SetRow) : null;
};

export const getSetInfoForCard = async (cardId: string): Promise<PokemonSet | null> => {
  const setId = cardId?.split("-")[0];
  return setId ? getSetById(setId) : null;
};
