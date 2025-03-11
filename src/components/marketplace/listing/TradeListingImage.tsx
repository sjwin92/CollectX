
import React, { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { AlertTriangle, RefreshCw } from "lucide-react";
import { getImageUrlsForCard, checkImageUrl } from "@/services/cardImageService";

interface TradeListingImageProps {
  cardId?: string;
  imageUrl?: string;
  cardName: string;
  condition: string;
}

const TradeListingImage = ({ cardId, imageUrl, cardName, condition }: TradeListingImageProps) => {
  const [imageError, setImageError] = useState(false);
  const [currentImageIndex, setCurrentImageIndex] = useState(0);
  const [imageUrls, setImageUrls] = useState<string[]>([]);
  const [imageSrc, setImageSrc] = useState('');
  const [isLoading, setIsLoading] = useState(true);
  
  useEffect(() => {
    // Reset state when props change
    setImageError(false);
    setCurrentImageIndex(0);
    setIsLoading(true);
    
    // Get all possible image URLs
    const card = { id: cardId, imageUrl };
    const urls = getImageUrlsForCard(card);
    setImageUrls(urls);
    
    // Start with the first URL
    if (urls.length > 0) {
      setImageSrc(urls[0]);
      console.log(`Starting with image source: ${urls[0]} for card ${cardId || 'unknown'}`);
    } else {
      console.error('No image URLs available for card:', cardId);
      setImageError(true);
      setIsLoading(false);
    }
  }, [cardId, imageUrl]);
  
  const handleImageError = () => {
    // Try the next image in the sequence
    const nextIndex = currentImageIndex + 1;
    
    if (nextIndex < imageUrls.length) {
      console.log(`Image failed to load: ${imageSrc}. Trying alternative source #${nextIndex + 1}: ${imageUrls[nextIndex]}`);
      setCurrentImageIndex(nextIndex);
      setImageSrc(imageUrls[nextIndex]);
    } else {
      console.log('All image sources failed. Marking as error.');
      setImageError(true);
      setIsLoading(false);
    }
  };
  
  const handleImageLoad = () => {
    console.log(`Successfully loaded image: ${imageSrc}`);
    setIsLoading(false);
  };
  
  const retryImage = async () => {
    setIsLoading(true);
    setImageError(false);
    
    // Try to find a working image by checking URLs before setting them
    const card = { id: cardId, imageUrl };
    const urls = getImageUrlsForCard(card);
    
    for (let i = 0; i < urls.length; i++) {
      const url = urls[i];
      try {
        const works = await checkImageUrl(url);
        if (works) {
          console.log(`Found working image URL: ${url}`);
          setCurrentImageIndex(i);
          setImageSrc(url);
          return;
        }
      } catch (error) {
        console.log(`Error checking URL ${url}:`, error);
      }
    }
    
    // If we get here, no URLs worked
    console.log('No working image URLs found');
    setImageError(true);
    setIsLoading(false);
  };

  return (
    <div className="w-1/3 relative group">
      {!imageError ? (
        <div className="relative w-full h-full">
          {isLoading && (
            <div className="absolute inset-0 bg-muted flex items-center justify-center">
              <div className="h-6 w-6 animate-spin rounded-full border-4 border-primary border-t-transparent"></div>
            </div>
          )}
          <img 
            src={imageSrc} 
            alt={cardName}
            className={`w-full h-auto rounded-md transition-transform duration-300 group-hover:scale-105 ${isLoading ? 'opacity-0' : 'opacity-100'}`}
            onError={handleImageError}
            onLoad={handleImageLoad}
          />
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
