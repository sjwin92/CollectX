// Community research on Pokémon TCG marketplaces: fake-item rates track
// seller verification, not the platform itself (TCGplayer's graded-slab fake
// rate sits at 2-4% vs 20-30% on unverified Facebook trading groups). CollectX
// already has the underlying trust signal (trade count, rating) — this makes
// it visible on listings instead of only on a seller's own profile page.

export type TrustTier = "new" | "trusted" | "veteran" | "mixed";

export interface TrustInfo {
  tier: TrustTier;
  label: string;
}

export function getTraderTrust(totalTrades: number, reputationScore: number): TrustInfo {
  const hasRatings = reputationScore > 0;

  if (hasRatings && reputationScore < 3.5) {
    return { tier: "mixed", label: "Mixed reviews" };
  }
  if (totalTrades >= 20 && (!hasRatings || reputationScore >= 4.5)) {
    return { tier: "veteran", label: "Veteran trader" };
  }
  if (totalTrades >= 3) {
    return { tier: "trusted", label: "Trusted trader" };
  }
  return { tier: "new", label: "New trader" };
}
