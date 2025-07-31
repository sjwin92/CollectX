import React, { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import OptimizedImage from "@/components/ui/OptimizedImage";
import { Trophy, Calendar, Plus, ImageOff, Package } from "lucide-react";
import { format } from "date-fns";
import { PokemonSet } from "@/services/api/pokemonTypes";
import { supabasePokemonService } from "@/services/supabasePokemonService";
import AddToCollectionModal from "./AddToCollectionModal";
import { fixImageUrl } from "@/services/api/cardImageService";

interface SetCardProps {
  set: PokemonSet;
}

const SetCard = ({ set }: SetCardProps) => {
  const [showAddModal, setShowAddModal] = useState(false);
  const [logoError, setLogoError] = useState(false);
  const [symbolError, setSymbolError] = useState(false);
  const [logoFallbackIndex, setLogoFallbackIndex] = useState(0);
  const [symbolFallbackIndex, setSymbolFallbackIndex] = useState(0);
  const navigate = useNavigate();

  // Get stored images from our database
  const { data: storedImages } = useQuery({
    queryKey: ['setImages', set.id],
    queryFn: () => supabasePokemonService.getSetImages(set.id),
    staleTime: 30 * 60 * 1000, // Cache for 30 minutes
  });

  // Generate multiple fallback URLs specifically for Scarlet & Violet sets
  const getSVFallbackUrls = (setId: string, type: 'logo' | 'symbol') => {
    return [
      `https://assets.tcgdex.net/en/${setId}/${type}.png`,
      `https://limitlesstcg.s3.us-east-2.amazonaws.com/pokemon/gen9/${setId}/${type}.png`,
      `https://images.pokemontcg.io/swsh12/${type}.png`, // Known working fallback
      // Additional creative fallbacks
      `https://assets.tcgdex.net/en/sv1/${type}.png`, // Use base SV set
    ];
  };

  const openAddModal = (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setShowAddModal(true);
  };

  const handleViewProducts = (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    navigate(`/products?setId=${encodeURIComponent(set.id)}`);
  };

  const handleLogoError = () => {
    if (set.id.startsWith('sv')) {
      const fallbackUrls = getSVFallbackUrls(set.id, 'logo');
      if (logoFallbackIndex < fallbackUrls.length - 1) {
        setLogoFallbackIndex(prev => prev + 1);
        return;
      }
    }
    setLogoError(true);
  };

  const handleSymbolError = () => {
    if (set.id.startsWith('sv')) {
      const fallbackUrls = getSVFallbackUrls(set.id, 'symbol');
      if (symbolFallbackIndex < fallbackUrls.length - 1) {
        setSymbolFallbackIndex(prev => prev + 1);
        return;
      }
    }
    setSymbolError(true);
  };

  // Get current image URLs - prioritize stored images
  const getLogoUrl = () => {
    // First try stored images from our database
    if (storedImages?.logo) {
      return storedImages.logo;
    }
    
    // Fall back to original logic
    if (set.id.startsWith('sv')) {
      const fallbackUrls = getSVFallbackUrls(set.id, 'logo');
      return fallbackUrls[logoFallbackIndex];
    }
    return fixImageUrl(set.images?.logo, set.id, 'logo');
  };

  const getSymbolUrl = () => {
    // First try stored images from our database
    if (storedImages?.symbol) {
      return storedImages.symbol;
    }
    
    // Fall back to original logic
    if (set.id.startsWith('sv')) {
      const fallbackUrls = getSVFallbackUrls(set.id, 'symbol');
      return fallbackUrls[symbolFallbackIndex];
    }
    return fixImageUrl(set.images?.symbol, set.id, 'symbol');
  };

  const logoUrl = getLogoUrl();
  const symbolUrl = getSymbolUrl();

  return (
    <>
      <Link to={`/pokemon-sets/${set.id}`}>
        <Card className="overflow-hidden h-full transition-all hover:shadow-lg hover:border-primary/50 relative group">
          <CardHeader className="space-y-4 pb-4">
            <div className="h-12 flex items-center justify-center">
              {logoUrl && !logoError ? (
                <OptimizedImage 
                  src={logoUrl} 
                  alt={`${set.name} logo`}
                  className="max-h-12 object-contain mx-auto"
                  lazy={true}
                  fallbackSrc="/placeholder.svg"
                />
              ) : (
                <div className="flex flex-col items-center">
                  <h3 className="text-lg font-semibold text-center">{set.name}</h3>
                  <div className="flex items-center text-muted-foreground text-xs mt-1">
                    <ImageOff className="h-3 w-3 mr-1" />
                    <span>Logo unavailable</span>
                  </div>
                </div>
              )}
            </div>
            
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-1.5">
                <div className="h-6 w-6 flex items-center justify-center">
                  {symbolUrl && !symbolError ? (
                    <OptimizedImage 
                      src={symbolUrl} 
                      alt={`${set.name} symbol`}
                      className="max-h-6 max-w-6 object-contain"
                      lazy={true}
                      fallbackSrc="/placeholder.svg"
                    />
                  ) : (
                    <ImageOff className="h-4 w-4 text-muted-foreground" />
                  )}
                </div>
                <span className="text-sm font-medium">{set.series}</span>
              </div>
              <Badge variant="outline">
                <Trophy className="h-3 w-3 mr-1" />
                {set.printedTotal} cards
              </Badge>
            </div>
          </CardHeader>
          
          <CardContent className="pb-4">
            <div className="flex items-center justify-between text-sm text-muted-foreground mb-3">
              <div className="flex items-center gap-1">
                <Calendar className="h-4 w-4" />
                {set.releaseDate ? format(new Date(set.releaseDate), 'MMM d, yyyy') : 'Release date unknown'}
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

            <Button 
              variant="outline" 
              size="sm" 
              className="w-full"
              onClick={handleViewProducts}
            >
              <Package className="h-4 w-4 mr-2" />
              View Products
            </Button>
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