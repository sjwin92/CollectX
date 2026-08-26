import { deriveCardTypeLabel, type CardTypeMeta } from "@/lib/cardTypeLabel";
import { useCardTypeMeta } from "@/hooks/useCardTypeMeta";

interface CardTypeBadgeProps {
  /** Pre-fetched metadata (preferred — pass from a page-level useCardTypeMeta). */
  meta?: CardTypeMeta | null;
  /** Or a card id to fetch on its own (fine for a single card view). */
  cardId?: string;
  className?: string;
}

const Chip = ({ label, className, extra }: { label: string; className: string; extra?: string }) => (
  <span
    className={`inline-flex items-center rounded-full border px-2 py-[3px] text-[10px] font-semibold ${className} ${extra ?? ""}`}
  >
    {label}
  </span>
);

/** Renders a small colour-coded chip: "Fire", "Supporter", "Stadium", "Basic Energy"… */
const CardTypeBadge = ({ meta, cardId, className }: CardTypeBadgeProps) => {
  const fetched = useCardTypeMeta(meta === undefined && cardId ? [cardId] : []);
  const resolved = meta ?? (cardId ? fetched.get(cardId) : undefined);
  const derived = deriveCardTypeLabel(resolved);
  if (!derived) return null;
  return <Chip label={derived.label} className={derived.className} extra={className} />;
};

export default CardTypeBadge;
