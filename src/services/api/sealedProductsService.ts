// Sealed-product catalogue, served from the `sealed_products` mirror
// (populated from tcgcsv.com by the refresh-sealed-products edge function).
// Replaces the old synthetic product list + the never-configured eBay call.

import { supabase } from "@/integrations/supabase/client";
import { usdToGbp } from "@/services/currencyService";

export interface SealedProduct {
  id: number;
  setId: string | null;
  groupName: string | null;
  name: string;
  productType: string;
  imageUrl: string | null;
  tcgplayerUrl: string | null;
  /** TCGplayer market price in GBP, or null when unpriced. */
  marketPrice: number | null;
  releasedOn: string | null;
}

/** Shape expected by <ProductCard />. */
export interface SealedProductCard {
  id: string;
  name: string;
  series?: string;
  setId: string;
  productType: string;
  releaseDate?: string;
  imageUrl?: string;
  msrp?: number;
  tcgplayerUrl?: string;
}

interface SealedRow {
  id: number;
  set_id: string | null;
  group_name: string | null;
  name: string;
  product_type: string | null;
  image_url: string | null;
  tcgplayer_url: string | null;
  market_price_usd: number | null;
  released_on: string | null;
}

// Sort so the products collectors care about lead.
const TYPE_ORDER: Record<string, number> = {
  box: 0,
  etb: 1,
  bundle: 2,
  tin: 3,
  "blister-pack": 4,
  "booster-pack": 5,
  deck: 6,
  case: 7,
  other: 8,
};

const toProduct = (r: SealedRow): SealedProduct => ({
  id: r.id,
  setId: r.set_id,
  groupName: r.group_name,
  name: r.name,
  productType: r.product_type ?? "other",
  imageUrl: r.image_url,
  tcgplayerUrl: r.tcgplayer_url,
  marketPrice: r.market_price_usd != null ? usdToGbp(Number(r.market_price_usd)) : null,
  releasedOn: r.released_on,
});

const sortProducts = (a: SealedProduct, b: SealedProduct) => {
  const t = (TYPE_ORDER[a.productType] ?? 9) - (TYPE_ORDER[b.productType] ?? 9);
  if (t !== 0) return t;
  return (b.marketPrice ?? 0) - (a.marketPrice ?? 0);
};

export const toProductCard = (p: SealedProduct): SealedProductCard => ({
  id: String(p.id),
  name: p.name,
  series: p.groupName ?? undefined,
  setId: p.setId ?? "",
  productType: p.productType,
  releaseDate: p.releasedOn ?? undefined,
  imageUrl: p.imageUrl ?? undefined,
  msrp: p.marketPrice ?? undefined,
  tcgplayerUrl: p.tcgplayerUrl ?? undefined,
});

const SELECT =
  "id, set_id, group_name, name, product_type, image_url, tcgplayer_url, market_price_usd, released_on";

// Digital redemption codes are excluded server-side too, but guard here as well.
const NO_CODE_CARDS = "Code Card%";

/** All sealed products for one set (by our pokemon_sets id). */
export async function getSealedProductsForSet(setId: string): Promise<SealedProduct[]> {
  const { data, error } = await supabase
    .from("sealed_products")
    .select(SELECT)
    .eq("set_id", setId)
    .not("name", "ilike", NO_CODE_CARDS);
  if (error) throw error;
  return (data ?? []).map((r) => toProduct(r as SealedRow)).sort(sortProducts);
}

/** Paged feed of sealed products across all sets, newest sets first. */
export async function getSealedProducts(page = 1, pageSize = 24): Promise<SealedProduct[]> {
  const from = (page - 1) * pageSize;
  const { data, error } = await supabase
    .from("sealed_products")
    .select(SELECT)
    .not("name", "ilike", NO_CODE_CARDS)
    .order("released_on", { ascending: false, nullsFirst: false })
    .order("market_price_usd", { ascending: false, nullsFirst: false })
    .range(from, from + pageSize - 1);
  if (error) throw error;
  return (data ?? []).map((r) => toProduct(r as SealedRow));
}

/** ProductCard-shaped feed for the /products page. */
export async function getSealedProductCards(page = 1, pageSize = 24): Promise<SealedProductCard[]> {
  return (await getSealedProducts(page, pageSize)).map(toProductCard);
}
