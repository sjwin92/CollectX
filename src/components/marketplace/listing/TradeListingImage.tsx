import React, { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { AlertTriangle, RefreshCw, Loader2 } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { findWorkingImageUrl } from "@/services/cardImageService";
import { PokemonCard } from "@/services/pokemonTcgApi";
import { Json } from "@/integrations/supabase/types";

interface TradeListingImageProps {
  cardId?: string;
  imageUrl?: string;
  cardName: string;
  condition: string;
}

const CARD_BACK_URL = "https://archives.bulbagarden.net/media/upload/1/17/Cardback.jpg";

const TradeListingImage = ({ cardId, imageUrl, cardName, condition }: TradeListingImageProps) => {
  const [imageSrc, setImageSrc] = useState<string>(CARD_BACK_URL);
  const [isLoading, setIsLoading] = useState(true);
  const [imageError, setImageError] = useState(false);

  useEffect(() => {
    const loadCardImage = async () => {
      setIsLoading(true);
      setImageError(false);
      
      try {
        if (!cardId && !imageUrl) {
          console.log('No card ID or image URL provided for:', cardName);
          return;
        }

        // First try to get image from Supabase cache if we have an ID
        if (cardId) {
          const { data: cachedCard } = await supabase
            .from('pokemon_cards_cache')
            .select('data, image_url')
            .eq('id', cardId)
            .maybeSingle();

          if (cachedCard) {
            // If we have a direct image_url, use that first
            if (cachedCard.image_url) {
              console.log(`Using cached image_url for card ${cardId}`);
              setImageSrc(cachedCard.image_url);
              return;
            }
            
            // Otherwise check the data field
            if (typeof cachedCard.data === 'object' && cachedCard.data !== null) {
              // First cast to unknown, then to a record to check the structure
              const tempData = cachedCard.data as unknown;
              
              // Check if it has the expected structure before treating it as a PokemonCard
              if (isPokemonCardLike(tempData)) {
                console.log(`Using cached image for card ${cardId}`);
                if (tempData.images.large) {
                  setImageSrc(tempData.images.large);
                  return;
                } else if (tempData.images.small) {
                  setImageSrc(tempData.images.small);
                  return;
                }
              }
            }
          }
        }
        
        // Use our card image service to find a working image
        const card = {
          id: cardId,
          name: cardName,
          imageUrl: imageUrl
        };
        
        const bestImageUrl = await findWorkingImageUrl(card);
        console.log(`Found best image URL for ${cardName}:`, bestImageUrl);
        setImageSrc(bestImageUrl);
      } catch (error) {
        console.error("Error loading card image:", error);
        setImageError(true);
      } finally {
        // Make sure loading state ends even if there's an error
        setIsLoading(false);
      }
    };
    
    loadCardImage();
  }, [cardId, imageUrl, cardName]);
  
  // Helper function to type check if an object has the expected PokemonCard structure
  const isPokemonCardLike = (obj: unknown): obj is { images: { large?: string, small?: string } } => {
    return (
      obj !== null &&
      typeof obj === 'object' &&
      'images' in obj &&
      obj.images !== null &&
      typeof obj.images === 'object' &&
      (('large' in obj.images && typeof obj.images.large === 'string') || 
       ('small' in obj.images && typeof obj.images.small === 'string'))
    );
  };
  
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
      const card = {
        id: cardId,
        name: cardName,
        imageUrl: imageUrl
      };
      
      const bestImageUrl = await findWorkingImageUrl(card);
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
