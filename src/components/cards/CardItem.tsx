import React, { useState, useEffect } from "react";
import { Link } from "react-router-dom";
import GlassCard from "@/components/ui/custom/GlassCard";
import Badge from "@/components/ui/custom/Badge";
import { cn } from "@/lib/utils";
import { AlertTriangle, RefreshCw, BadgeCheck, Repeat, Edit3, Trash2 } from "lucide-react";
import CardImageGallery from "@/components/pokemon/collection/CardImageGallery";
import CardTypeBadge from "@/components/pokemon/CardTypeBadge";
import type { CardTypeMeta } from "@/lib/cardTypeLabel";
import { conditionLabel } from "@/lib/cardCondition";
import { conditionTone } from "@/components/marketplace/listing/conditionTone";
import { Button } from "@/components/ui/button";
// Temporarily removing enhanced service to debug image issues
// import { enhancedImageService } from "@/services/enhancedImageService";
// import { useImagePerformance } from "@/hooks/useImagePerformance";

export interface CardItemProps {
  id: string;
  name: string;
  imageUrl?: string;
  rarity: string;
  condition: string;
  estimatedValue: string;
  className?: string;
  animation?: "fade" | "scale" | "slide" | "none";
  onClick?: () => void;
  showCondition?: boolean;
  graded?: boolean;
  gradingCompany?: string;
  gradeScore?: string;
  forTrade?: boolean;
  tradePreferences?: string;
  set?: {
    id?: string;
    name?: string;
  };
  number?: string;
  quantity?: number;
  dbId?: string; // For collection cards with user-uploaded images
  onEdit?: () => void; // For editing collection cards
  onDelete?: () => void; // For removing a collection card
  typeMeta?: CardTypeMeta | null; // Pre-fetched type metadata (batch from CardGrid)
  marketPriceGbp?: number | null; // Live market price (batch from CardGrid)
}

