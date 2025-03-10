
import React, { useState } from "react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { AlertTriangle, RefreshCw } from "lucide-react";
import { getReliableImageUrl } from "@/services/pokemonTcgApi";

interface TradeListingImageProps {
  cardId?: string;
  imageUrl?: string;
  cardName: string;
  condition: string;
}

const TradeListingImage = ({ cardId, imageUrl, cardName, condition }: TradeListingImageProps) => {
  const [imageError, setImageError] = useState(false);
  const [imageSrc, setImageSrc] = useState(() => {
    // First try to use the reliable image URL if cardId is available
    if (cardId) {
      return getReliableImageUrl(cardId, 'small');
    }
    // Fall back to provided imageUrl if available
    return imageUrl || '';
  });
  
  const handleImageError = () => {
    if (imageError) return;
    
    if (cardId) {
      // Try the large image as a fallback
      const newSrc = getReliableImageUrl(cardId, 'large');
      console.log(`Trying alternative image source: ${newSrc}`);
      setImageSrc(newSrc);
      setImageError(true); // Mark as having an error, so we don't retry infinitely
    } else {
      setImageError(true);
    }
  };
  
  const retryImage = () => {
    setImageError(false);
    if (cardId) {
      setImageSrc(getReliableImageUrl(cardId, 'small'));
    } else {
      setImageSrc(imageUrl || '');
    }
  };

  return (
    <div className="w-1/3 relative group">
      {!imageError ? (
        <img 
          src={imageSrc} 
          alt={cardName}
          className="w-full h-auto rounded-md transition-transform duration-300 group-hover:scale-105"
          onError={handleImageError}
        />
      ) : (
        <div className="w-full aspect-[2/3] bg-muted flex flex-col items-center justify-center rounded-md">
          <AlertTriangle className="h-5 w-5 text-amber-500 mb-1" />
          <span className="text-xs text-muted-foreground mb-2">Image unavailable</span>
          <Button 
            size="sm" 
            variant="outline" 
            className="text-xs" 
            onClick={(e) => {
              e.stopPropagation();
              retryImage();
            }}
          >
            <RefreshCw className="h-3 w-3 mr-1" /> Retry
          </Button>
        </div>
      )}
      <div className="absolute top-2 right-2">
        <Badge variant="secondary" className="text-xs">
          {condition}
        </Badge>
      </div>
    </div>
  );
};

export default TradeListingImage;
