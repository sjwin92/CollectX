import React, { useState, useEffect } from "react";
import { PokemonCard } from "@/services/pokemonTcgApi";
import GlassCard from "@/components/ui/custom/GlassCard";
import Badge from "@/components/ui/custom/Badge";
import { formatCurrency } from "@/utils/formatCurrency";
import { Flame, Zap, Shield, TrendingUp, AlertTriangle, Check, Info, RefreshCw } from "lucide-react";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import { Button } from "@/components/ui/button";
import { getAllPossibleImageUrlsFromCardObject } from "@/services/api/cardImageService";
import QuickAddToCollection from "./QuickAddToCollection";
import { SmartImage } from "@/components/common/SmartImage";

interface PokemonCardDetailProps {
  card: PokemonCard;
}

const PokemonCardDetail = ({ card }: PokemonCardDetailProps) => {
  const [imageStatus, setImageStatus] = useState<"loading" | "loaded" | "error">("loading");
  const [currentImageIndex, setCurrentImageIndex] = useState(0);
  const [imageUrls, setImageUrls] = useState<string[]>([]);

  useEffect(() => {
    if (!card) return;

    setImageStatus("loading");
    setCurrentImageIndex(0);

    // Get all possible image URLs for this card
    const urls = getAllPossibleImageUrlsFromCardObject(card);
    setImageUrls(urls);
    
    console.log(`Generated ${urls.length} potential image URLs for card ${card.id}`);
  }, [card?.id]);

  const currentImageUrl = imageUrls[currentImageIndex] || '';

  const getMarketPrice = () => {
    if (!card?.tcgplayer?.prices) return null;

    const price = card.tcgplayer.prices.holofoil?.market || 
                 card.tcgplayer.prices.normal?.market || 
                 card.tcgplayer.prices.reverseHolofoil?.market;
    return price ? formatCurrency(price) : null;
  };

  const handleImageLoad = () => {
    setImageStatus("loaded");
    console.log("Card image loaded successfully:", currentImageUrl);
  };

  const handleImageError = () => {
    console.log(`Image failed to load: ${currentImageUrl}`);

    if (currentImageIndex < imageUrls.length - 1) {
      const nextIndex = currentImageIndex + 1;
      setCurrentImageIndex(nextIndex);
      setImageStatus("loading");
      console.log(`Trying next image (${nextIndex + 1}/${imageUrls.length}): ${imageUrls[nextIndex]}`);
    } else {
      setImageStatus("error");
      console.log("All image sources failed");
    }
  };

  const retryImages = () => {
    setImageStatus("loading");
    setCurrentImageIndex(0);
  };

  return (
    <GlassCard className="overflow-hidden animate-float">
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <div className="relative aspect-[2/3] overflow-hidden rounded-lg">
          <div className="relative h-full">
            {currentImageUrl && (
              <SmartImage
                src={currentImageUrl}
                alt={`Detailed view of ${card?.name} Pokémon card from set ${card?.set?.name}`}
                className="w-full h-full object-contain"
                priority
                onLoad={handleImageLoad}
                onError={handleImageError}
              />
            )}
            
            {imageStatus === "loading" && (
              <div className="absolute inset-0 flex items-center justify-center bg-background/50">
                <div className="h-8 w-8 animate-spin rounded-full border-4 border-primary border-t-transparent"></div>
              </div>
            )}
            
            {imageStatus === "error" && (
              <div className="absolute inset-0 flex flex-col items-center justify-center bg-muted/90">
                <AlertTriangle className="h-10 w-10 text-amber-500 mb-2" />
                <p className="text-center px-4">Image could not be loaded</p>
                <p className="text-sm text-muted-foreground mt-1 mb-3">Card data is still available</p>
                <Button size="sm" variant="outline" onClick={retryImages}>
                  <RefreshCw className="h-4 w-4 mr-2" />
                  Retry Images
                </Button>
              </div>
            )}
            
            {imageStatus === "loaded" && (
              <div className="absolute top-2 right-2 bg-black/60 rounded-full p-1.5">
                <Check className="h-4 w-4 text-green-400" />
              </div>
            )}
            
            <TooltipProvider>
              <Tooltip>
                <TooltipTrigger asChild>
                  <div className="absolute bottom-2 right-2 bg-black/70 rounded-full p-1.5 cursor-help">
                    <Info className="h-4 w-4 text-white" />
                  </div>
                </TooltipTrigger>
                <TooltipContent side="left" className="max-w-[250px]">
                  <p><strong>Image Source:</strong> {currentImageUrl ? new URL(currentImageUrl).hostname : "N/A"}</p>
                  <p><strong>Card Set:</strong> {card?.set.name}</p>
                  <p><strong>Card Number:</strong> {card?.number}</p>
                  <p><strong>Artist:</strong> {card?.artist || "Unknown"}</p>
                  <p><strong>Source #:</strong> {currentImageIndex + 1} of {imageUrls.length}</p>
                </TooltipContent>
              </Tooltip>
            </TooltipProvider>
          </div>
        </div>
        
        <div className="space-y-4">
          <div>
            <div className="flex items-center justify-between">
              <h2 className="text-2xl font-bold">{card?.name}</h2>
              {card?.hp && <Badge variant="outline" size="lg">HP {card.hp}</Badge>}
            </div>
            <div className="flex items-center gap-2 mt-1">
              <Badge variant="secondary">{card?.supertype}</Badge>
              {card?.subtypes?.map(subtype => <Badge key={subtype} variant="outline">{subtype}</Badge>)}
            </div>
          </div>
          
          {card?.types && (
            <div>
              <h3 className="text-sm font-medium text-muted-foreground mb-1">Types</h3>
              <div className="flex gap-2">
                {card.types.map(type => (
                  <Badge key={type} className="bg-primary/80 text-slate-50">
                    <Flame className="h-3 w-3 mr-1" /> {type}
                  </Badge>
                ))}
              </div>
            </div>
          )}
          
          {card?.attacks && card.attacks.length > 0 && (
            <div>
              <h3 className="text-sm font-medium text-muted-foreground mb-1">Attacks</h3>
              <div className="space-y-2">
                {card.attacks.map(attack => (
                  <div key={attack.name} className="p-2 rounded-md bg-secondary/30">
                    <div className="flex items-center justify-between">
                      <div className="font-medium">{attack.name}</div>
                      {attack.damage && (
                        <div className="flex items-center">
                          <Zap className="h-3 w-3 mr-1 text-yellow-500" />
                          <span className="text-sm">{attack.damage}</span>
                        </div>
                      )}
                    </div>
                    {attack.text && <p className="text-sm text-muted-foreground mt-1">{attack.text}</p>}
                  </div>
                ))}
              </div>
            </div>
          )}
          
          <div className="grid grid-cols-2 gap-4">
            {card?.weaknesses && (
              <div>
                <h3 className="text-sm font-medium text-muted-foreground mb-1">Weaknesses</h3>
                <div className="flex gap-1 flex-wrap">
                  {card.weaknesses.map(weakness => (
                    <Badge key={weakness.type} variant="destructive">
                      {weakness.type} {weakness.value}
                    </Badge>
                  ))}
                </div>
              </div>
            )}
            
            {card?.resistances && (
              <div>
                <h3 className="text-sm font-medium text-muted-foreground mb-1">Resistances</h3>
                <div className="flex gap-1 flex-wrap">
                  {card.resistances.map(resistance => (
                    <Badge key={resistance.type} variant="success">
                      <Shield className="h-3 w-3 mr-1" /> {resistance.type} {resistance.value}
                    </Badge>
                  ))}
                </div>
              </div>
            )}
          </div>
          
          <div className="pt-4 border-t border-border">
            <div className="flex items-center justify-between">
              <div>
                <div className="text-sm text-muted-foreground">Set</div>
                <div className="flex items-center mt-1">
                  {card?.set.images.symbol && (
                    <SmartImage
                      src={card.set.images.symbol}
                      alt={card.set.name}
                      className="h-6 w-6 mr-2"
                      wrapperClassName="h-6 w-6 mr-2"
                      fallback={null}
                    />
                  )}
                  <span>{card?.set.name}</span>
                </div>
              </div>
              
              <div>
                <div className="text-sm text-muted-foreground">Rarity</div>
                <Badge variant="outline" className="mt-1">{card?.rarity}</Badge>
              </div>
            </div>
          </div>
          
           {card?.tcgplayer && (
             <div className="p-3 bg-secondary/30 rounded-md">
               <div className="flex items-center justify-between">
                 <div className="flex items-center">
                   <TrendingUp className="h-4 w-4 mr-2 text-green-500" />
                   <span className="font-medium">Market Price</span>
                 </div>
                 <span className="text-lg font-bold">{getMarketPrice() || "N/A"}</span>
               </div>
               
               <a href={card.tcgplayer.url} target="_blank" rel="noopener noreferrer" className="text-xs text-primary hover:underline mt-1 inline-block">
                 View on TCGPlayer
               </a>
             </div>
           )}
           
           <div className="pt-4">
             <QuickAddToCollection card={card} />
           </div>
         </div>
       </div>
     </GlassCard>
  );
};

export default PokemonCardDetail;
