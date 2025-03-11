
import React, { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { AlertTriangle, RefreshCw } from "lucide-react";
import { getImageUrlsForCard, checkImageUrl, findWorkingImageUrl } from "@/services/cardImageService";
import { supabase } from "@/integrations/supabase/client";

interface TradeListingImageProps {
  cardId?: string;
  imageUrl?: string;
  cardName: string;
  condition: string;
}

// Helper function to safely type check and access nested properties
const safelyAccessImageUrl = (data: any): string | undefined => {
  if (
    typeof data === 'object' && 
    data !== null && 
    'images' in data && 
    data.images && 
    typeof data.images === 'object' &&
    'large' in data.images
  ) {
    return data.images.large as string;
  }
  
  return undefined;
};

const TradeListingImage = ({ cardId, imageUrl, cardName, condition }: TradeListingImageProps) => {
  const [imageError, setImageError] = useState(false);
  const [currentImageIndex, setCurrentImageIndex] = useState(0);
  const [imageUrls, setImageUrls] = useState<string[]>([]);
  const [imageSrc, setImageSrc] = useState('');
  const [isLoading, setIsLoading] = useState(true);
  
  useEffect(() => {
    const loadCardImage = async () => {
      // Reset state when props change
      setImageError(false);
      setCurrentImageIndex(0);
      setIsLoading(true);
      
      // Start by trying to find a working image
      try {
        // If we have a cardId, try to get it from cache first
        if (cardId) {
          console.log(`Trying to load image for card ID: ${cardId}`);
          
          // Check if we have this card in Supabase cache
          const { data: cachedData, error: cacheError } = await supabase
            .from('pokemon_cards_cache')
            .select('data, image_url')
            .eq('id', cardId)
            .maybeSingle();
            
          if (!cacheError && cachedData?.data) {
            // Use the helper function to safely access image URL
            const cardImageUrl = safelyAccessImageUrl(cachedData.data);
            
            if (cardImageUrl) {
              setImageSrc(cardImageUrl);
              console.log(`Using cached official image for card ${cardId}: ${cardImageUrl}`);
              setIsLoading(false);
              return;
            }
            
            // Fallback to the image_url field if available
            if (cachedData.image_url) {
              setImageSrc(cachedData.image_url);
              console.log(`Using cached image URL for card ${cardId}: ${cachedData.image_url}`);
              setIsLoading(false);
              return;
            }
          }
        }
        
        // If no cache hit, try to find a working image
        const workingUrl = await findWorkingImageUrl({ id: cardId, imageUrl, name: cardName });
        if (workingUrl) {
          setImageSrc(workingUrl);
          setIsLoading(false);
          return;
        }
        
        // If we couldn't find a working image directly, try the regular flow
        // Get all possible image URLs and try them sequentially
        const card = { id: cardId, imageUrl, name: cardName };
        const urls = getImageUrlsForCard(card);
        setImageUrls(urls);
        
        if (urls.length > 0) {
          setImageSrc(urls[0]);
          console.log(`Starting with image source: ${urls[0]} for card ${cardName} (${cardId || 'unknown'})`);
        } else {
          throw new Error('No image URLs available');
        }
      } catch (error) {
        console.error('Error loading card image:', error);
        setImageError(true);
        setIsLoading(false);
      }
    };
    
    loadCardImage();
  }, [cardId, imageUrl, cardName]);
  
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
    console.log(`Successfully loaded image: ${imageSrc} for card ${cardName}`);
    setIsLoading(false);
  };
  
  const retryImage = async () => {
    setIsLoading(true);
    setImageError(false);
    
    // Try to find a working image directly
    try {
      const workingUrl = await findWorkingImageUrl({ id: cardId, imageUrl, name: cardName });
      if (workingUrl) {
        setImageSrc(workingUrl);
        return;
      }
    } catch (error) {
      console.error('Error finding working image:', error);
    }
    
    // Fallback to the sequential approach
    const card = { id: cardId, imageUrl, name: cardName };
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
