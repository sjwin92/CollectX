
import React, { useState } from "react";
import { Link } from "react-router-dom";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Trophy, Calendar, Plus, ImageOff } from "lucide-react";
import { format } from "date-fns";
import { PokemonSet } from "@/services/api/pokemonTypes";
import AddToCollectionModal from "./AddToCollectionModal";
import { fixImageUrl } from "@/services/api/cardImageService";

interface SetCardProps {
  set: PokemonSet;
}

const SetCard = ({ set }: SetCardProps) => {
  const [showAddModal, setShowAddModal] = useState(false);
  const [logoLoaded, setLogoLoaded] = useState(true);
  const [symbolLoaded, setSymbolLoaded] = useState(true);

  const openAddModal = (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setShowAddModal(true);
  };

  // Fix image URLs
  const logoUrl = fixImageUrl(set.images?.logo, set.id, 'logo');
  const symbolUrl = fixImageUrl(set.images?.symbol, set.id, 'symbol');

  return (
    <>
      <Link to={`/pokemon-sets/${set.id}`}>
        <Card className="overflow-hidden h-full transition-all hover:shadow-lg hover:border-primary/50 relative group">
          <CardHeader className="space-y-4 pb-4">
            {logoUrl ? (
              <div className="h-12 flex items-center justify-center">
                <img 
                  src={logoUrl} 
                  alt={`${set.name} logo`}
                  className="max-h-12 object-contain mx-auto"
                  onError={() => setLogoLoaded(false)}
                  style={{ display: logoLoaded ? 'block' : 'none' }}
                />
                {!logoLoaded && (
                  <div className="flex flex-col items-center">
                    <h3 className="text-lg font-semibold text-center">{set.name}</h3>
                    <div className="flex items-center text-muted-foreground text-xs">
                      <ImageOff className="h-3 w-3 mr-1" />
                      <span>Logo unavailable</span>
                    </div>
                  </div>
                )}
              </div>
            ) : (
              <div className="flex items-center justify-center h-12">
                <h3 className="text-lg font-semibold text-center">{set.name}</h3>
              </div>
            )}
            
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-1.5">
                {symbolUrl ? (
                  <div className="h-6 w-6 flex items-center justify-center">
                    <img 
                      src={symbolUrl} 
                      alt={`${set.name} symbol`}
                      className="max-h-6 max-w-6 object-contain"
                      onError={() => setSymbolLoaded(false)}
                      style={{ display: symbolLoaded ? 'block' : 'none' }}
                    />
                    {!symbolLoaded && <ImageOff className="h-3 w-3 text-muted-foreground" />}
                  </div>
                ) : (
                  <ImageOff className="h-3 w-3 text-muted-foreground" />
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
                {set.legalities?.standard === 'Legal' && (
                  <Badge variant="default" className="text-xs">Standard</Badge>
                )}
                {set.legalities?.expanded === 'Legal' && (
                  <Badge variant="secondary" className="text-xs">Expanded</Badge>
                )}
              </div>
            </div>
          </CardContent>
          
          <div className="absolute top-2 right-2 opacity-0 group-hover:opacity-100 transition-opacity">
            <Button 
              variant="default" 
              size="sm" 
              className="h-8 w-8 p-0 rounded-full"
              onClick={openAddModal}
            >
              <Plus className="h-4 w-4" />
            </Button>
          </div>
        </Card>
      </Link>
      
      {showAddModal && (
        <AddToCollectionModal 
          set={set}
          open={showAddModal}
          onClose={() => setShowAddModal(false)}
          cardName={`Card from ${set.name}`}
          cardImage={symbolUrl || logoUrl}
          cardRarity="Common"
          cardNumber={`${set.id}-1`}
        />
      )}
    </>
  );
};

export default SetCard;
