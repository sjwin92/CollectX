
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
    // Use the provided imageUrl first if available
    if (imageUrl && imageUrl.trim() !== '') {
      return imageUrl;
    }
    // Then try to use the cardId to get a reliable image URL
    if (cardId) {
      return getReliableImageUrl(cardId, 'small');
    }
    return '';
  });
  
  const handleImageError = () => {
    if (imageError) return;
    
    // If the first image source fails, try alternatives
    if (cardId) {
      // Try the large image as a fallback
      const newSrc = getReliableImageUrl(cardId, 'large');
      console.log(`Image failed to load. Trying alternative source: ${newSrc}`);
      setImageSrc(newSrc);
      setImageError(true); // Mark as having an error, so we don't retry infinitely
    } else if (imageUrl) {
      // If we were using imageUrl and it failed, try to use the card back
      console.log('Image URL failed to load. Marking as error.');
      setImageError(true);
    } else {
      setImageError(true);
    }
  };
  
  const retryImage = () => {
    setImageError(false);
    // Reset to the original logic for determining the image source
    if (imageUrl && imageUrl.trim() !== '') {
      setImageSrc(imageUrl);
    } else if (cardId) {
      setImageSrc(getReliableImageUrl(cardId, 'small'));
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
