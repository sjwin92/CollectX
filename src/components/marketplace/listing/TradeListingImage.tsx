
import React, { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { AlertTriangle, RefreshCw } from "lucide-react";
import { getAllPossibleCardImageUrls } from "@/services/api/cardImageService";
import { getFeaturedCardImageUrl } from "@/services/api/featuredCardsService";
import { SmartImage } from "@/components/common/SmartImage";
import { conditionTone } from "./conditionTone";

interface TradeListingImageProps {
  cardId?: string;
  imageUrl?: string;
  cardName: string;
  condition: string;
  isFeatured?: boolean;
}

const TradeListingImage = ({ 
  cardId, 
  imageUrl, 
  cardName, 
  condition, 
  isFeatured = false 
}: TradeListingImageProps) => {
  const [imageError, setImageError] = useState(false);
  const [imageSrc, setImageSrc] = useState<string>("");
  const [retryCount, setRetryCount] = useState(0);
  const [alternativeImages, setAlternativeImages] = useState<string[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  
  useEffect(() => {
    if (!cardId && !imageUrl) {
      setImageError(true);
      setIsLoading(false);
      console.error(`No cardId or imageUrl provided for ${cardName}`);
      return;
    }
    
    setImageError(false);
    setRetryCount(0);
    setIsLoading(true);
    
    // Get images based on whether this is a featured card or not
    let allSources: string[] = [];
    
    if (isFeatured && cardId) {
      // For featured cards, use our dedicated featured card service
      const featuredImageUrl = getFeaturedCardImageUrl(cardId, 'large');
      allSources = [featuredImageUrl];
      console.log(`Using featured card image URL for ${cardName}: ${featuredImageUrl}`);
    } else {
      // For regular cards, get all possible fallbacks
      const possibleUrls = cardId ? getAllPossibleCardImageUrls(cardId) : [];
      
      // Add the provided imageUrl only if it doesn't exist in the list
      allSources = [...possibleUrls];
      if (imageUrl && !possibleUrls.includes(imageUrl)) {
        allSources.unshift(imageUrl); // Put provided URL first
      }
    }
    
    // Make sure we have unique URLs
    const uniqueSources = [...new Set(allSources)].filter(Boolean);
    setAlternativeImages(uniqueSources);
    
    console.log(`Trade listing for ${cardName}: Found ${uniqueSources.length} possible image sources, isFeatured: ${isFeatured}`);
    
    if (uniqueSources.length > 0) {
      setImageSrc(uniqueSources[0]);
      console.log(`Initial image source for trade listing: ${uniqueSources[0]}`);
    } else {
      setImageError(true);
      setIsLoading(false);
      console.error(`No valid image sources found for ${cardName}`);
    }
  }, [cardId, imageUrl, cardName, isFeatured]);
  
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
      console.log(`Retrying with first image source: ${alternativeImages[0]}`);
    }
  };

  return (
    <div className="pedestal relative w-32 shrink-0 sm:w-36">
      <div className="relative overflow-hidden rounded-xl border border-white/[0.13] shadow-[0_26px_46px_-22px_rgba(0,0,0,0.85),inset_0_1px_0_rgba(255,255,255,0.06)]">
        {!imageError ? (
          <div className="relative w-full">
            {imageSrc && (
              <SmartImage
                src={imageSrc}
                alt={cardName}
                className={`block w-full h-auto transition-transform duration-500 ease-out group-hover:-translate-y-0.5 ${isLoading ? 'opacity-0' : 'opacity-100'}`}
                onLoad={handleImageLoad}
                onError={handleImageError}
              />
            )}
            {isLoading && (
              <div className="absolute inset-0 flex items-center justify-center bg-muted">
                <div className="h-7 w-7 animate-spin rounded-full border-4 border-primary border-t-transparent" />
              </div>
            )}
            <span className="holo" aria-hidden />
          </div>
        ) : (
          <div className="flex aspect-[2/3] w-full flex-col items-center justify-center bg-muted">
            <AlertTriangle className="mb-1 h-5 w-5 text-amber-500" />
            <span className="mb-2 text-xs text-muted-foreground">Image unavailable</span>
            <Button
              size="sm"
              variant="outline"
              className="text-xs"
              onClick={(e) => { e.stopPropagation(); retryImage(); }}
            >
              <RefreshCw className="mr-1 h-3 w-3" /> Retry
            </Button>
          </div>
        )}
        {condition && (
          <span className={`absolute right-1.5 top-1.5 rounded-full border px-2 py-[3px] text-[10px] font-semibold backdrop-blur-sm ${conditionTone(condition)}`}>
            {condition}
          </span>
        )}
      </div>
    </div>
  );
};

export default TradeListingImage;
