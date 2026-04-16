
// Service for resolving Pokemon TCG product images.
// The Pokemon TCG API only reliably hosts set logos/symbols — not per-product images.
// We return the set logo as the product image (best available source) rather than
// probing dozens of HEAD requests per page load.

export interface ProductImageUrls {
  primary: string;
  fallback: string[];
}

export const getProductImageUrls = (_setId: string, _productType: string, _setName: string): ProductImageUrls => {
  const primary = `https://images.pokemontcg.io/${_setId}/logo.png`;
  return { primary, fallback: [`https://images.pokemontcg.io/${_setId}/symbol.png`] };
};

// Simple in-memory cache so each set/type combo is resolved once per session
const imageCache = new Map<string, string>();

export const resolveProductImage = async (
  setId: string,
  productType: string,
  _setName: string
): Promise<string | undefined> => {
  const key = `${setId}-${productType}`;
  if (imageCache.has(key)) return imageCache.get(key);

  const url = `https://images.pokemontcg.io/${setId}/logo.png`;
  imageCache.set(key, url);
  return url;
};

// Kept for backwards compat — no-op since we no longer probe URLs
export const validateImageUrl = async (_url: string): Promise<boolean> => true;
export const getFirstValidImageUrl = async (urls: string[]): Promise<string | null> => urls[0] ?? null;
export const preloadProductImages = async (_setId: string, _productTypes: string[]): Promise<void> => {};
