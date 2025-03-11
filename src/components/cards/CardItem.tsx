
import React, { useState, useEffect } from "react";
import { Link } from "react-router-dom";
import GlassCard from "@/components/ui/custom/GlassCard";
import Badge from "@/components/ui/custom/Badge";
import { cn } from "@/lib/utils";
import { Info, AlertTriangle, Check, Image, RefreshCw } from "lucide-react";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import { Button } from "@/components/ui/button";
import { getImageUrlsForCard, findWorkingImageUrl } from "@/services/cardImageService";

export interface CardItemProps {
  id: string;
  name: string;
  imageUrl: string;
  rarity: string;
  condition: string;
  estimatedValue: string;
  className?: string;
  animation?: "fade" | "scale" | "slide" | "none";
  onClick?: () => void;
}

const CardItem = ({
  id,
  name,
  imageUrl,
  rarity,
  condition,
  estimatedValue,
  className,
  animation = "none",
  onClick
}: CardItemProps) => {
  const [imageStatus, setImageStatus] = useState<"loading" | "loaded" | "error">("loading");
  const [currentImageIndex, setCurrentImageIndex] = useState(0);
  const [imageSources, setImageSources] = useState<string[]>([]);
  const [bestImageUrl, setBestImageUrl] = useState<string>(imageUrl);
  
  useEffect(() => {
    // Reset when card changes
    setImageStatus("loading");
    setCurrentImageIndex(0);
    
    // Get all possible image sources
    const card = { id, name, imageUrl };
    const sources = getImageUrlsForCard(card);
    setImageSources(sources);
    
    // Find best working image using our service
    const findBestImage = async () => {
      try {
        const url = await findWorkingImageUrl(card);
        setBestImageUrl(url);
        setImageStatus("loaded");
      } catch (error) {
        console.error(`Failed to find working image for ${name}:`, error);
        // We'll continue with our fallback logic if this fails
      }
    };
    
    findBestImage();
    
    console.log(`Generated ${sources.length} potential image URLs for card ${id}`);
  }, [id, imageUrl, name]);
  
  const currentImageSrc = bestImageUrl || imageSources[currentImageIndex] || '';
  
  // Map condition to style
  const conditionVariant = (): "success" | "warning" | "danger" | "info" => {
    switch (condition.toLowerCase()) {
      case "mint":
      case "near mint":
        return "success";
      case "excellent":
      case "good":
        return "info";
      case "played":
        return "warning";
      case "poor":
        return "danger";
      default:
        return "info";
    }
  };

  const handleImageLoad = () => {
    setImageStatus("loaded");
  };

  const handleImageError = () => {
    console.log(`Image failed to load: ${currentImageSrc}, current index: ${currentImageIndex}`);
    
    // If the best image URL failed, try the next one in our sequence
    if (currentImageSrc === bestImageUrl && imageSources.length > 0) {
      setBestImageUrl(''); // Clear the best URL so we use the fallback sequence
    }
    
    // Try the next image in the list
    if (currentImageIndex < imageSources.length - 1) {
      const nextIndex = currentImageIndex + 1;
      console.log(`Trying alternative image source #${nextIndex + 1}: ${imageSources[nextIndex]}`);
      setCurrentImageIndex(nextIndex);
    } else {
      setImageStatus("error");
      console.log("All image sources failed for card:", id);
    }
  };
  
  const retryImage = async () => {
    setImageStatus("loading");
    setCurrentImageIndex(0);
    
    try {
      const card = { id, name, imageUrl };
      const url = await findWorkingImageUrl(card);
      setBestImageUrl(url);
    } catch (error) {
      console.error("Error during retry:", error);
      setBestImageUrl('');
    }
  };

  const CardContent = (
    <GlassCard 
      className={cn("overflow-hidden group h-full", className)}
      animation={animation}
    >
      <div className="relative aspect-[2/3] overflow-hidden rounded-md mb-3">
        <div className="relative h-full">
          {currentImageSrc && imageStatus !== "error" && (
            <img
              src={currentImageSrc}
              alt={`Pokémon card: ${name} - ${condition} condition, ${rarity} rarity`}
              className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-110"
              loading="lazy"
              onLoad={handleImageLoad}
              onError={handleImageError}
            />
          )}
          
          {imageStatus === "loading" && (
            <div className="absolute inset-0 flex items-center justify-center bg-background/70">
              <div className="h-6 w-6 animate-spin rounded-full border-4 border-primary border-t-transparent"></div>
            </div>
          )}
          
          {imageStatus === "error" && (
            <div className="absolute inset-0 flex flex-col items-center justify-center bg-muted/80">
              <AlertTriangle className="h-6 w-6 text-amber-500 mb-1" />
              <span className="text-xs font-medium text-center">Image Failed to Load</span>
              <span className="text-xs text-muted-foreground text-center mt-1 mb-2">Card data still available</span>
              <Button size="sm" variant="outline" className="text-xs py-0 h-7" onClick={(e) => {
                e.stopPropagation(); // Prevent triggering card click
                retryImage();
              }}>
                <RefreshCw className="h-3 w-3 mr-1" /> Retry
              </Button>
            </div>
          )}
          
          <div className="absolute top-2 right-2 flex gap-1">
            <Badge variant={conditionVariant()} size="sm">
              {condition}
            </Badge>
            
            <TooltipProvider>
              <Tooltip>
                <TooltipTrigger asChild>
                  <div className="bg-white/90 dark:bg-gray-800/90 rounded-full p-1 cursor-help">
                    <Info className="h-3 w-3 text-primary" />
                  </div>
                </TooltipTrigger>
                <TooltipContent side="top">
                  <div className="text-xs space-y-1">
                    <p><strong>Card:</strong> {name}</p>
                    <p><strong>Rarity:</strong> {rarity}</p>
                    <p><strong>Condition:</strong> {condition}</p>
                    <p><strong>Value:</strong> {estimatedValue}</p>
                    <p><strong>ID:</strong> {id}</p>
                  </div>
                </TooltipContent>
              </Tooltip>
            </TooltipProvider>
          </div>
        </div>
      </div>
      
      <div className="space-y-1">
        <h3 className="font-medium text-sm line-clamp-1 group-hover:text-primary transition-colors">
          {name}
        </h3>
        
        <div className="flex items-center justify-between">
          <Badge variant="outline" size="sm">
            {rarity}
          </Badge>
          <span className="text-xs font-medium">{estimatedValue}</span>
        </div>
      </div>
    </GlassCard>
  );

  if (onClick) {
    return (
      <div className="cursor-pointer" onClick={onClick} role="button" aria-label={`Select ${name} card`}>
        {CardContent}
      </div>
    );
  }

  return (
    <Link to={`/card/${id}`} aria-label={`View details for ${name} card`}>
      {CardContent}
    </Link>
  );
};

export default CardItem;
