
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
        // Priority 1: Direct image URL if provided
        if (imageUrl && imageUrl.trim() !== '') {
          console.log(`Using provided image URL: ${imageUrl}`);
          setImageSrc(imageUrl);
          return;
        }
        
        // Priority 2: Try direct TCG API URL if we have a card ID
        if (cardId) {
          // Extract set and number from ID (e.g., "swsh4-120" -> set="swsh4", number="120")
          const parts = cardId.split('-');
          if (parts.length === 2) {
            const [setId, cardNumber] = parts;
            // Use the high resolution image directly (more reliable)
            const directUrl = `https://images.pokemontcg.io/${setId}/${cardNumber}_hires.png`;
            console.log(`Using direct high-res API URL: ${directUrl}`);
            setImageSrc(directUrl);
            return;
          }
        }
        
        // Priority 3: Check Supabase cache for the card
        if (cardId) {
          const { data: cachedCard, error: cacheError } = await supabase
            .from('pokemon_cards_cache')
            .select('data, image_url')
            .eq('id', cardId)
            .maybeSingle();
            
          if (!cacheError && cachedCard) {
            // If we have a direct image_url in the cache, use that
            if (cachedCard.image_url && typeof cachedCard.image_url === 'string') {
              console.log(`Using cached image URL for card ${cardId}: ${cachedCard.image_url}`);
              setImageSrc(cachedCard.image_url);
              return;
            }
            
            // Try to extract image URL from the cached data
            if (cachedCard.data) {
              const cardData = cachedCard.data;
              
              // Check if data is an object
              if (cardData && typeof cardData === 'object') {
                // Check for images nested structure
                if ('images' in cardData && cardData.images) {
                  const images = cardData.images;
                  
                  // Try to get large image
                  if (typeof images === 'object' && 'large' in images && typeof images.large === 'string') {
                    console.log(`Using cached large image URL from data: ${images.large}`);
                    setImageSrc(images.large);
                    return;
                  }
                  
                  // Try to get small image as fallback
                  if (typeof images === 'object' && 'small' in images && typeof images.small === 'string') {
                    console.log(`Using cached small image URL from data: ${images.small}`);
                    setImageSrc(images.small);
                    return;
                  }
                }
              }
            }
          }
        }
        
        // Priority 4: Search by name using Pokemon TCG API
        if (cardName && cardName.length > 0) {
          console.log(`Searching for card by name: ${cardName}`);
          
          // Encode and clean the name for the API
          const cleanName = cardName.replace(/[^\w\s]/gi, ''); // Remove special characters
          const encodedName = encodeURIComponent(`"${cleanName}"`);
          
          const response = await fetch(`${POKEMON_TCG_API_URL}/cards?q=name:${encodedName}&pageSize=1`, {
            headers: {
              'X-Api-Key': '3329f6d3-cb49-4b09-9997-2ee636a023e4'
            }
          });
          
          if (response.ok) {
            const data = await response.json();
            if (data.data && data.data.length > 0) {
              const card = data.data[0];
              console.log(`Found card by name search: ${card.name}`);
              
              // Check if high-res image is available
              if (card.images && card.images.large) {
                console.log(`Using high-res image from name search: ${card.images.large}`);
                setImageSrc(card.images.large);
                
                // Cache this result in Supabase if we have a card ID
                if (cardId) {
                  try {
                    await supabase
                      .from('pokemon_cards_cache')
                      .upsert({
                        id: cardId,
                        data: card,
                        image_url: card.images.large,
                        cached_at: new Date().toISOString(),
                        name: card.name
                      });
                    console.log(`Cached card data for ${cardId}`);
                  } catch (cacheErr) {
                    console.error(`Failed to cache card data: ${cacheErr}`);
                  }
                }
                
                return;
              }
            }
          }
        }
        
        // Last resort: Use card back image
        console.log("Falling back to default card back image");
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
    
    // If the current image failed and it's not already the card back, try the card back
    if (imageSrc !== CARD_BACK_URL) {
      setImageSrc(CARD_BACK_URL);
    } else {
      // If even the card back fails, show the error state
      setImageError(true);
      setIsLoading(false);
    }
  };
  
  const retryImage = async () => {
    setIsLoading(true);
    setImageError(false);
    
    // Retry with direct search by card name
    try {
      if (cardName) {
        const cleanName = cardName.replace(/[^\w\s]/gi, '');
        const encodedName = encodeURIComponent(`"${cleanName}"`);
        const response = await fetch(`${POKEMON_TCG_API_URL}/cards?q=name:${encodedName}&pageSize=1`, {
          headers: {
            'X-Api-Key': '3329f6d3-cb49-4b09-9997-2ee636a023e4'
          }
        });
        
        if (response.ok) {
          const data = await response.json();
          if (data.data && data.data.length > 0 && data.data[0].images && data.data[0].images.large) {
            setImageSrc(data.data[0].images.large);
            return;
          }
        }
      }
      
      // If name search fails, use the card back
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
