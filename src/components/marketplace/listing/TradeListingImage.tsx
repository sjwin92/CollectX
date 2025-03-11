import React, { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { AlertTriangle, RefreshCw } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { findWorkingImageUrl } from "@/services/cardImageService";
import { PokemonCard } from "@/services/pokemonTcgApi";

interface TradeListingImageProps {
  cardId?: string;
  imageUrl?: string;
  cardName: string;
  condition: string;
}

const CARD_BACK_URL = "https://archives.bulbagarden.net/media/upload/1/17/Cardback.jpg";

const TradeListingImage = ({ cardId, imageUrl, cardName, condition }: TradeListingImageProps) => {
  const [imageSrc, setImageSrc] = useState<string>('');
  const [isLoading, setIsLoading] = useState(true);
  const [imageError, setImageError] = useState(false);

  useEffect(() => {
    const loadCardImage = async () => {
      setIsLoading(true);
      setImageError(false);
      
      try {
        if (!cardId && !imageUrl) {
          console.log('No card ID or image URL provided');
          setImageSrc(CARD_BACK_URL);
          return;
        }

        // First try to get image from Supabase cache if we have an ID
        if (cardId) {
          const { data: cachedCard } = await supabase
            .from('pokemon_cards_cache')
            .select('data')
            .eq('id', cardId)
            .maybeSingle();

          // Properly type the cached card data
          if (cachedCard && typeof cachedCard.data === 'object' && cachedCard.data !== null) {
            const cardData = cachedCard.data as PokemonCard;
            if (cardData.images?.large) {
              console.log(`Using cached image for card ${cardId}`);
              setImageSrc(cardData.images.large);
              return;
            }
          }
        }
        
        // If we have a direct image URL, try it
        if (imageUrl && imageUrl.trim() !== '') {
          console.log(`Using provided image URL: ${imageUrl}`);
          setImageSrc(imageUrl);
          return;
        }
        
        // Otherwise, use our card image service to find a working image
        const card = {
          id: cardId,
          name: cardName,
          imageUrl: imageUrl
        };
        
        const bestImageUrl = await findWorkingImageUrl(card);
        console.log(`Found best image URL: ${bestImageUrl}`);
        setImageSrc(bestImageUrl);
      } catch (error) {
        console.error("Error loading card image:", error);
        setImageError(true);
        setImageSrc(CARD_BACK_URL);
      }
    };
    
    loadCardImage();
  }, [cardId, imageUrl, cardName]);
  
  const handleImageLoad = () => {
    setIsLoading(false);
    console.log(`Successfully loaded image: ${imageSrc}`);
  };
  
  const handleImageError = () => {
    console.log(`Image failed to load: ${imageSrc}`);
    
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
    }
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
