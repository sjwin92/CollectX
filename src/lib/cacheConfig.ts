// Single source of truth for cache TTLs across React Query and edge-function freshness checks.
// All durations in milliseconds.

export const CACHE_TTL = {
  /** Card data per set — matches the edge function's freshness window */
  SET_CARDS: 24 * 60 * 60 * 1000,
  /** Set metadata — changes only on new releases */
  SETS_LIST: 24 * 60 * 60 * 1000,
  /** Per-set stored images from our DB */
  SET_IMAGES: 30 * 60 * 1000,
  /** eBay product image enrichment */
  EBAY_IMAGES: 30 * 60 * 1000,
  /** Individual set detail */
  SET_DETAIL: 60 * 60 * 1000,
  /** Products derived from a set */
  SET_PRODUCTS: 60 * 60 * 1000,
  /** localStorage persistence window for React Query */
  PERSIST_MAX_AGE: 7 * 24 * 60 * 60 * 1000,
} as const;
