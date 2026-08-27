// Canonical card-condition vocabulary. Before this the app used three
// incompatible sets of strings — "NM" in the quick-add form, "near_mint" on
// the checklist / bulk import / store inventory, and "Near Mint" in the
// marketplace filter — so the marketplace condition filter never matched.
// Everything now normalises through here.

export type CardCondition = "M" | "NM" | "LP" | "MP" | "HP" | "D" | "SEALED";

export interface ConditionOption {
  value: CardCondition;
  label: string;
  short: string;
}

/** The raw-card conditions, best → worst. `SEALED` is separate (below). */
export const CARD_CONDITIONS: ConditionOption[] = [
  { value: "M", label: "Mint", short: "M" },
  { value: "NM", label: "Near Mint", short: "NM" },
  { value: "LP", label: "Lightly Played", short: "LP" },
  { value: "MP", label: "Moderately Played", short: "MP" },
  { value: "HP", label: "Heavily Played", short: "HP" },
  { value: "D", label: "Damaged", short: "D" },
];

export const SEALED_CONDITION: ConditionOption = { value: "SEALED", label: "Sealed", short: "Sealed" };

export const ALL_CONDITIONS: ConditionOption[] = [...CARD_CONDITIONS, SEALED_CONDITION];

// Every spelling we've ever written, keyed lower-cased with separators
// collapsed to single spaces.
const ALIASES: Record<string, CardCondition> = {
  "m": "M", "mint": "M", "gem mint": "M", "gem": "M", "gm": "M",
  "nm": "NM", "near mint": "NM", "nearmint": "NM", "nm mint": "NM", "nm m": "NM", "near mint mint": "NM",
  "lp": "LP", "lightly played": "LP", "light play": "LP", "lightplay": "LP", "excellent": "LP", "ex": "LP", "exc": "LP",
  "mp": "MP", "moderately played": "MP", "moderate play": "MP", "good": "MP", "played": "MP", "vg": "MP", "very good": "MP",
  "hp": "HP", "heavily played": "HP", "heavy play": "HP", "poor": "HP", "pl": "HP",
  "d": "D", "dmg": "D", "damaged": "D", "damage": "D", "dm": "D",
  "sealed": "SEALED", "new": "SEALED", "factory sealed": "SEALED",
};

const key = (raw?: string | null) =>
  String(raw ?? "").trim().toLowerCase().replace(/[_/-]+/g, " ").replace(/\s+/g, " ").trim();

/** Any historical/free-text condition → a canonical code. Unknown → "NM". */
export function normalizeCondition(raw?: string | null): CardCondition {
  return ALIASES[key(raw)] ?? "NM";
}

/** Human label, e.g. "Near Mint". */
export function conditionLabel(raw?: string | null): string {
  const v = normalizeCondition(raw);
  return ALL_CONDITIONS.find((c) => c.value === v)?.label ?? "Near Mint";
}

/** Short code, e.g. "NM". */
export function conditionShort(raw?: string | null): string {
  const v = normalizeCondition(raw);
  return ALL_CONDITIONS.find((c) => c.value === v)?.short ?? "NM";
}
