
import React, { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { AlertTriangle, RefreshCw, Loader2 } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { getPokemonTcgIoUrl, getAlternativeImageUrls } from "@/services/cardImageService";

interface TradeListingImageProps {
  cardId?: string;
  imageUrl?: string;
  cardName: string;
  condition: string;
}

const CARD_BACK_URL = "https://archives.bulbagarden.net/media/upload/1/17/Cardback.jpg";

const TradeListingImage = ({ cardId, imageUrl, cardName, condition }: TradeListingImageProps) => {
  const [imageSrc, setImageSrc] = useState<string>("");
  const [isLoading, setIsLoading] = useState(true);
  const [imageError, setImageError] = useState(false);
  const [retryCount, setRetryCount] = useState(0);
  const { toast } = useToast();
  
  useEffect(() => {
    setIsLoading(true);
    setImageError(false);
    
    if (cardId) {
      // Try using the Pokemon TCG IO URL format first (most reliable)
      const reliableImageUrl = getPokemonTcgIoUrl(cardId);
      if (reliableImageUrl) {
        console.log(`Setting reliable image URL for ${cardName}: ${reliableImageUrl}`);
        setImageSrc(reliableImageUrl);
        setIsLoading(false);
        return;
      }
    }
    
    // If we can't generate a reliable URL, use the provided image URL
    if (imageUrl) {
      setImageSrc(imageUrl);
    } else {
      setImageSrc(CARD_BACK_URL);
      setImageError(true);
    }
    
    setIsLoading(false);
  }, [cardId, imageUrl, retryCount]);
  
  const handleImageLoad = () => {
    setIsLoading(false);
    setImageError(false);
    console.log(`Successfully loaded image for ${cardName}: ${imageSrc}`);
  };
  
  const handleImageError = () => {
    console.log(`Image failed to load for ${cardName}: ${imageSrc}`);
    
    // If we have a card ID, try alternative formats
    if (cardId && imageSrc !== CARD_BACK_URL) {
      const alternativeUrls = getAlternativeImageUrls(cardId, imageUrl);
      const currentIndex = alternativeUrls.indexOf(imageSrc);
      
      // Try the next URL in the list
      if (currentIndex >= 0 && currentIndex < alternativeUrls.length - 1) {
        const nextUrl = alternativeUrls[currentIndex + 1];
        console.log(`Trying alternative URL: ${nextUrl}`);
        setImageSrc(nextUrl);
        return;
      }
    }
    
    // If all else fails, use card back
    setImageSrc(CARD_BACK_URL);
    setImageError(true);
    setIsLoading(false);
  };
  
  const retryImage = () => {
    setIsLoading(true);
    setImageError(false);
    setRetryCount(prev => prev + 1);
    
    toast({
      title: "Retrying image load",
      description: `Attempting to find a better image for ${cardName}`
    });
  };

  return (
    <div className="w-1/3 relative group">
      {!imageError ? (
        <div className="relative w-full h-full">
          {isLoading && (
            <div className="absolute inset-0 bg-muted flex items-center justify-center">
              <Loader2 className="h-6 w-6 animate-spin text-primary" />
            </div>
          )}
          <img 
            src={imageSrc} 
            alt={`${cardName} Pokemon card`}
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
