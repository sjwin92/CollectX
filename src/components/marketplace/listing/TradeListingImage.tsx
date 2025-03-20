import React, { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { AlertTriangle, RefreshCw } from "lucide-react";
import { getAllPossibleCardImageUrls, getGuaranteedImageUrl } from "@/services/api/cardImageService";

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
    
    // Try guaranteed image URL first for known cards
    let initialSource = cardId ? getGuaranteedImageUrl(cardId) : null;
    
    // If no guaranteed URL, try provided imageUrl
    if (!initialSource && imageUrl) {
      initialSource = imageUrl;
    }
    
    // Get all possible image URLs - using our improved service
    const possibleUrls = cardId ? getAllPossibleCardImageUrls(cardId) : [];
    
    // Combine all sources ensuring guaranteed URL is first
    let allSources = [initialSource].filter(Boolean) as string[];
    allSources = [...allSources, ...possibleUrls];
    
    // Add the provided imageUrl if not already included
    if (imageUrl && !allSources.includes(imageUrl)) {
      allSources.push(imageUrl);
    }
    
    // Make sure we have unique URLs
    const uniqueSources = [...new Set(allSources)];
    setAlternativeImages(uniqueSources);
    
    console.log(`Trade listing for ${cardName}: Found ${uniqueSources.length} possible image sources`);
    
    if (uniqueSources.length > 0) {
      setImageSrc(uniqueSources[0]);
      console.log(`Initial image source for trade listing: ${uniqueSources[0]}`);
    } else {
      setImageError(true);
      setIsLoading(false);
    }
  }, [cardId, imageUrl, cardName]);
  
  const handleImageLoad = () => {
    console.log("Trade listing image loaded successfully:", imageSrc);
    setIsLoading(false);
    setImageError(false);
  };
  
  const handleImageError = () => {
    console.log(`Trade listing image failed to load: ${imageSrc}, retry: ${retryCount}`);
    
    // Try the next image source
    const nextIndex = retryCount + 1;
    
    if (nextIndex < alternativeImages.length) {
      console.log(`Trying alternative image source ${nextIndex}: ${alternativeImages[nextIndex]}`);
      setRetryCount(nextIndex);
      setImageSrc(alternativeImages[nextIndex]);
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

  useEffect(() => {
    let timeoutId: number | undefined;
    
    if (isLoading) {
      timeoutId = window.setTimeout(() => {
        if (isLoading && retryCount < alternativeImages.length - 1) {
          console.log("Trade listing image loading timed out, trying next source");
          handleImageError();
        } else if (isLoading && retryCount >= alternativeImages.length - 1) {
          setImageError(true);
          setIsLoading(false);
          console.log("All image sources timed out for trade listing card:", cardName);
        }
      }, 2000);
    }
    
    return () => {
      if (timeoutId) window.clearTimeout(timeoutId);
    };
  }, [isLoading, retryCount, alternativeImages.length, cardName]);
  
  return (
    <div className="w-1/3 relative group">
      {!imageError ? (
        <div className="relative w-full h-full">
          {imageSrc && (
            <img 
              src={imageSrc} 
              alt={cardName}
              className={`w-full h-auto rounded-md transition-transform duration-300 group-hover:scale-105 ${isLoading ? 'opacity-0' : 'opacity-100'}`}
              onLoad={handleImageLoad}
              onError={handleImageError}
            />
          )}
          {isLoading && (
            <div className="absolute inset-0 flex items-center justify-center bg-muted rounded-md">
              <div className="h-8 w-8 animate-spin rounded-full border-4 border-primary border-t-transparent"></div>
            </div>
          )}
        </div>
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
