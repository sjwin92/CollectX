
import React, { useState, useEffect, useCallback } from "react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { AlertTriangle, RefreshCw, Loader2 } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { findWorkingImageUrl, getImageUrlsForCard } from "@/services/cardImageService";
import { useToast } from "@/hooks/use-toast";

interface TradeListingImageProps {
  cardId?: string;
  imageUrl?: string;
  cardName: string;
  condition: string;
}

const CARD_BACK_URL = "https://archives.bulbagarden.net/media/upload/1/17/Cardback.jpg";

const TradeListingImage = ({ cardId, imageUrl, cardName, condition }: TradeListingImageProps) => {
  const [imageSrc, setImageSrc] = useState<string>(imageUrl || CARD_BACK_URL);
  const [isLoading, setIsLoading] = useState(true);
  const [imageError, setImageError] = useState(false);
  const [retryCount, setRetryCount] = useState(0);
  const { toast } = useToast();
  
  // Create a memoized function to load the card image
  const loadCardImage = useCallback(async () => {
    setIsLoading(true);
    setImageError(false);
    
    try {
      if (!cardId && !imageUrl) {
        console.log('No card ID or image URL provided for:', cardName);
        setImageSrc(CARD_BACK_URL);
        setIsLoading(false);
        return;
      }

      // First check the database for a verified image
      const { data: alternativeImages } = await supabase
        .from('card_alternative_images')
        .select('image_url')
        .eq('card_id', cardId)
        .eq('is_verified', true)
        .order('created_at', { ascending: false })
        .limit(1);
        
      if (alternativeImages && alternativeImages.length > 0) {
        console.log(`Found verified image in database for ${cardId}: ${alternativeImages[0].image_url}`);
        setImageSrc(alternativeImages[0].image_url);
        setIsLoading(false);
        return;
      }
      
      // If no verified images, use our service to find a working image
      const card = {
        id: cardId || 'unknown',
        name: cardName,
        imageUrl: imageUrl
      };
      
      const bestImageUrl = await findWorkingImageUrl(card);
      console.log(`Found best image URL for ${cardName}:`, bestImageUrl);
      setImageSrc(bestImageUrl);
    } catch (error) {
      console.error("Error loading card image:", error);
      setImageError(true);
      setImageSrc(CARD_BACK_URL);
    } finally {
      setIsLoading(false);
    }
  }, [cardId, imageUrl, cardName]);
  
  // Load the image on mount and when dependencies change
  useEffect(() => {
    loadCardImage();
  }, [loadCardImage, retryCount]);
  
  const handleImageLoad = () => {
    setIsLoading(false);
    console.log(`Successfully loaded image for ${cardName}: ${imageSrc}`);
  };
  
  const handleImageError = async () => {
    console.log(`Image failed to load for ${cardName}: ${imageSrc}`);
    
    if (imageSrc !== CARD_BACK_URL) {
      // Try to find alternative URLs directly from our service
      try {
        const possibleUrls = getImageUrlsForCard({ id: cardId || 'unknown', name: cardName, imageUrl });
        
        // Find first URL that's not the current failing one
        const alternativeUrl = possibleUrls.find(url => url !== imageSrc && url !== CARD_BACK_URL);
        
        if (alternativeUrl) {
          console.log(`Trying alternative URL for ${cardName}: ${alternativeUrl}`);
          setImageSrc(alternativeUrl);
          return;
        }
      } catch (error) {
        console.error("Error finding alternative URL:", error);
      }
      
      // If no alternatives found, use fallback
      setImageSrc(CARD_BACK_URL);
    } else {
      setImageError(true);
      setIsLoading(false);
    }
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
