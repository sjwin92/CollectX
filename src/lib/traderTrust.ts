// Community research on Pokémon TCG marketplaces: fake-item rates track
// seller verification, not the platform itself (TCGplayer's graded-slab fake
// rate sits at 2-4% vs 20-30% on unverified Facebook trading groups). CollectX
// already has the underlying trust signal (trade count, rating) — this makes
// it visible on listings instead of only on a seller's own profile page.

export type TrustTier = "new" | "trusted" | "veteran" | "elite" | "mixed";

export interface TrustInfo {
  tier: TrustTier;
  label: string;
}

// Trade-count thresholds for each earned tier, lowest → highest. "mixed" is
// not in here — it's a rating-based override, not a milestone you progress to.
const TIER_LADDER: { tier: Exclude<TrustTier, "mixed">; label: string; minTrades: number }[] = [
  { tier: "new", label: "New trader", minTrades: 0 },
  { tier: "trusted", label: "Trusted trader", minTrades: 3 },
  { tier: "veteran", label: "Veteran trader", minTrades: 20 },
  { tier: "elite", label: "Elite trader", minTrades: 50 },
];

export function getTraderTrust(totalTrades: number, reputationScore: number): TrustInfo {
  const hasRatings = reputationScore > 0;

  // A poor rating overrides everything — a high trade count with 2-star
  // reviews is a worse signal than a new trader with none.
  if (hasRatings && reputationScore < 3.5) {
    return { tier: "mixed", label: "Mixed reviews" };
  }

  // Walk the ladder from the top; the higher tiers also require a strong
  // rating (or no ratings yet) so a barely-passing trader doesn't reach them.
  const ratingOkFor = (tier: TrustTier) =>
    tier === "elite" ? (!hasRatings || reputationScore >= 4.8)
    : tier === "veteran" ? (!hasRatings || reputationScore >= 4.5)
    : true;

  for (let i = TIER_LADDER.length - 1; i >= 0; i--) {
    const step = TIER_LADDER[i];
    if (totalTrades >= step.minTrades && ratingOkFor(step.tier)) {
      return { tier: step.tier, label: step.label };
    }
  }
  return { tier: "new", label: "New trader" };
}

export interface TierProgress {
  nextLabel: string;
  tradesToNext: number;
}

// How far to the next milestone tier, for a progress hint on the profile.
// Returns null when the trader is already at the top tier, or is in the
// "mixed" state (where more trades alone won't move them up).
export function getTierProgress(totalTrades: number, reputationScore: number): TierProgress | null {
  const { tier } = getTraderTrust(totalTrades, reputationScore);
  if (tier === "mixed" || tier === "elite") return null;

  const next = TIER_LADDER.find((step) => step.minTrades > totalTrades);
  if (!next) return null;

  return { nextLabel: next.label, tradesToNext: next.minTrades - totalTrades };
}
