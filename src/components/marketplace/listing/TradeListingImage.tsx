
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
  const [isLoading, setIsLoading] = useState(true);
  
  useEffect(() => {
    if (!cardId && !imageUrl) {
      setImageError(true);
      setIsLoading(false);
      return;
    }
    
    setImageError(false);
    setRetryCount(0);
    setIsLoading(true);
    
    // Get all possible URLs from the sets API
    const possibleUrls = cardId ? getAllPossibleCardImageUrls(cardId) : [];
    console.log(`Got ${possibleUrls.length} possible image URLs for trade listing ${cardId}`);
    
    // Include the provided imageUrl if it exists
    const allSources = imageUrl ? [imageUrl, ...possibleUrls] : possibleUrls;
    const uniqueSources = [...new Set(allSources)];
    setAlternativeImages(uniqueSources);
    
    if (uniqueSources.length > 0) {
      setImageSrc(uniqueSources[0]);
    } else {
      setImageError(true);
      setIsLoading(false);
    }
  }, [cardId, imageUrl]);
  
  const handleImageLoad = () => {
    console.log("Trade listing image loaded successfully:", imageSrc);
    setIsLoading(false);
  };
  
  const handleImageError = () => {
    console.log(`Trade listing image failed to load: ${imageSrc}, retry: ${retryCount}`);
    
    const nextIndex = retryCount + 1;
    
    if (nextIndex < alternativeImages.length) {
      console.log(`Trying alternative image source ${nextIndex}: ${alternativeImages[nextIndex]}`);
      setTimeout(() => {
        setRetryCount(nextIndex);
        setImageSrc(alternativeImages[nextIndex]);
      }, 500); // Increased delay to prevent rate limiting
    } else {
      setImageError(true);
      setIsLoading(false);
      console.log("All image sources failed for trade listing card");
    }
  };
  
  const retryImage = () => {
    setImageError(false);
    setRetryCount(0);
    setIsLoading(true);
    
    if (alternativeImages.length > 0) {
      setImageSrc(alternativeImages[0]);
    }
  };

  return (
    <div className="w-1/3 relative group">
      {imageSrc && !imageError ? (
        <>
          <img 
            src={imageSrc} 
            alt={cardName}
            className={`w-full h-auto rounded-md transition-transform duration-300 group-hover:scale-105 ${isLoading ? 'opacity-0' : 'opacity-100'}`}
            onLoad={handleImageLoad}
            onError={handleImageError}
          />
          {isLoading && (
            <div className="absolute inset-0 flex items-center justify-center bg-muted rounded-md">
              <div className="h-8 w-8 animate-spin rounded-full border-4 border-primary border-t-transparent"></div>
            </div>
          )}
        </>
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
