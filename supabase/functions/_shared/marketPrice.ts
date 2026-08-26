// Shared TCGplayer market-price helpers. The buylist quote (Phase 3) and the
// store repricer (Phase 2a) both key off pokemon_cards.tcgplayer_prices (USD)
// converted to GBP. Keep this in sync with refresh-store-prices/index.ts,
// which still carries its own copy to avoid churn on a working function.

let cachedRate: number | null = null;

/** USD → GBP via frankfurter.app, cached per cold start. Falls back to 0.79. */
export async function usdToGbpRate(): Promise<number> {
  if (cachedRate) return cachedRate;
  try {
    const r = await fetch("https://api.frankfurter.app/latest?from=USD&to=GBP");
    if (r.ok) {
      const d = await r.json();
      if (d?.rates?.GBP) return (cachedRate = d.rates.GBP);
    }
  } catch {
    // fall through to the fallback
  }
  return (cachedRate = 0.79);
}

const VARIANT_ORDER = [
  "holofoil", "normal", "reverseHolofoil", "1stEditionHolofoil", "1stEdition",
  "unlimitedHolofoil", "unlimited",
];

/** Best available market (else mid) price across TCGplayer print variants. */
export function marketUsd(prices: unknown): number {
  const p = prices as Record<string, { market?: number; mid?: number }> | null | undefined;
  if (!p || typeof p !== "object") return 0;
  for (const k of VARIANT_ORDER) {
    const v = p[k];
    if (v?.market && v.market > 0) return v.market;
    if (v?.mid && v.mid > 0) return v.mid;
  }
  for (const v of Object.values(p)) {
    if (v?.market && v.market > 0) return v.market;
    if (v?.mid && v.mid > 0) return v.mid;
  }
  return 0;
}
