
import React, { useState } from "react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { AlertTriangle, RefreshCw } from "lucide-react";
import { getImageUrlsForCard } from "@/services/cardImageService";

interface TradeListingImageProps {
  cardId?: string;
  imageUrl?: string;
  cardName: string;
  condition: string;
}

const TradeListingImage = ({ cardId, imageUrl, cardName, condition }: TradeListingImageProps) => {
  const [imageError, setImageError] = useState(false);
  const [currentImageIndex, setCurrentImageIndex] = useState(0);
  const [imageSrc, setImageSrc] = useState(() => {
    const card = { id: cardId, imageUrl };
    const urls = getImageUrlsForCard(card);
    return urls[0] || '/placeholder.svg';
  });
  
  const handleImageError = () => {
    const card = { id: cardId, imageUrl };
    const urls = getImageUrlsForCard(card);
    
    // Try the next image in the sequence
    const nextIndex = currentImageIndex + 1;
    
    if (nextIndex < urls.length) {
      console.log(`Image failed to load. Trying alternative source #${nextIndex + 1}: ${urls[nextIndex]}`);
      setCurrentImageIndex(nextIndex);
      setImageSrc(urls[nextIndex]);
    } else {
      console.log('All image sources failed. Marking as error.');
      setImageError(true);
    }
  };
  
  const retryImage = () => {
    const card = { id: cardId, imageUrl };
    const urls = getImageUrlsForCard(card);
    
    setImageError(false);
    setCurrentImageIndex(0);
    setImageSrc(urls[0] || '/placeholder.svg');
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
