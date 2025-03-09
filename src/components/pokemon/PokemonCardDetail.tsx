
import React, { useState, useEffect } from "react";
import { PokemonCard, getValidImageUrl } from "@/services/pokemonTcgApi";
import GlassCard from "@/components/ui/custom/GlassCard";
import Badge from "@/components/ui/custom/Badge";
import { formatCurrency } from "@/utils/escrowCalculator";
import { Flame, Zap, Shield, TrendingUp, AlertTriangle, Check, Image, Info, RefreshCw } from "lucide-react";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import { Button } from "@/components/ui/button";

interface PokemonCardDetailProps {
  card: PokemonCard;
}

const PokemonCardDetail = ({ card }: PokemonCardDetailProps) => {
  const [imageStatus, setImageStatus] = useState<"loading" | "loaded" | "error">("loading");
  const [imageSrc, setImageSrc] = useState<string>("");
  const [retryCount, setRetryCount] = useState(0);
  
  // Image sources to try in sequence
  const imageSources = [
    card.images?.large,
    getValidImageUrl(card, true),
    `https://assets.pokellector.com/cards/${card.set?.id?.toLowerCase()}/${card.number?.padStart(3, '0')}.webp`,
    `https://assets.pokemon.com/assets/cms2/img/cards/web/${card.set?.id?.toUpperCase()}/${card.set?.id?.toUpperCase()}_EN_${card.number}.png`,
    `https://images.pokemoncards.com/${card.set?.id?.toLowerCase()}/${card.number}.jpg`,
    "https://archives.bulbagarden.net/media/upload/1/17/Cardback.jpg" // Final fallback
  ];
  
  useEffect(() => {
    // Reset image state when card changes
    setImageStatus("loading");
    setRetryCount(0);
    
    // Try the first image source
    setImageSrc(imageSources[0] || imageSources[1] || imageSources[5]);
  }, [card.id]);
  
  const getMarketPrice = () => {
    if (!card.tcgplayer?.prices) return null;
    
    // Try to get the price from various finishes
    const price = card.tcgplayer.prices.holofoil?.market 
      || card.tcgplayer.prices.normal?.market 
      || card.tcgplayer.prices.reverseHolofoil?.market;
      
    return price ? formatCurrency(price) : null;
  };
  
  const handleImageLoad = () => {
    setImageStatus("loaded");
    console.log("Card image loaded successfully:", imageSrc);
  };

  const handleImageError = () => {
    console.log("Image failed to load:", imageSrc);
    
    // Try the next image source if available
    const nextIndex = retryCount + 1;
    if (nextIndex < imageSources.length) {
      console.log("Trying next image source:", imageSources[nextIndex]);
      setRetryCount(nextIndex);
      setImageSrc(imageSources[nextIndex]);
    } else {
      setImageStatus("error");
      console.log("All image sources failed");
    }
  };
  
  const retryImage = () => {
    setImageStatus("loading");
    setRetryCount(0);
    setImageSrc(imageSources[0] || imageSources[1] || imageSources[5]);
  };
  
  return (
    <GlassCard className="overflow-hidden animate-float">
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <div className="relative aspect-[2/3] overflow-hidden rounded-lg">
          <div className="relative h-full">
            {imageSrc && (
              <img 
                src={imageSrc} 
                alt={`Detailed view of ${card.name} Pokémon card from set ${card.set.name}`}
                className="w-full h-full object-contain"
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
                <Button size="sm" variant="outline" onClick={retryImage}>
                  <RefreshCw className="h-4 w-4 mr-2" />
                  Retry Image
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
                  <p><strong>Image Source:</strong> {imageSrc ? new URL(imageSrc).hostname : "N/A"}</p>
                  <p><strong>Card Set:</strong> {card.set.name}</p>
                  <p><strong>Card Number:</strong> {card.number}</p>
                  <p><strong>Artist:</strong> {card.artist || "Unknown"}</p>
                </TooltipContent>
              </Tooltip>
            </TooltipProvider>
          </div>
        </div>
        
        <div className="space-y-4">
          <div>
            <div className="flex items-center justify-between">
              <h2 className="text-2xl font-bold">{card.name}</h2>
              {card.hp && (
                <Badge variant="outline" size="lg">HP {card.hp}</Badge>
              )}
            </div>
            <div className="flex items-center gap-2 mt-1">
              <Badge variant="secondary">{card.supertype}</Badge>
              {card.subtypes?.map(subtype => (
                <Badge key={subtype} variant="outline">{subtype}</Badge>
              ))}
            </div>
          </div>
          
          {card.types && (
            <div>
              <h3 className="text-sm font-medium text-muted-foreground mb-1">Types</h3>
              <div className="flex gap-2">
                {card.types.map(type => (
                  <Badge key={type} className="bg-primary/80">
                    <Flame className="h-3 w-3 mr-1" /> {type}
                  </Badge>
                ))}
              </div>
            </div>
          )}
          
          {card.attacks && card.attacks.length > 0 && (
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
                    {attack.text && (
                      <p className="text-sm text-muted-foreground mt-1">{attack.text}</p>
                    )}
                  </div>
                ))}
              </div>
            </div>
          )}
          
          <div className="grid grid-cols-2 gap-4">
            {card.weaknesses && (
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
            
            {card.resistances && (
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
                  <img 
                    src={card.set.images.symbol} 
                    alt={card.set.name} 
                    className="h-6 w-6 mr-2"
                    onError={(e) => {
                      (e.target as HTMLImageElement).style.display = 'none';
                    }}
                  />
                  <span>{card.set.name}</span>
                </div>
              </div>
              
              <div>
                <div className="text-sm text-muted-foreground">Rarity</div>
                <Badge variant="outline" className="mt-1">{card.rarity}</Badge>
              </div>
            </div>
          </div>
          
          {card.tcgplayer && (
            <div className="p-3 bg-secondary/30 rounded-md">
              <div className="flex items-center justify-between">
                <div className="flex items-center">
                  <TrendingUp className="h-4 w-4 mr-2 text-green-500" />
                  <span className="font-medium">Market Price</span>
                </div>
                <span className="text-lg font-bold">{getMarketPrice() || "N/A"}</span>
              </div>
              
              <a 
                href={card.tcgplayer.url} 
                target="_blank" 
                rel="noopener noreferrer"
                className="text-xs text-primary hover:underline mt-1 inline-block"
              >
                View on TCGPlayer
              </a>
            </div>
          )}
        </div>
      </div>
    </GlassCard>
  );
};

export default PokemonCardDetail;
