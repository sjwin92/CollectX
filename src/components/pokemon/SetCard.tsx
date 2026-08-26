import React, { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import OptimizedImage from "@/components/ui/OptimizedImage";
import { Trophy, Calendar, Plus, Package } from "lucide-react";
import { format } from "date-fns";
import { PokemonSet } from "@/services/api/pokemonTypes";
import AddToCollectionModal from "./AddToCollectionModal";
import { fixImageUrl } from "@/services/api/cardImageService";

interface SetCardProps {
  set: PokemonSet;
  storedImages?: { logo?: string; symbol?: string };
  /** 0–100. When provided, a completion ring replaces the card-count chip. */
  completionPct?: number;
}

const RING_CIRCUMFERENCE = 2 * Math.PI * 16; // r = 16

const CompletionRing = ({ pct }: { pct: number }) => {
  const clamped = Math.max(0, Math.min(100, pct));
  const arc = (clamped / 100) * RING_CIRCUMFERENCE;
  const done = clamped >= 100;
  const stroke = done ? "hsl(var(--gold))" : "hsl(var(--primary))";
  return (
    <div className="relative h-10 w-10 shrink-0">
      <svg width="40" height="40" className="-rotate-90">
        <circle cx="20" cy="20" r="16" fill="none" stroke="hsl(var(--secondary))" strokeWidth="4" />
        {clamped > 0 && (
          <circle
            cx="20"
            cy="20"
            r="16"
            fill="none"
            stroke={stroke}
            strokeWidth="4"
            strokeLinecap="round"
            strokeDasharray={`${arc} ${RING_CIRCUMFERENCE}`}
            style={
              {
                animation: "ring-draw 1s cubic-bezier(0.19,1,0.22,1) both",
                "--ring-circumference": `${arc}`,
              } as React.CSSProperties
            }
          />
        )}
      </svg>
      <span
        className={`absolute inset-0 flex items-center justify-center font-display text-[10px] font-extrabold ${
          done ? "text-gold" : "text-primary"
        }`}
      >
        {clamped}%
      </span>
    </div>
  );
};

const SetCard = ({ set, storedImages, completionPct }: SetCardProps) => {
  const [showAddModal, setShowAddModal] = useState(false);
  const [logoError, setLogoError] = useState(false);
  const [logoFallbackIndex, setLogoFallbackIndex] = useState(0);
  const navigate = useNavigate();

  const getSVFallbackUrls = (setId: string, type: 'logo' | 'symbol') => [
    `https://assets.tcgdex.net/en/${setId}/${type}.png`,
    `https://limitlesstcg.s3.us-east-2.amazonaws.com/pokemon/gen9/${setId}/${type}.png`,
    `https://images.pokemontcg.io/swsh12/${type}.png`,
    `https://assets.tcgdex.net/en/sv1/${type}.png`,
  ];

  const openAddModal = (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setShowAddModal(true);
  };

  const handleViewProducts = (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    navigate(`/products?setId=${encodeURIComponent(set.id)}`);
  };

  const handleLogoError = () => {
    if (set.id.startsWith('sv')) {
      const fallbackUrls = getSVFallbackUrls(set.id, 'logo');
      if (logoFallbackIndex < fallbackUrls.length - 1) {
        setLogoFallbackIndex((prev) => prev + 1);
        return;
      }
    }
    setLogoError(true);
  };

  const getLogoUrl = () => {
    if (storedImages?.logo) return storedImages.logo;
    if (set.id.startsWith('sv')) return getSVFallbackUrls(set.id, 'logo')[logoFallbackIndex];
    return fixImageUrl(set.images?.logo, set.id, 'logo');
  };

  const logoUrl = getLogoUrl();
  const standard = set.legalities?.standard === 'Legal';
  const expanded = set.legalities?.expanded === 'Legal';

  return (
    <>
      <Link to={`/pokemon-sets/${set.id}`} className="block">
        <article className="group relative overflow-hidden rounded-2xl border border-border bg-card shadow-[inset_0_1px_0_rgba(255,255,255,0.06)] hover-lift">
          {/* Brand panel */}
          <div className="relative flex h-[104px] items-center justify-center overflow-hidden border-b border-white/5 bg-gradient-to-b from-white/[0.03] to-transparent">
            {logoUrl && !logoError ? (
              <OptimizedImage
                src={logoUrl}
                alt={`${set.name} logo`}
                className="max-h-12 max-w-[80%] object-contain"
                lazy
                fallbackSrc="/placeholder.svg"
                onError={handleLogoError}
              />
            ) : (
              <h3 className="px-4 text-center font-display text-base font-extrabold text-foreground">{set.name}</h3>
            )}
            <span className="holo" aria-hidden />
          </div>

          {/* Body */}
          <div className="p-4">
            <div className="flex items-start justify-between gap-3">
              <div className="min-w-0">
                <h3 className="truncate font-display text-base font-extrabold leading-tight">{set.name}</h3>
                <div className="mt-1 flex items-center gap-1.5 text-xs text-muted-foreground">
                  <span className="h-3.5 w-3.5 rounded-[4px] border border-border bg-secondary" />
                  <span className="truncate">{set.series}</span>
                </div>
              </div>
              {completionPct !== undefined ? (
                <CompletionRing pct={completionPct} />
              ) : (
                <span className="inline-flex shrink-0 items-center gap-1 rounded-full border border-border bg-secondary px-2 py-1 text-[11px] font-semibold text-muted-foreground">
                  <Trophy className="h-3 w-3" />
                  {set.printedTotal}
                </span>
              )}
            </div>

            <div className="mt-3 flex items-center justify-between text-[11px] text-muted-foreground">
              <span className="flex items-center gap-1.5">
                <Calendar className="h-3.5 w-3.5" />
                {set.releaseDate ? format(new Date(set.releaseDate), 'MMM d, yyyy') : 'Date unknown'}
              </span>
              <span className="flex gap-1.5">
                {standard && (
                  <span className="rounded-full bg-primary px-2 py-[2px] text-[9.5px] font-semibold text-primary-foreground">Std</span>
                )}
                {expanded && (
                  <span className="rounded-full border border-border bg-secondary px-2 py-[2px] text-[9.5px] font-semibold text-muted-foreground">Exp</span>
                )}
              </span>
            </div>

            <Button
              variant="outline"
              size="sm"
              className="mt-3 w-full rounded-full"
              onClick={handleViewProducts}
            >
              <Package className="mr-2 h-4 w-4" />
              View products
            </Button>
          </div>

          {/* Hover add */}
          <button
            type="button"
            onClick={openAddModal}
            aria-label="Quick add to collection"
            className="absolute right-3 top-3 flex h-8 w-8 -translate-y-1 items-center justify-center rounded-full bg-primary text-primary-foreground opacity-0 shadow-[0_8px_18px_-6px_hsl(var(--primary)/0.65)] transition-all group-hover:translate-y-0 group-hover:opacity-100"
          >
            <Plus className="h-4 w-4" />
          </button>
        </article>
      </Link>

      {showAddModal && (
        <AddToCollectionModal
          set={set}
          open={showAddModal}
          onClose={() => setShowAddModal(false)}
          cardName={`Card from ${set.name}`}
          cardImage={logoUrl}
          cardRarity="Common"
          cardNumber={`${set.id}-1`}
        />
      )}
    </>
  );
};

export default SetCard;
