
import React from "react";
import { Card, CardContent, CardFooter } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Link } from "react-router-dom";
import { Calendar, Layers } from "lucide-react";
import { PokemonSet, formatReleaseDate } from "@/services/pokemonSetsApi";

interface PokemonSetCardProps {
  set: PokemonSet;
  onClick?: () => void;
}

const PokemonSetCard = ({ set, onClick }: PokemonSetCardProps) => {
  return (
    <Card 
      className="overflow-hidden transition-all hover:shadow-md cursor-pointer group"
      onClick={onClick}
    >
      <div className="h-28 bg-muted flex items-center justify-center overflow-hidden p-4">
        {set.images?.logo ? (
          <img 
            src={set.images.logo} 
            alt={`${set.name} logo`} 
            className="max-h-full max-w-full object-contain transition-transform duration-300 group-hover:scale-105"
            onError={(e) => {
              const target = e.target as HTMLImageElement;
              target.onerror = null;
              target.style.display = 'none';
            }}
          />
        ) : (
          <span className="text-lg font-bold text-center">{set.name}</span>
        )}
      </div>
      
      <CardContent className="p-4">
        <div className="flex items-start justify-between">
          <div>
            <h3 className="font-medium line-clamp-1">{set.name}</h3>
            <div className="text-sm text-muted-foreground mt-1 flex items-center gap-1">
              <Calendar className="h-3 w-3" /> 
              <span>{formatReleaseDate(set.releaseDate)}</span>
            </div>
          </div>
          
          {set.images?.symbol && (
            <img 
              src={set.images.symbol} 
              alt={`${set.name} symbol`} 
              className="h-6 w-6 object-contain"
              onError={(e) => {
                const target = e.target as HTMLImageElement;
                target.onerror = null;
                target.style.display = 'none';
              }}
            />
          )}
        </div>
      </CardContent>
      
      <CardFooter className="p-4 pt-0 flex justify-between">
        <Badge variant="outline" className="flex items-center gap-1">
          <Layers className="h-3 w-3" />
          {set.total} cards
        </Badge>
        
        <Button 
          size="sm" 
          variant="ghost" 
          className="text-xs" 
          asChild
          onClick={(e) => e.stopPropagation()}
        >
          <Link to={`/pokemon-cards?set=${set.id}`}>View Cards</Link>
        </Button>
      </CardFooter>
    </Card>
  );
};

export default PokemonSetCard;
