// Derives a short human label + chip colour for a Pokémon TCG card from its
// pokemontcg.io metadata (supertype / subtypes / types).
//
//  - Pokémon card  → its energy type ("Fire", "Water", "Lightning", …)
//  - Trainer card  → its role ("Supporter", "Stadium", "Item", "Tool")
//  - Energy card   → "Basic Energy" / "Special Energy"

export interface CardTypeMeta {
  supertype?: string | null;
  subtypes?: string[] | null;
  types?: string[] | null;
}

export interface CardTypeLabel {
  label: string;
  /** Tailwind classes for a small pill: text + bg + border. */
  className: string;
}

// text / bg / border tuned for the dark theme
const TYPE_STYLES: Record<string, string> = {
  Fire: "text-orange-300 bg-orange-500/12 border-orange-500/30",
  Water: "text-sky-300 bg-sky-500/12 border-sky-500/30",
  Grass: "text-emerald-300 bg-emerald-500/12 border-emerald-500/30",
  Lightning: "text-yellow-300 bg-yellow-500/12 border-yellow-500/30",
  Psychic: "text-fuchsia-300 bg-fuchsia-500/12 border-fuchsia-500/30",
  Fighting: "text-amber-400 bg-amber-600/12 border-amber-600/30",
  Darkness: "text-slate-300 bg-slate-500/15 border-slate-500/30",
  Metal: "text-zinc-300 bg-zinc-500/15 border-zinc-500/30",
  Fairy: "text-pink-300 bg-pink-500/12 border-pink-500/30",
  Dragon: "text-amber-300 bg-amber-500/12 border-amber-500/30",
  Colorless: "text-zinc-300 bg-zinc-500/12 border-zinc-500/25",
  // Trainer roles
  Supporter: "text-amber-300 bg-amber-500/12 border-amber-500/30",
  Stadium: "text-emerald-300 bg-emerald-500/12 border-emerald-500/30",
  Item: "text-cyan-300 bg-cyan-500/12 border-cyan-500/30",
  Tool: "text-violet-300 bg-violet-500/12 border-violet-500/30",
  // Fallbacks
  Trainer: "text-zinc-300 bg-zinc-500/12 border-zinc-500/25",
  Energy: "text-zinc-300 bg-zinc-500/12 border-zinc-500/25",
  Pokémon: "text-zinc-300 bg-zinc-500/12 border-zinc-500/25",
};

const styleFor = (key: string) =>
  TYPE_STYLES[key] ?? "text-muted-foreground bg-secondary border-border";

export function deriveCardTypeLabel(meta: CardTypeMeta | null | undefined): CardTypeLabel | null {
  if (!meta) return null;
  const supertype = (meta.supertype || "").toLowerCase();
  const subtypes = (meta.subtypes || []).map((s) => s.toLowerCase());
  const types = meta.types || [];

  if (supertype.includes("pok")) {
    const t = types[0];
    return { label: t || "Pokémon", className: styleFor(t || "Pokémon") };
  }

  if (supertype.includes("trainer")) {
    if (subtypes.includes("supporter")) return { label: "Supporter", className: styleFor("Supporter") };
    if (subtypes.includes("stadium")) return { label: "Stadium", className: styleFor("Stadium") };
    if (subtypes.some((s) => s.includes("tool"))) return { label: "Tool", className: styleFor("Tool") };
    if (subtypes.includes("item")) return { label: "Item", className: styleFor("Item") };
    return { label: "Trainer", className: styleFor("Trainer") };
  }

  if (supertype.includes("energy")) {
    if (subtypes.includes("special")) return { label: "Special Energy", className: styleFor("Energy") };
    return { label: "Basic Energy", className: styleFor("Energy") };
  }

  return null;
}
