
import React, { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { AlertTriangle, RefreshCw } from "lucide-react";
import { getAllPossibleCardImageUrls } from "@/services/pokemonSetsApi";

interface TradeListingImageProps {
  cardId?: string;
  imageUrl?: string;
  cardName: string;
  condition: string;
}

const TradeListingImage = ({ cardId, imageUrl, cardName, condition }: TradeListingImageProps) => {
  const [imageError, setImageError] = useState(false);
  const [imageSrc, setImageSrc] = useState<string>("");
  const [retryCount, setRetryCount] = useState(0);
  const [alternativeImages, setAlternativeImages] = useState<string[]>([]);
  
  useEffect(() => {
    if (!cardId && !imageUrl) {
      setImageError(true);
      return;
    }
    
    // Reset state
    setImageError(false);
    setRetryCount(0);
    
    // Get all possible image URLs from the sets API if we have a card ID
    if (cardId) {
      const possibleUrls = getAllPossibleCardImageUrls(cardId);
      console.log(`Got ${possibleUrls.length} possible image URLs for trade listing ${cardId}`);
      
      // Include the provided imageUrl if it exists and is not already in the list
      const allSources = imageUrl 
        ? [imageUrl, ...possibleUrls]
        : possibleUrls;
        
      // Remove duplicates
      const uniqueSources = [...new Set(allSources)];
      setAlternativeImages(uniqueSources);
      
      // Start with the first image
      if (uniqueSources.length > 0) {
        setImageSrc(uniqueSources[0]);
      }
    } else if (imageUrl) {
      // If we only have imageUrl, use that
      setImageSrc(imageUrl);
      setAlternativeImages([imageUrl]);
    }
  }, [cardId, imageUrl]);
  
  const handleImageError = () => {
    console.log(`Trade listing image failed to load: ${imageSrc}, retry: ${retryCount}`);
    
    const nextIndex = retryCount + 1;
    
    if (nextIndex < alternativeImages.length) {
      console.log(`Trying alternative image source ${nextIndex}: ${alternativeImages[nextIndex]}`);
      // Add a delay before trying the next image source to prevent rate limiting
      setTimeout(() => {
        setRetryCount(nextIndex);
        setImageSrc(alternativeImages[nextIndex]);
      }, 250);
    } else {
      setImageError(true);
      console.log("All image sources failed for trade listing card");
    }
  };
  
  const retryImage = () => {
    setImageError(false);
    setRetryCount(0);
    
    // Start with the first alternative again
    if (alternativeImages.length > 0) {
      setImageSrc(alternativeImages[0]);
    }
  };

  return (
    <div className="w-1/3 relative group">
      {imageSrc && !imageError ? (
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
