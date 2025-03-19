import React, { useState, useEffect } from "react";
import { Link } from "react-router-dom";
import GlassCard from "@/components/ui/custom/GlassCard";
import Badge from "@/components/ui/custom/Badge";
import { cn } from "@/lib/utils";
import { Info, AlertTriangle, Check, RefreshCw } from "lucide-react";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import { Button } from "@/components/ui/button";
import { getAllPossibleCardImageUrls, getConsistentCardImageUrl } from "@/services/api/cardImageService";

export interface CardItemProps {
  id: string;
  name: string;
  imageUrl?: string;
  rarity: string;
  condition: string;
  estimatedValue: string;
  className?: string;
  animation?: "fade" | "scale" | "slide" | "none";
  onClick?: () => void;
  showCondition?: boolean;
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
  onClick,
  showCondition = true
}: CardItemProps) => {
  const [imageStatus, setImageStatus] = useState<"loading" | "loaded" | "error">("loading");
  const [imageSrc, setImageSrc] = useState<string>("");
  const [retryCount, setRetryCount] = useState(0);
  const [alternativeImages, setAlternativeImages] = useState<string[]>([]);
  
  useEffect(() => {
    setImageStatus("loading");
    setRetryCount(0);
    
    // First try the direct imageUrl if provided
    let initialSource = imageUrl;
    
    // If no direct URL, get a reliable URL based on card ID
    if (!initialSource && id) {
      initialSource = getConsistentCardImageUrl(id);
    }
    
    // Set this as our primary image source
    setImageSrc(initialSource || "");
    
    // Get all possible alternative URLs as fallbacks
    const allPossibleImages = getAllPossibleCardImageUrls(id);
    
    // Create a unique list of image sources (remove duplicates)
    let uniqueSources = [initialSource, ...allPossibleImages].filter(Boolean);
    uniqueSources = [...new Set(uniqueSources)] as string[];
    
    console.log(`CardItem ${id}: Found ${uniqueSources.length} potential image sources`);
    setAlternativeImages(uniqueSources);
    
  }, [id, imageUrl]);
  
  const handleImageLoad = () => {
    console.log(`Image loaded successfully: ${imageSrc}`);
    setImageStatus("loaded");
  };

  const handleImageError = () => {
    console.log(`Image failed to load: ${imageSrc}, retry: ${retryCount}`);
    
    const nextIndex = retryCount + 1;
    
    if (nextIndex < alternativeImages.length) {
      console.log(`Trying alternative image source ${nextIndex}: ${alternativeImages[nextIndex]}`);
      // Switch to the next image source immediately
      setImageStatus("loading");
      setRetryCount(nextIndex);
      setImageSrc(alternativeImages[nextIndex]);
    } else {
      setImageStatus("error");
      console.log("All image sources failed for card:", id);
    }
  };
  
  const retryImage = (e?: React.MouseEvent) => {
    if (e) e.stopPropagation();
    setImageStatus("loading");
    setRetryCount(0);
    if (alternativeImages.length > 0) {
      setImageSrc(alternativeImages[0]);
    }
  };

  // Format currency to ensure consistent display in GBP
  const formatCurrency = (value: string): string => {
    if (!value) return "£0";
    
    // If already in GBP format, return as is
    if (value.startsWith("£")) return value;
    
    // If it's a range like "$100-$150" convert both values
    if (value.includes("-")) {
      const parts = value.replace(/\$/g, '').split("-");
      return `£${parts[0].trim()}-£${parts[1].trim()}`;
    }
    
    // If it's a plain number with $ or without currency
    return value.replace(/\$/, "£").replace(/^([0-9.]+)$/, "£$1");
  };

  const CardContent = (
    <GlassCard 
      className={cn("overflow-hidden group h-full", className)}
      animation={animation}
    >
      <div className="relative aspect-[2/3] overflow-hidden rounded-md mb-3">
        <div className="relative h-full">
          {imageSrc && (
            <>
              <img
                src={imageSrc}
                alt={`Pokémon card: ${name} - ${condition} condition, ${rarity} rarity`}
                className={`w-full h-full object-cover transition-transform duration-500 group-hover:scale-110 ${
                  imageStatus === "loading" ? "opacity-0" : "opacity-100"
                }`}
                onLoad={handleImageLoad}
                onError={handleImageError}
              />
              {imageStatus === "loading" && (
                <div className="absolute inset-0 flex items-center justify-center bg-muted">
                  <div className="h-8 w-8 animate-spin rounded-full border-4 border-primary border-t-transparent"></div>
                </div>
              )}
            </>
          )}
          
          {imageStatus === "error" && (
            <div className="absolute inset-0 flex flex-col items-center justify-center bg-muted/80">
              <AlertTriangle className="h-6 w-6 text-amber-500 mb-1" />
              <span className="text-xs font-medium text-center">Image Failed to Load</span>
              <span className="text-xs text-muted-foreground text-center mt-1 mb-2">Card data still available</span>
              <Button size="sm" variant="outline" className="text-xs py-0 h-7" onClick={(e) => {
                e.stopPropagation();
                retryImage();
              }}>
                <RefreshCw className="h-3 w-3 mr-1" /> Retry
              </Button>
            </div>
          )}
          
          <div className="absolute top-2 right-2 flex gap-1">
            {showCondition && (
              <Badge variant={conditionVariant()} size="sm">
                {condition}
              </Badge>
            )}
            
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
                    {showCondition && <p><strong>Condition:</strong> {condition}</p>}
                    <p><strong>Value:</strong> {formatCurrency(estimatedValue)}</p>
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
          <span className="text-xs font-medium">{formatCurrency(estimatedValue)}</span>
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

  function conditionVariant(): "success" | "warning" | "danger" | "info" {
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
  }

  // Fast retry logic to prevent infinite buffering
  useEffect(() => {
    // If we've been in loading state for more than 3 seconds, try the next source
    let timeoutId: number | undefined;
    
    if (imageStatus === "loading") {
      timeoutId = window.setTimeout(() => {
        if (imageStatus === "loading" && retryCount < alternativeImages.length - 1) {
          console.log("Image loading timed out, trying next source");
          handleImageError();
        }
      }, 3000);
    }
    
    return () => {
      if (timeoutId) window.clearTimeout(timeoutId);
    };
  }, [imageStatus, retryCount, alternativeImages.length]);
};

export default CardItem;
