import { usdToGbp } from "@/services/currencyService";

/**
 * Live market pricing derived from the TCGplayer prices that pokemontcg.io
 * bundles with every card (stored on `pokemon_cards.tcgplayer_prices`, kept
 * fresh by the `import-set-cards` edge function).
 *
 * The JSON is keyed by printing variant — `holofoil`, `normal`,
 * `reverseHolofoil`, `1stEditionHolofoil`, … — each with
 * `{ low, mid, high, market, directLow }` in USD. We prefer the "market"
 * figure (TCGplayer's rolling sale average) and fall back to "mid".
 */

const VARIANT_ORDER = [
  "holofoil",
  "normal",
  "reverseHolofoil",
  "1stEditionHolofoil",
  "1stEdition",
  "unlimitedHolofoil",
  "unlimited",
] as const;

/** Best available USD market price across printing variants, or 0 if none. */
export function extractMarketPriceUsd(tcgplayerPrices: unknown): number {
  const p = tcgplayerPrices as Record<string, { market?: number; mid?: number }> | null | undefined;
  if (!p || typeof p !== "object") return 0;

  for (const key of VARIANT_ORDER) {
    const v = p[key];
    if (v?.market && v.market > 0) return v.market;
    if (v?.mid && v.mid > 0) return v.mid;
  }
  // Unknown variant key — take the first one that has a usable number.
  for (const v of Object.values(p)) {
    if (v?.market && v.market > 0) return v.market;
    if (v?.mid && v.mid > 0) return v.mid;
  }
  return 0;
}

/** Best available market price converted to GBP, or 0 if unpriced. */
export function marketPriceGbp(tcgplayerPrices: unknown): number {
  const usd = extractMarketPriceUsd(tcgplayerPrices);
  return usd > 0 ? usdToGbp(usd) : 0;
}

/** `£12.34`, or a dash when we have no price. */
export function formatGbp(value: number | null | undefined): string {
  return value && value > 0 ? `£${value.toFixed(2)}` : "—";
}
