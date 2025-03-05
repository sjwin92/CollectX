
import React from "react";
import { PokemonCard } from "@/services/pokemonTcgApi";
import GlassCard from "@/components/ui/custom/GlassCard";
import Badge from "@/components/ui/custom/Badge";
import { formatCurrency } from "@/utils/escrowCalculator";
import { Flame, Zap, Shield, TrendingUp } from "lucide-react";

interface PokemonCardDetailProps {
  card: PokemonCard;
}

const PokemonCardDetail = ({ card }: PokemonCardDetailProps) => {
  const getMarketPrice = () => {
    if (!card.tcgplayer?.prices) return null;
    
    // Try to get the price from various finishes
    const price = card.tcgplayer.prices.holofoil?.market 
      || card.tcgplayer.prices.normal?.market 
      || card.tcgplayer.prices.reverseHolofoil?.market;
      
    return price ? formatCurrency(price) : null;
  };
  
  return (
    <GlassCard className="overflow-hidden animate-float">
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <div className="relative aspect-[2/3] overflow-hidden rounded-lg">
          <img 
            src={card.images.large} 
            alt={card.name}
            className="w-full h-full object-contain"
          />
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
