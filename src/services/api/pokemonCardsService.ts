import { supabase } from "@/integrations/supabase/client";
import type { Json } from "@/integrations/supabase/types";
import type { PokemonCard, PokemonCardResponse } from "./pokemonTypes";
import { CARD_BACK_URL } from "./pokemonTypes";
import {
  getAllPossibleImageUrlsFromCardObject,
  getConsistentCardImageUrl,
} from "./cardImageService";
import { getFeaturedCardImageUrl } from "./featuredCardsService";
import { usdToGbp } from "../currencyService";

const cardColumns = `
  id,name,supertype,subtypes,hp,types,set_id,set_name,number,artist,rarity,
  images,tcgplayer_prices,small_image_url,large_image_url,
  pokemon_sets!pokemon_cards_set_id_fkey(
    id,name,series,printed_total,total,ptcgo_code,release_date,legalities,
    images,symbol_url,logo_url
  )
`;

type SetJoin = {
  id: string;
  name: string;
  series: string | null;
  printed_total: number | null;
  total: number | null;
  ptcgo_code: string | null;
  release_date: string | null;
  legalities: Json | null;
  images: Json | null;
  symbol_url: string | null;
  logo_url: string | null;
};

type CardRow = {
  id: string;
  name: string;
  supertype: string | null;
  subtypes: string[] | null;
  hp: string | null;
  types: string[] | null;
  set_id: string | null;
  set_name: string | null;
  number: string | null;
  artist: string | null;
  rarity: string | null;
  images: Json | null;
  tcgplayer_prices: Json | null;
  small_image_url: string | null;
  large_image_url: string | null;
  pokemon_sets: SetJoin | null;
};

const asRecord = (value: Json | null): Record<string, unknown> =>
  value && typeof value === "object" && !Array.isArray(value)
    ? (value as Record<string, unknown>)
    : {};

const mapCard = (row: CardRow): PokemonCard => {
  const set = row.pokemon_sets;
  const setImages = asRecord(set?.images ?? null);
  const images = asRecord(row.images);
  const prices = asRecord(row.tcgplayer_prices);
  const hasPrices = Object.keys(prices).length > 0;

  return {
    id: row.id,
    name: row.name,
    supertype: row.supertype ?? "Unknown",
    subtypes: row.subtypes ?? [],
    hp: row.hp ?? undefined,
    types: row.types ?? undefined,
    set: {
      id: set?.id ?? row.set_id ?? "",
      name: set?.name ?? row.set_name ?? "Unknown set",
      series: set?.series ?? "Unknown series",
      printedTotal: set?.printed_total ?? 0,
      total: set?.total ?? set?.printed_total ?? 0,
      legalities: asRecord(set?.legalities ?? null) as Record<string, string>,
      ptcgoCode: set?.ptcgo_code ?? "",
      releaseDate: set?.release_date ?? "",
      updatedAt: "",
      images: {
        symbol: (setImages.symbol as string | undefined) ?? set?.symbol_url ?? "",
        logo: (setImages.logo as string | undefined) ?? set?.logo_url ?? "",
      },
    },
    number: row.number ?? "",
    artist: row.artist ?? "",
    rarity: row.rarity ?? "Unknown",
    legalities: {},
    images: {
      small: (images.small as string | undefined) ?? row.small_image_url ?? CARD_BACK_URL,
      large:
        (images.large as string | undefined) ??
        row.large_image_url ??
        row.small_image_url ??
        CARD_BACK_URL,
    },
    tcgplayer: hasPrices
      ? {
          url: "",
          updatedAt: "",
          prices: prices as PokemonCard["tcgplayer"] extends { prices: infer P } ? P : never,
        }
      : undefined,
  };
};

const escapeLike = (value: string) => value.replace(/[\\%_]/g, "\\$&");

async function queryCards(
  page: number,
  pageSize: number,
  filters: { name?: string; setId?: string } = {},
): Promise<PokemonCardResponse> {
  const safePage = Math.max(1, page);
  const safePageSize = Math.min(100, Math.max(1, pageSize));
  const from = (safePage - 1) * safePageSize;
  const to = from + safePageSize - 1;

  let query = supabase
    .from("pokemon_cards")
    .select(cardColumns, { count: "exact" });

  if (filters.setId && filters.setId !== "all") {
    query = query.eq("set_id", filters.setId);
  }
  if (filters.name?.trim()) {
    query = query.ilike("name", `%${escapeLike(filters.name.trim())}%`);
  }

  const { data, count, error } = await query
    .order("name", { ascending: true })
    .range(from, to);

  if (error) throw error;
  const rows = (data ?? []) as unknown as CardRow[];
  return {
    data: rows.map(mapCard),
    page: safePage,
    pageSize: safePageSize,
    count: rows.length,
    totalCount: count ?? rows.length,
  };
}

export const getCards = async (
  page = 1,
  pageSize = 20,
  params: Record<string, string> = {},
): Promise<PokemonCardResponse> =>
  queryCards(page, pageSize, { name: params.name, setId: params.setId });

export const getCardById = async (id: string): Promise<PokemonCard> => {
  if (!id) throw new Error("Card ID is required");

  const { data, error } = await supabase
    .from("pokemon_cards")
    .select(cardColumns)
    .eq("id", id)
    .maybeSingle();

  if (error) throw error;
  if (!data) throw new Error("Card not found");
  return mapCard(data as unknown as CardRow);
};

export const buildQueryString = (params: Record<string, string>): string =>
  [
    params.setId && params.setId !== "all" ? `set.id:${params.setId}` : "",
    params.name?.trim() ? `name:*${params.name.trim()}*` : "",
  ]
    .filter(Boolean)
    .join(" ");

export const searchCards = async (
  queryParams: string | Record<string, string>,
  page = 1,
  pageSize = 20,
): Promise<PokemonCardResponse> => {
  if (typeof queryParams === "string") {
    const name = queryParams
      .replace(/^name:\*?/i, "")
      .replace(/\*$/, "")
      .trim();
    return queryCards(page, pageSize, { name });
  }
  return queryCards(page, pageSize, {
    name: queryParams.name,
    setId: queryParams.setId,
  });
};

export const getCardsBySetId = async (
  setId: string,
  page = 1,
  pageSize = 20,
): Promise<PokemonCardResponse> =>
  queryCards(page, pageSize, { setId: setId === "all" ? undefined : setId });

export const getReliableImageUrl = (
  cardId: string,
  size: "small" | "large" = "small",
  isFeatured = false,
): string => {
  if (!cardId) return CARD_BACK_URL;
  return isFeatured
    ? getFeaturedCardImageUrl(cardId, size)
    : getConsistentCardImageUrl(cardId, size);
};

export const mapToTradeCard = (card: PokemonCard, isFeatured = false) => {
  const prices = card.tcgplayer?.prices;
  const price =
    prices?.holofoil?.market ??
    prices?.holofoil?.mid ??
    prices?.normal?.market ??
    prices?.normal?.mid ??
    prices?.reverseHolofoil?.market ??
    prices?.["1stEditionHolofoil"]?.market ??
    prices?.unlimitedHolofoil?.market ??
    0;
  const imageUrls = getAllPossibleImageUrlsFromCardObject(card);

  return {
    id: card.id,
    name: card.name,
    imageUrl: isFeatured
      ? getFeaturedCardImageUrl(card.id)
      : imageUrls[0] ?? CARD_BACK_URL,
    condition: "Near Mint",
    estimatedValue: price > 0 ? usdToGbp(price) : 0,
    currency: "GBP",
  };
};
