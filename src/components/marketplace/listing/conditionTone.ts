// Colour-codes a card-condition label for the small chip on listing/card art.
// Loose matching — condition strings come in a few shapes ("NM", "Near Mint", "Mint", "Lightly Played", …).
export function conditionTone(condition?: string): string {
  const s = (condition || "").toLowerCase().trim();
  if (!s) return "text-foreground bg-white/5 border-white/15";
  if (/gem|^m$|^mint\b|near mint|^nm\b/.test(s)) return "text-emerald-300 bg-emerald-500/15 border-emerald-500/30";
  if (/excellent|light|^lp\b|very good|^vg\b/.test(s)) return "text-amber-300 bg-amber-500/15 border-amber-500/30";
  if (/moderat|heav|play|poor|damag|^hp\b|^mp\b|^d\b|^g\b|^good\b/.test(s)) return "text-red-300 bg-red-500/15 border-red-500/30";
  return "text-foreground bg-white/5 border-white/15";
}
