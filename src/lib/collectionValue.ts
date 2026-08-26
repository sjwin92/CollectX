// Portfolio-value maths for a user's collection. Base is the live TCGplayer
// market price (GBP) per card; graded cards get a company/grade/rarity premium
// on top, raw cards a condition discount. Sealed products use their stored
// market value.

const GRADING_COMPANY_MULTIPLIERS: Record<string, number> = {
  PSA: 1.0,
  BGS: 0.95,
  CGC: 0.85,
  SGC: 0.8,
  GMA: 0.7,
  AGS: 0.65,
  TAG: 0.9,
};

const GRADE_MULTIPLIERS: Record<number, number> = {
  10: 4.0,
  9: 2.5,
  8: 1.8,
  7: 1.4,
  6: 1.1,
  5: 0.9,
  4: 0.7,
  3: 0.5,
  2: 0.3,
  1: 0.2,
};

const RARITY_GRADING_MULTIPLIERS: Record<string, number> = {
  "special illustration rare": 1.5,
  "rainbow rare": 1.4,
  "gold rare": 1.3,
  "ultra rare": 1.2,
  "secret rare": 1.2,
  "illustration rare": 1.25,
  rare: 1.1,
  "double rare": 1.15,
  uncommon: 0.9,
  common: 0.8,
};

/** Multiplier applied to a raw market price to estimate a graded card's value. */
export function gradedMultiplier(company?: string, gradeScore?: number | string, rarity?: string): number {
  const co = GRADING_COMPANY_MULTIPLIERS[String(company ?? "").toUpperCase()] ?? 0.8;
  const g = Number(gradeScore);
  const grade = Number.isFinite(g) ? GRADE_MULTIPLIERS[Math.round(g)] ?? 1.0 : 1.0;
  const rar = RARITY_GRADING_MULTIPLIERS[String(rarity ?? "").toLowerCase()] ?? 1.0;
  return co * grade * rar;
}

/** Value discount for a raw (ungraded) card by condition. */
export function conditionMultiplier(condition?: string): number {
  switch (String(condition ?? "").toLowerCase()) {
    case "mint":
    case "m":
    case "gem mint":
      return 1.05;
    case "near mint":
    case "near_mint":
    case "nm":
      return 1.0;
    case "excellent":
    case "lightly played":
    case "lp":
      return 0.82;
    case "good":
    case "moderately played":
    case "mp":
      return 0.6;
    case "played":
    case "heavily played":
    case "hp":
      return 0.42;
    case "poor":
    case "damaged":
    case "d":
      return 0.25;
    default:
      return 0.9;
  }
}

export interface ValuedCard {
  id: string;
  quantity?: number;
  graded?: boolean;
  gradingCompany?: string;
  gradeScore?: number | string;
  condition?: string;
  rarity?: string;
  isSealed?: boolean;
  /** Fallback per-unit GBP when there's no live market price (user value / sealed). */
  estimatedValue?: string;
}

/** Per-unit GBP value for one line in the collection (before × quantity). */
export function unitValueGbp(card: ValuedCard, marketGbp: number | undefined): number {
  const fallback = Number.parseFloat(String(card.estimatedValue ?? "").replace(/[^0-9.]/g, "")) || 0;
  const base = marketGbp && marketGbp > 0 ? marketGbp : fallback;
  if (base <= 0) return 0;
  if (card.isSealed) return base;
  if (card.graded) return base * gradedMultiplier(card.gradingCompany, card.gradeScore, card.rarity);
  return base * conditionMultiplier(card.condition);
}

export interface CollectionValue {
  /** Grand total, GBP. */
  total: number;
  /** Sum of raw market × quantity (no grading premium / condition discount). */
  rawMarket: number;
  /** total − rawMarket, i.e. the net effect of grading premiums & condition. */
  gradingAdjustment: number;
  sealedTotal: number;
  /** distinct line count (rows). */
  lines: number;
  /** total quantity across all lines. */
  units: number;
  gradedUnits: number;
  /** lines we could price from live market data. */
  pricedLines: number;
  unpricedLines: number;
}

export function valueCollection(
  cards: ValuedCard[],
  priceFor: (id: string) => number | undefined,
): CollectionValue {
  let total = 0;
  let rawMarket = 0;
  let sealedTotal = 0;
  let units = 0;
  let gradedUnits = 0;
  let pricedLines = 0;
  let unpricedLines = 0;

  for (const c of cards) {
    const qty = Math.max(1, Number(c.quantity) || 1);
    const market = priceFor(c.id);
    const unit = unitValueGbp(c, market);
    total += unit * qty;
    units += qty;
    if (c.graded) gradedUnits += qty;
    if (c.isSealed) sealedTotal += unit * qty;

    const rawBase =
      market && market > 0
        ? market
        : Number.parseFloat(String(c.estimatedValue ?? "").replace(/[^0-9.]/g, "")) || 0;
    rawMarket += rawBase * qty;
    if (market && market > 0) pricedLines += 1;
    else if (rawBase > 0) pricedLines += 1;
    else unpricedLines += 1;
  }

  return {
    total: round2(total),
    rawMarket: round2(rawMarket),
    gradingAdjustment: round2(total - rawMarket),
    sealedTotal: round2(sealedTotal),
    lines: cards.length,
    units,
    gradedUnits,
    pricedLines,
    unpricedLines,
  };
}

function round2(n: number): number {
  return Math.round(n * 100) / 100;
}
