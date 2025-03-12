
import React from "react";
import { Link } from "react-router-dom";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Trophy, Calendar } from "lucide-react";
import { format } from "date-fns";
import { PokemonSet } from "@/services/pokemonSetsApi";

interface SetCardProps {
  set: PokemonSet;
}

const SetCard = ({ set }: SetCardProps) => {
  return (
    <Link to={`/pokemon-sets/${set.id}`}>
      <Card className="overflow-hidden h-full transition-all hover:shadow-lg hover:border-primary/50">
        <CardHeader className="space-y-4 pb-4">
          {set.images.logo ? (
            <img 
              src={set.images.logo} 
              alt={`${set.name} logo`}
              className="h-12 object-contain"
            />
          ) : (
            <h3 className="text-lg font-semibold">{set.name}</h3>
          )}
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-1.5">
              {set.images.symbol && (
                <img 
                  src={set.images.symbol} 
                  alt={`${set.name} symbol`}
                  className="h-6 w-6 object-contain"
                />
              )}
              <span className="text-sm font-medium">{set.series}</span>
            </div>
            <Badge variant="outline">
              <Trophy className="h-3 w-3 mr-1" />
              {set.printedTotal} cards
            </Badge>
          </div>
        </CardHeader>
        
        <CardContent className="pb-4">
          <div className="flex items-center justify-between text-sm text-muted-foreground">
            <div className="flex items-center gap-1">
              <Calendar className="h-4 w-4" />
              {format(new Date(set.releaseDate), 'MMM d, yyyy')}
            </div>
            <div className="flex gap-2">
              {set.legalities.standard === 'Legal' && (
                <Badge variant="default" className="text-xs">Standard</Badge>
              )}
              {set.legalities.expanded === 'Legal' && (
                <Badge variant="secondary" className="text-xs">Expanded</Badge>
              )}
            </div>
          </div>
        </CardContent>
      </Card>
    </Link>
  );
};

export default SetCard;
