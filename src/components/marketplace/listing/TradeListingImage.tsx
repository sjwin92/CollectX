
import React, { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { AlertTriangle, RefreshCw, Loader2 } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { findWorkingImageUrl } from "@/services/cardImageService";

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

  useEffect(() => {
    const loadCardImage = async () => {
      setIsLoading(true);
      setImageError(false);
      
      try {
        if (!cardId && !imageUrl) {
          console.log('No card ID or image URL provided for:', cardName);
          setImageSrc(CARD_BACK_URL);
          setIsLoading(false);
          return;
        }

        // Query the card_alternative_images table first for verified images
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
        
        // If no verified images in database, try to find a working image
        const bestImageUrl = await findWorkingImageUrl({
          id: cardId || '',
          name: cardName,
          imageUrl: imageUrl
        });
        
        console.log(`Found best image URL for ${cardName}:`, bestImageUrl);
        setImageSrc(bestImageUrl);
      } catch (error) {
        console.error("Error loading card image:", error);
        setImageError(true);
        setImageSrc(CARD_BACK_URL);
      } finally {
        // Make sure loading state ends even if there's an error
        setIsLoading(false);
      }
    };
    
    loadCardImage();
  }, [cardId, imageUrl, cardName]);
  
  const handleImageLoad = () => {
    setIsLoading(false);
    console.log(`Successfully loaded image for ${cardName}: ${imageSrc}`);
  };
  
  const handleImageError = () => {
    console.log(`Image failed to load for ${cardName}: ${imageSrc}`);
    
    if (imageSrc !== CARD_BACK_URL) {
      setImageSrc(CARD_BACK_URL);
    } else {
      setImageError(true);
      setIsLoading(false);
    }
  };
  
  const retryImage = async () => {
    setIsLoading(true);
    setImageError(false);
    
    try {
      // Query first from verified images in database
      const { data: alternativeImages } = await supabase
        .from('card_alternative_images')
        .select('image_url')
        .eq('card_id', cardId)
        .order('created_at', { ascending: false })
        .limit(1);
        
      if (alternativeImages && alternativeImages.length > 0) {
        setImageSrc(alternativeImages[0].image_url);
        return;
      }
      
      // Try other sources if no database entry
      const bestImageUrl = await findWorkingImageUrl({
        id: cardId || '',
        name: cardName,
        imageUrl: imageUrl
      });
      
      setImageSrc(bestImageUrl);
    } catch (error) {
      console.error("Error during retry:", error);
      setImageSrc(CARD_BACK_URL);
      setImageError(true);
    } finally {
      setIsLoading(false);
    }
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
