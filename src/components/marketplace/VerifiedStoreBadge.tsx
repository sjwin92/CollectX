import { Link } from "react-router-dom";
import { BadgeCheck } from "lucide-react";

interface Props {
  store?: { slug: string; name: string } | null;
  /** link to the storefront (default true) */
  link?: boolean;
  className?: string;
}

/** Small "Verified store" chip shown on a listing when the seller is an active store. */
const VerifiedStoreBadge = ({ store, link = true, className }: Props) => {
  if (!store) return null;
  const inner = (
    <span
      className={`inline-flex items-center gap-1 rounded-full border border-primary/30 bg-primary/10 px-2 py-[3px] text-[10px] font-semibold text-primary ${className ?? ""}`}
    >
      <BadgeCheck className="h-3 w-3" /> Verified store
    </span>
  );
  return link ? (
    <Link to={`/store/${store.slug}`} onClick={(e) => e.stopPropagation()} title={store.name}>
      {inner}
    </Link>
  ) : (
    inner
  );
};

export default VerifiedStoreBadge;
