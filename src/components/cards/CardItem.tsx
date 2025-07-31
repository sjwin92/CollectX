import React, { useState, useEffect } from "react";
import { Link } from "react-router-dom";
import GlassCard from "@/components/ui/custom/GlassCard";
import Badge from "@/components/ui/custom/Badge";
import OptimizedImage from "@/components/ui/OptimizedImage";
import { cn } from "@/lib/utils";
import { Info, AlertTriangle, Check, RefreshCw, BadgeCheck, Repeat, Star, BookHeart, CircleDollarSign } from "lucide-react";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import { Button } from "@/components/ui/button";
import { enhancedImageService } from "@/services/enhancedImageService";
import { useImagePerformance } from "@/hooks/useImagePerformance";

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
  graded?: boolean;
  gradingCompany?: string;
  gradeScore?: string;
  forTrade?: boolean;
  tradePreferences?: string;
  set?: {
    id?: string;
    name?: string;
  };
  number?: string;
  quantity?: number;
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
  showCondition = true,
  graded = false,
  gradingCompany,
  gradeScore,
  forTrade = false,
  tradePreferences,
  set,
  number,
  quantity = 1
}: CardItemProps) => {
  const [imageStatus, setImageStatus] = useState<"loading" | "loaded" | "error">("loading");
  const [imageSrc, setImageSrc] = useState<string>("");
  const { trackImageLoad } = useImagePerformance();
  
  // Determine priority based on position (first 6 cards are high priority)
  const priority = quantity > 1 || graded || forTrade ? 'high' : 'medium';
  
  useEffect(() => {
    let isCancelled = false;
    const startTime = performance.now();
    
    const loadImage = async () => {
      setImageStatus("loading");
      
      try {
        // Get image URL with minimal validation for faster loading
        const validImageUrl = await enhancedImageService.getCardImageUrl(id, imageUrl, priority);
        
        if (!isCancelled) {
          setImageSrc(validImageUrl);
          const loadTime = performance.now() - startTime;
          trackImageLoad(true, loadTime);
        }
      } catch (error) {
        console.warn(`Failed to get image for card ${id}:`, error);
        if (!isCancelled) {
          // Fallback to direct image URL without service
          const fallbackUrl = imageUrl || `https://images.pokemontcg.io/${id.replace('-', '/')}`;
          setImageSrc(fallbackUrl);
          const loadTime = performance.now() - startTime;
          trackImageLoad(false, loadTime);
        }
      }
    };
    
    loadImage();
    
    return () => {
      isCancelled = true;
    };
  }, [id, imageUrl, priority, trackImageLoad]);
  
  const handleImageLoad = () => {
    console.log(`Image loaded successfully: ${imageSrc}`);
    setImageStatus("loaded");
  };

  const handleImageError = () => {
    console.log(`Image failed to load: ${imageSrc}`);
    setImageStatus("error");
  };
  
  const retryImage = async (e?: React.MouseEvent) => {
    if (e) e.stopPropagation();
    setImageStatus("loading");
    
    try {
      // Try direct image URL on retry
      const directUrl = imageUrl || `https://images.pokemontcg.io/${id.replace('-', '/')}.png`;
      setImageSrc(directUrl);
    } catch (error) {
      setImageStatus("error");
    }
  };

  const formatCurrency = (value: string): string => {
    if (!value) return "£0";
    
    if (value.startsWith("£")) return value;
    
    if (value.includes("-")) {
      const parts = value.replace(/\$/g, '').split("-");
      return `£${parts[0].trim()}-£${parts[1].trim()}`;
    }
    
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
              <OptimizedImage
                src={imageSrc}
                alt={`Pokémon card: ${name} - ${condition} condition, ${rarity} rarity`}
                className={`w-full h-full object-cover transition-transform duration-500 group-hover:scale-110`}
                lazy={true}
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
          
          <div className="absolute top-2 right-2 flex gap-1 flex-col items-end">
            {quantity > 1 && (
              <Badge variant="secondary" size="sm" className="mb-1">
                <CircleDollarSign className="h-3 w-3 mr-1" />
                {quantity}x
              </Badge>
            )}
            
            {showCondition && (
              <Badge variant={conditionVariant()} size="sm">
                {condition}
              </Badge>
            )}
            
            {graded && (
              <Badge variant="success" size="sm" className="mt-1">
                <BadgeCheck className="h-3 w-3 mr-1" />
                {gradingCompany} {gradeScore}
              </Badge>
            )}
            
            {forTrade && (
              <Badge variant="secondary" size="sm" className="mt-1">
                <Repeat className="h-3 w-3 mr-1" />
                For Trade
              </Badge>
            )}
            
            <TooltipProvider>
              <Tooltip>
                <TooltipTrigger asChild>
                  <div className="bg-white/90 dark:bg-gray-800/90 rounded-full p-1 cursor-help mt-1">
                    <Info className="h-3 w-3 text-primary" />
                  </div>
                </TooltipTrigger>
                <TooltipContent side="top">
                  <div className="text-xs space-y-1">
                    <p><strong>Card:</strong> {name}</p>
                    <p><strong>Rarity:</strong> {rarity}</p>
                    {showCondition && <p><strong>Condition:</strong> {condition}</p>}
                    <p><strong>Value:</strong> {formatCurrency(estimatedValue)}</p>
                    {quantity > 1 && <p><strong>Quantity:</strong> {quantity}</p>}
                    {set?.name && <p><strong>Set:</strong> {set.name}</p>}
                    {number && <p><strong>Number:</strong> {number}</p>}
                    {graded && <p><strong>Graded:</strong> {gradingCompany} {gradeScore}</p>}
                    {forTrade && (
                      <p>
                        <strong>Trade For:</strong> {tradePreferences || "Open to offers"}
                      </p>
                    )}
                    <p><strong>ID:</strong> {id}</p>
                  </div>
                </TooltipContent>
              </Tooltip>
            </TooltipProvider>
          </div>
        </div>
      </div>
      
      <div className="space-y-2">
        <h3 className="font-medium text-sm line-clamp-2 leading-tight group-hover:text-primary transition-colors">
          {name}
        </h3>
        
        <div className="flex items-center justify-center">
          <Badge variant="outline" size="sm" className="shrink-0">
            {rarity}
          </Badge>
        </div>
        
        <div className="text-center">
          <span className="text-sm font-semibold text-white">{formatCurrency(estimatedValue)}</span>
        </div>
        
        {/* Compact info row - only show if we have additional details */}
        {(quantity > 1 || graded || forTrade) && (
          <div className="flex flex-wrap items-center gap-1 min-h-[20px]">
            {quantity > 1 && (
              <span className="text-xs bg-secondary/50 px-1.5 py-0.5 rounded shrink-0" title="Quantity">
                {quantity}x
              </span>
            )}
            
            {graded && (
              <span className="text-xs bg-green-100 dark:bg-green-900/40 text-green-800 dark:text-green-300 px-1.5 py-0.5 rounded flex items-center shrink-0" title="Graded">
                <BadgeCheck className="h-2.5 w-2.5 mr-0.5" />
                {gradeScore}
              </span>
            )}
            
            {forTrade && (
              <span className="text-xs bg-blue-100 dark:bg-blue-900/40 text-blue-800 dark:text-blue-300 px-1.5 py-0.5 rounded flex items-center shrink-0" title="For Trade">
                <Repeat className="h-2.5 w-2.5 mr-0.5" />
                Trade
              </span>
            )}
          </div>
        )}
        
        {/* Trade preferences - separate line to avoid overlap */}
        {forTrade && tradePreferences && (
          <div className="text-xs text-muted-foreground line-clamp-1 leading-tight">
            <span className="font-medium">Want:</span> {tradePreferences}
          </div>
        )}
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
      case "nm":
        return "success";
      case "excellent":
      case "good":
      case "lp":
      case "ex":
        return "info";
      case "played":
      case "mp":
        return "warning";
      case "poor":
      case "hp":
      case "dmg":
        return "danger";
      default:
        return "info";
    }
  }
  
  function getConditionTextColor(): string {
    switch (condition.toLowerCase()) {
      case "mint":
      case "near mint":
      case "nm":
        return "bg-green-100 dark:bg-green-900/40 text-green-800 dark:text-green-300";
      case "excellent":
      case "good":
      case "lp":
      case "ex":
        return "bg-blue-100 dark:bg-blue-900/40 text-blue-800 dark:text-blue-300";
      case "played":
      case "mp":
        return "bg-amber-100 dark:bg-amber-900/40 text-amber-800 dark:text-amber-300";
      case "poor":
      case "hp":
      case "dmg":
        return "bg-red-100 dark:bg-red-900/40 text-red-800 dark:text-red-300";
      default:
        return "bg-gray-100 dark:bg-gray-800 text-gray-800 dark:text-gray-300";
    }
  }

  useEffect(() => {
    let timeoutId: number | undefined;
    
    if (imageStatus === "loading") {
      timeoutId = window.setTimeout(() => {
        if (imageStatus === "loading") {
          console.log("Image loading timed out");
          setImageStatus("error");
        }
      }, 5000);
    }
    
    return () => {
      if (timeoutId) window.clearTimeout(timeoutId);
    };
  }, [imageStatus]);
};

export default CardItem;
