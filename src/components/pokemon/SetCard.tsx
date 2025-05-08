
import React, { useState } from "react";
import { Link } from "react-router-dom";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Trophy, Calendar, Plus, ImageOff } from "lucide-react";
import { format } from "date-fns";
import { PokemonSet } from "@/services/api/pokemonTypes";
import AddToCollectionModal from "./AddToCollectionModal";

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

  // Improved URL fix function with direct overrides for problematic sets
  const getFixedImageUrl = (url: string | undefined, type: 'logo' | 'symbol'): string | undefined => {
    if (!url) {
      // If no URL is provided, generate one based on set ID
      return `https://images.pokemontcg.io/${set.id}/${type}.png`;
    }
    
    // Special case for sv10 (Glory of Team Rocket) - force correct URL
    if (set.id === 'sv10') {
      return `https://images.pokemontcg.io/${set.id}/${type}.png`;
    }
    
    // Check if URL is using tcgdex.net (which may have issues)
    if (url.includes('tcgdex.net')) {
      return `https://images.pokemontcg.io/${set.id}/${type}.png`;
    }
    
    // Fix URLs that don't include the correct domain
    if (!url.includes('://')) {
      return `https://images.pokemontcg.io/${url}`;
    }
    
    return url;
  };

  // Pre-process URLs for logo and symbol with better logging
  const logoUrl = getFixedImageUrl(set.images?.logo, 'logo');
  const symbolUrl = getFixedImageUrl(set.images?.symbol, 'symbol');

  // Debug for problematic sets
  if (set.id === 'sv10') {
    console.log(`SetCard: sv10 set image URLs - Logo URL = ${logoUrl}, Symbol URL = ${symbolUrl}`);
  }

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
                  onError={() => {
                    console.log(`Failed to load logo image for ${set.name} (${logoUrl})`);
                    setLogoLoaded(false);
                  }}
                  style={{ display: logoLoaded ? 'block' : 'none' }}
                />
                {!logoLoaded && (
                  <div className="flex flex-col items-center">
                    <h3 className="text-lg font-semibold text-center">{set.name}</h3>
                    <div className="flex items-center text-muted-foreground text-xs">
                      <ImageOff className="h-3 w-3 mr-1" />
                      <span>Image unavailable</span>
                    </div>
                  </div>
                )}
              </div>
            ) : (
              <div className="flex items-center justify-center">
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
                      onError={() => {
                        console.log(`Failed to load symbol image for ${set.name} (${symbolUrl})`);
                        setSymbolLoaded(false);
                      }}
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
          
          {/* Add to Collection Button - Visible on hover */}
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
          cardImage={getFixedImageUrl(set.images?.symbol || set.images?.logo, 'symbol')}
          cardRarity="Common"
          cardNumber={`${set.id}-1`}
        />
      )}
    </>
  );
};

export default SetCard;
