
import React, { useState } from "react";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Plus, Check, Loader2, Package, Calendar, ExternalLink } from "lucide-react";
import { format } from "date-fns";
import { getProductTypeIcon, getProductTypeLabel } from "@/types/cardTypes";
import { SmartImage } from "@/components/common/SmartImage";
import { useToast } from "@/hooks/use-toast";
import { useUser } from "@/hooks/useUser";
import { addCardToCollection } from "@/services/supabaseCollectionService";

interface Product {
  id: string;
  name: string;
  series?: string;
  setId: string;
  productType: 'booster-pack' | 'blister-pack' | 'etb' | 'bundle' | 'tin' | 'box' | 'case' | 'deck' | 'other';
  packCount?: number;
  releaseDate?: string;
  imageUrl?: string;
  /** TCGplayer market price (GBP). */
  msrp?: number;
  /** Deep link to the TCGplayer product page. */
  tcgplayerUrl?: string;
  description?: string;
}

interface ProductCardProps {
  product: Product;
}

const ProductCard = ({ product }: ProductCardProps) => {
  const { toast } = useToast();
  const { user } = useUser();
  const [busy, setBusy] = useState(false);
  const [added, setAdded] = useState(false);

  const productTypeIcon = getProductTypeIcon(product.productType);
  const productTypeLabel = getProductTypeLabel(product.productType);

  const handleAdd = async (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (busy || added) return;
    if (!user) {
      toast({ variant: "destructive", title: "Sign in required", description: "Sign in to track sealed products." });
      return;
    }
    setBusy(true);
    try {
      await addCardToCollection({
        id: product.id,
        name: product.name,
        imageUrl: product.imageUrl,
        rarity: productTypeLabel,
        condition: "Sealed",
        number: "",
        productType: product.productType as never,
        set: { id: product.setId || undefined, name: product.series },
        estimatedValue: product.msrp != null ? String(product.msrp) : undefined,
        quantity: 1,
      } as never);
      setAdded(true);
      toast({ title: "Added to collection", description: product.name });
    } catch (err) {
      toast({
        variant: "destructive",
        title: "Couldn't add to collection",
        description: err instanceof Error ? err.message : "Please try again.",
      });
    } finally {
      setBusy(false);
    }
  };

  const imageFallback = (
    <div className="flex flex-col items-center gap-2 text-muted-foreground">
      <span className="text-4xl">{productTypeIcon}</span>
      <span className="text-sm font-medium">{productTypeLabel}</span>
    </div>
  );

  return (
    <>
      <Card className="overflow-hidden h-full transition-all hover:shadow-lg hover:border-primary/50 relative group">
        <CardHeader className="space-y-3 pb-3 p-4">
          {/* Product image — tall enough to show real product art */}
          <div className="h-48 flex items-center justify-center bg-gradient-to-br from-muted/30 to-muted/60 rounded-lg overflow-hidden">
            {product.imageUrl ? (
              <SmartImage
                src={product.imageUrl}
                alt={product.name}
                className="h-full w-full object-contain p-2"
                fallback={imageFallback}
              />
            ) : imageFallback}
          </div>

          <div>
            <h3 className="text-base font-semibold text-center mb-2 line-clamp-2 leading-snug">
              {product.name}
            </h3>
            <div className="flex items-center justify-between flex-wrap gap-1">
              <span className="text-xs text-muted-foreground">{product.series}</span>
              <div className="flex gap-1 flex-wrap">
                <Badge variant="secondary" className="text-xs">
                  <span className="mr-1">{productTypeIcon}</span>
                  {productTypeLabel}
                </Badge>
                {product.packCount && (
                  <Badge variant="outline" className="text-xs">
                    <Package className="h-3 w-3 mr-1" />
                    {product.packCount} packs
                  </Badge>
                )}
              </div>
            </div>
          </div>
        </CardHeader>

        <CardContent className="pb-4 px-4 space-y-2">
          <div className="flex items-end justify-between text-sm">
            {product.releaseDate ? (
              <div className="flex items-center gap-1 text-muted-foreground">
                <Calendar className="h-4 w-4" />
                {format(new Date(product.releaseDate), 'MMM yyyy')}
              </div>
            ) : <span />}
            <span className="flex flex-col items-end leading-none">
              {product.msrp !== undefined && (
                <span className="text-[10px] uppercase tracking-wider text-muted-foreground/70">Market</span>
              )}
              <span className={product.msrp !== undefined ? "font-bold text-lg text-primary tabular-nums" : "text-xs text-muted-foreground italic"}>
                {product.msrp !== undefined ? `£${product.msrp.toFixed(2)}` : "Price not available"}
              </span>
            </span>
          </div>
          {product.tcgplayerUrl && (
            <a
              href={product.tcgplayerUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-1 text-xs text-primary hover:underline"
              onClick={(e) => e.stopPropagation()}
            >
              View on TCGplayer <ExternalLink className="h-3 w-3" />
            </a>
          )}
        </CardContent>

        <div className={`absolute top-2 right-2 transition-opacity ${added ? "opacity-100" : "opacity-0 group-hover:opacity-100"}`}>
          <Button
            variant="default"
            size="sm"
            title={added ? "Added to your collection" : "Add to collection"}
            className={`h-8 w-8 p-0 rounded-full shadow-lg ${added ? "bg-emerald-500 hover:bg-emerald-500" : ""}`}
            onClick={handleAdd}
            disabled={busy}
          >
            {busy ? <Loader2 className="h-4 w-4 animate-spin" /> : added ? <Check className="h-4 w-4" /> : <Plus className="h-4 w-4" />}
          </Button>
        </div>
      </Card>
    </>
  );
};

export default ProductCard;
