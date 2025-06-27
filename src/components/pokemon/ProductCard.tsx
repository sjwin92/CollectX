
import React, { useState } from "react";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Plus, Package, Calendar, ImageOff } from "lucide-react";
import { format } from "date-fns";
import { getProductTypeIcon, getProductTypeLabel } from "@/types/cardTypes";
import AddToCollectionModal from "./AddToCollectionModal";

interface Product {
  id: string;
  name: string;
  series: string;
  setId: string;
  productType: 'booster-pack' | 'blister-pack' | 'etb' | 'tin' | 'box' | 'deck' | 'other';
  packCount?: number;
  releaseDate: string;
  imageUrl?: string;
  msrp: number;
  description: string;
}

interface ProductCardProps {
  product: Product;
}

const ProductCard = ({ product }: ProductCardProps) => {
  const [showAddModal, setShowAddModal] = useState(false);
  const [imageLoaded, setImageLoaded] = useState(true);

  const openAddModal = (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setShowAddModal(true);
  };

  const productTypeIcon = getProductTypeIcon(product.productType);
  const productTypeLabel = getProductTypeLabel(product.productType);

  return (
    <>
      <Card className="overflow-hidden h-full transition-all hover:shadow-lg hover:border-primary/50 relative group">
        <CardHeader className="space-y-4 pb-4">
          {product.imageUrl ? (
            <div className="h-32 flex items-center justify-center bg-muted/30 rounded-lg">
              <img 
                src={product.imageUrl} 
                alt={`${product.name}`}
                className="max-h-32 max-w-full object-contain"
                onError={() => setImageLoaded(false)}
                style={{ display: imageLoaded ? 'block' : 'none' }}
              />
              {!imageLoaded && (
                <div className="flex flex-col items-center text-muted-foreground">
                  <ImageOff className="h-8 w-8 mb-2" />
                  <span className="text-sm">Image unavailable</span>
                </div>
              )}
            </div>
          ) : (
            <div className="h-32 flex items-center justify-center bg-muted/30 rounded-lg">
              <div className="flex flex-col items-center text-muted-foreground">
                <span className="text-2xl mb-2">{productTypeIcon}</span>
                <span className="text-sm">{productTypeLabel}</span>
              </div>
            </div>
          )}
          
          <div>
            <h3 className="text-lg font-semibold text-center mb-2">{product.name}</h3>
            <div className="flex items-center justify-between">
              <span className="text-sm font-medium text-muted-foreground">{product.series}</span>
              <div className="flex gap-2">
                <Badge variant="secondary">
                  <span className="mr-1">{productTypeIcon}</span>
                  {productTypeLabel}
                </Badge>
                {product.packCount && (
                  <Badge variant="outline">
                    <Package className="h-3 w-3 mr-1" />
                    {product.packCount} packs
                  </Badge>
                )}
              </div>
            </div>
          </div>
        </CardHeader>
        
        <CardContent className="pb-4">
          <div className="space-y-2">
            <p className="text-sm text-muted-foreground line-clamp-2">
              {product.description}
            </p>
            <div className="flex items-center justify-between text-sm">
              <div className="flex items-center gap-1 text-muted-foreground">
                <Calendar className="h-4 w-4" />
                {format(new Date(product.releaseDate), 'MMM d, yyyy')}
              </div>
              <span className="font-semibold text-primary">
                ${product.msrp}
              </span>
            </div>
          </div>
        </CardContent>
        
        <div className="absolute top-2 right-2 opacity-0 group-hover:opacity-100 transition-opacity">
          <Button 
            variant="default" 
            size="sm" 
            className="h-8 w-8 p-0 rounded-full"
            onClick={openAddModal}
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
