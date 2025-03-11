
import React, { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { AlertTriangle, RefreshCw } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";

interface TradeListingImageProps {
  cardId?: string;
  imageUrl?: string;
  cardName: string;
  condition: string;
}

const POKEMON_TCG_API_URL = "https://api.pokemontcg.io/v2";
const CARD_BACK_URL = "https://archives.bulbagarden.net/media/upload/1/17/Cardback.jpg";
const PLACEHOLDER_URL = "/placeholder.svg";

const TradeListingImage = ({ cardId, imageUrl, cardName, condition }: TradeListingImageProps) => {
  const [imageSrc, setImageSrc] = useState<string>('');
  const [isLoading, setIsLoading] = useState(true);
  const [imageError, setImageError] = useState(false);

  useEffect(() => {
    const loadCardImage = async () => {
      // Reset state when props change
      setIsLoading(true);
      setImageError(false);
      
      try {
        // First try: Use provided imageUrl if available
        if (imageUrl) {
          console.log(`Trying provided image URL: ${imageUrl}`);
          setImageSrc(imageUrl);
          return;
        }
        
        // Second try: Check Supabase cache for the card
        if (cardId) {
          const { data: cachedCard, error: cacheError } = await supabase
            .from('pokemon_cards_cache')
            .select('data, image_url')
            .eq('id', cardId)
            .maybeSingle();
            
          if (!cacheError && cachedCard) {
            // Try to get the image URL from cached data
            const cardData = cachedCard.data;
            
            // If data is an object with images.large property
            if (cardData && 
                typeof cardData === 'object' && 
                'images' in cardData && 
                cardData.images && 
                typeof cardData.images === 'object' && 
                'large' in cardData.images) {
              
              console.log(`Using cached official image for card ${cardId}`);
              setImageSrc(cardData.images.large as string);
              return;
            }
            
            // Try image_url as fallback
            if (cachedCard.image_url) {
              console.log(`Using cached image URL for card ${cardId}: ${cachedCard.image_url}`);
              setImageSrc(cachedCard.image_url);
              return;
            }
          }
        }
        
        // Third try: Search by name using Pokemon TCG API
        if (cardName) {
          console.log(`Searching for card by name: ${cardName}`);
          const encodedName = encodeURIComponent(cardName);
          const response = await fetch(`${POKEMON_TCG_API_URL}/cards?q=name:"${encodedName}"&pageSize=1`);
          
          if (response.ok) {
            const data = await response.json();
            if (data.data && data.data.length > 0 && data.data[0].images && data.data[0].images.large) {
              console.log(`Found card by name search: ${data.data[0].name}`);
              setImageSrc(data.data[0].images.large);
              return;
            }
          }
        }
        
        // Fallback: Use basic card ID URL or placeholder
        if (cardId) {
          // Extract set and number from ID (e.g., "swsh4-120" -> set="swsh4", number="120")
          const parts = cardId.split('-');
          if (parts.length === 2) {
            const [setId, cardNumber] = parts;
            const directUrl = `https://images.pokemontcg.io/${setId}/${cardNumber}.png`;
            console.log(`Using direct API URL: ${directUrl}`);
            setImageSrc(directUrl);
            return;
          }
        }
        
        // Last resort: Use card back image
        console.log("Using default card back image");
        setImageSrc(CARD_BACK_URL);
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
    // If the image fails to load, use the card back
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
    
    // Try a simpler retry approach using Pokemon TCG API
    try {
      if (cardName) {
        const encodedName = encodeURIComponent(cardName);
        const response = await fetch(`${POKEMON_TCG_API_URL}/cards?q=name:"${encodedName}"&pageSize=1`);
        
        if (response.ok) {
          const data = await response.json();
          if (data.data && data.data.length > 0 && data.data[0].images && data.data[0].images.large) {
            setImageSrc(data.data[0].images.large);
            return;
          }
        }
      }
      
      // If we couldn't find by name, use the card back
      setImageSrc(CARD_BACK_URL);
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