const CardItem = ({
  id,
  name,
  imageUrl,
  rarity,
  condition,
  estimatedValue,
  className,
  animation = "none",
  onClick,
  showCondition = true,
  graded = false,
  gradingCompany,
  gradeScore,
  forTrade = false,
  tradePreferences,
  set,
  number,
  quantity = 1,
  dbId, // For showing user-uploaded images
  onEdit, // For editing collection cards
  onDelete, // For removing a collection card
  typeMeta,
  marketPriceGbp,
}: CardItemProps) => {
  const [confirmDelete, setConfirmDelete] = useState(false);
  const [imageStatus, setImageStatus] = useState<"loading" | "loaded" | "error">("loading");
  const [imageSrc, setImageSrc] = useState<string>("");
  
  useEffect(() => {
    // Direct, simple image loading without any service
    setImageStatus("loading");
    
    if (imageUrl) {
      console.log(`Loading image for card ${id}: ${imageUrl}`);
      setImageSrc(imageUrl);
    } else {
      console.log(`No image URL provided for card ${id}`);
      setImageStatus("error");
    }
  }, [id, imageUrl]);
  
  const handleImageLoad = () => {
    console.log(`Image loaded successfully: ${imageSrc}`);
    setImageStatus("loaded");
  };

  const handleImageError = () => {
    console.log(`Image failed to load: ${imageSrc}`);
    setImageStatus("error");
  };
  
  const retryImage = (e?: React.MouseEvent) => {
    if (e) e.stopPropagation();
    setImageStatus("loading");
    
    // Try the direct API URL as fallback
    const directUrl = `https://images.pokemontcg.io/${id.replace('-', '/')}.png`;
    console.log(`Retrying with direct URL: ${directUrl}`);
    setImageSrc(directUrl);
  };

  const formatCurrency = (value: string): string => {
    if (!value) return "£0";
    
    if (value.startsWith("£")) return value;
    
    if (value.includes("-")) {
      const parts = value.replace(/\$/g, '').split("-");
      return `£${parts[0].trim()}-£${parts[1].trim()}`;
    }
    
    return value.replace(/\$/, "£").replace(/^([0-9.]+)$/, "£$1");
  };

  const CardContent = (
    <GlassCard 
      className={cn("overflow-hidden group h-full", className)}
      animation={animation}
    >
      <div className="relative aspect-[2/3] overflow-hidden rounded-lg mb-3 bg-gradient-to-b from-secondary to-background transition-all duration-500 group-hover:-translate-y-1 group-hover:shadow-[0_8px_30px_rgba(0,218,243,0.2)]">
        <div className="relative h-full">
          {imageSrc && (
            <>
              <img
                src={imageSrc}
                alt={`Pokémon card: ${name} - ${condition} condition, ${rarity} rarity`}
                className={`w-full h-full object-contain transition-opacity duration-300`}
                onLoad={handleImageLoad}
                onError={handleImageError}
              />

              {imageStatus === "loading" && (
                <div className="absolute inset-0 flex items-center justify-center bg-muted">
                  <div className="h-8 w-8 animate-spin rounded-full border-4 border-primary border-t-transparent"></div>
                </div>
              )}
            </>
          )}
          
          {imageStatus === "error" && (
            <div className="absolute inset-0 flex flex-col items-center justify-center bg-muted/80">
              <AlertTriangle className="h-6 w-6 text-amber-500 mb-1" />
              <span className="text-xs font-medium text-center">Image Failed to Load</span>
              <span className="text-xs text-muted-foreground text-center mt-1 mb-2">Card data still available</span>
              <Button size="sm" variant="outline" className="text-xs py-0 h-7" onClick={(e) => {
                e.stopPropagation();
                retryImage();
              }}>
                <RefreshCw className="h-3 w-3 mr-1" /> Retry
              </Button>
            </div>
          )}
          
        </div>
      </div>

      {/* Everything lives in the box under the art — the card image stays clean. */}
      <div className="space-y-2">
        <h3 className="font-medium text-sm line-clamp-2 leading-tight group-hover:text-primary transition-colors">
          {name}
        </h3>

        <div className="flex flex-wrap items-center gap-1">
          {typeMeta && <CardTypeBadge meta={typeMeta} />}
          <Badge variant="outline" size="sm" className="shrink-0">
            {rarity}
          </Badge>
        </div>

        {/* Condition / grade / qty / trade — chips, always in the box */}
        {(showCondition || graded || quantity > 1 || forTrade) && (
          <div className="flex flex-wrap items-center gap-1">
            {showCondition && !graded && (
              <span className={`rounded-full border px-1.5 py-0.5 text-[11px] font-medium ${conditionTone(condition)}`}>
                {conditionLabel(condition)}
              </span>
            )}
            {graded && (
              <span className="inline-flex items-center gap-0.5 rounded-full border border-emerald-500/30 bg-emerald-500/15 px-1.5 py-0.5 text-[11px] font-semibold text-emerald-300">
                <BadgeCheck className="h-3 w-3" />
                {[gradingCompany, gradeScore].filter(Boolean).join(" ")}
              </span>
            )}
            {quantity > 1 && (
              <span className="rounded-full border border-border bg-secondary px-1.5 py-0.5 text-[11px] font-medium tabular-nums text-muted-foreground">
                ×{quantity}
              </span>
            )}
            {forTrade && (
              <span className="inline-flex items-center gap-0.5 rounded-full border border-primary/30 bg-primary/10 px-1.5 py-0.5 text-[11px] font-medium text-primary">
                <Repeat className="h-3 w-3" /> Trade
              </span>
            )}
          </div>
        )}

        {/* Price — live market when we have it, otherwise the stored value */}
        <div className="flex items-baseline gap-1.5">
          <span className="text-sm font-semibold text-gold">
            {marketPriceGbp != null && marketPriceGbp > 0
              ? `£${marketPriceGbp.toFixed(2)}`
              : formatCurrency(estimatedValue)}
          </span>
          {marketPriceGbp != null && marketPriceGbp > 0 && (
            <span className="text-[10px] uppercase tracking-wide text-muted-foreground">market</span>
          )}
        </div>

        {forTrade && tradePreferences && (
          <div className="text-xs text-muted-foreground line-clamp-1 leading-tight">
            <span className="font-medium">Want:</span> {tradePreferences}
          </div>
        )}

        {/* Condition photos — view + upload inline */}
        {dbId && (
          <CardImageGallery userCardId={dbId} cardName={name} editable className="max-w-full" />
        )}

        {/* Collection actions — visible buttons, never over the art */}
        {dbId && (onEdit || onDelete) && (
          <div className="flex gap-1.5 pt-1">
            {onEdit && (
              <Button
                size="sm"
                variant="outline"
                className="h-7 flex-1 text-xs"
                onClick={(e) => { e.stopPropagation(); e.preventDefault(); onEdit(); }}
              >
                <Edit3 className="mr-1 h-3.5 w-3.5" /> Edit
              </Button>
            )}
            {onDelete && (
              <Button
                size="sm"
                variant={confirmDelete ? "destructive" : "outline"}
                className="h-7 flex-1 text-xs"
                onClick={(e) => {
                  e.stopPropagation();
                  e.preventDefault();
                  if (confirmDelete) { onDelete(); setConfirmDelete(false); }
                  else { setConfirmDelete(true); setTimeout(() => setConfirmDelete(false), 3000); }
                }}
              >
                <Trash2 className="mr-1 h-3.5 w-3.5" /> {confirmDelete ? "Confirm" : "Remove"}
              </Button>
            )}
          </div>
        )}
      </div>
    </GlassCard>
  );

  if (onClick) {
    return (
      <div className="cursor-pointer" onClick={onClick} role="button" aria-label={`Select ${name} card`}>
        {CardContent}
      </div>
    );
  }

  return (
    <Link to={`/card/${id}`} aria-label={`View details for ${name} card`}>
      {CardContent}
    </Link>
  );

  useEffect(() => {
    let timeoutId: number | undefined;
    
    if (imageStatus === "loading") {
      timeoutId = window.setTimeout(() => {
        if (imageStatus === "loading") {
          console.log("Image loading timed out");
          setImageStatus("error");
        }
      }, 5000);
    }
    
    return () => {
      if (timeoutId) window.clearTimeout(timeoutId);
    };
  }, [imageStatus]);
};

export default CardItem;
