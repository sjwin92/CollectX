
import React, { useState } from "react";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Plus, Package, Calendar } from "lucide-react";
import { format } from "date-fns";
import { getProductTypeIcon, getProductTypeLabel } from "@/types/cardTypes";
import AddToCollectionModal from "./AddToCollectionModal";
import { SmartImage } from "@/components/common/SmartImage";

interface Product {
  id: string;
  name: string;
  series: string;
  setId: string;
  productType: 'booster-pack' | 'blister-pack' | 'etb' | 'tin' | 'box' | 'deck' | 'other';
  packCount?: number;
  releaseDate: string;
  imageUrl?: string;
  msrp?: number;
  description: string;
}

interface ProductCardProps {
  product: Product;
}

const ProductCard = ({ product }: ProductCardProps) => {
  const [showAddModal, setShowAddModal] = useState(false);

  const productTypeIcon = getProductTypeIcon(product.productType);
  const productTypeLabel = getProductTypeLabel(product.productType);

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

        <CardContent className="pb-4 px-4">
          <div className="flex items-center justify-between text-sm">
            <div className="flex items-center gap-1 text-muted-foreground">
              <Calendar className="h-4 w-4" />
              {format(new Date(product.releaseDate), 'MMM d, yyyy')}
            </div>
            <span className={product.msrp !== undefined ? "font-bold text-lg text-primary" : "text-xs text-muted-foreground italic"}>
              {product.msrp !== undefined ? `£${product.msrp.toFixed(2)}` : "Price not available"}
            </span>
          </div>
        </CardContent>

        <div className="absolute top-2 right-2 opacity-0 group-hover:opacity-100 transition-opacity">
          <Button
            variant="default"
            size="sm"
            className="h-8 w-8 p-0 rounded-full shadow-lg"
            onClick={(e) => { e.preventDefault(); e.stopPropagation(); setShowAddModal(true); }}
          >
            <Plus className="h-4 w-4" />
          </Button>
        </div>
      </Card>

      {showAddModal && (
        <AddToCollectionModal
          set={{ id: product.setId, name: product.series } as any}
          open={showAddModal}
          onClose={() => setShowAddModal(false)}
          cardName={product.name}
          cardImage={product.imageUrl}
          cardRarity={productTypeLabel}
          cardNumber={product.id}
        />
      )}
    </>
  );
};

export default ProductCard;
