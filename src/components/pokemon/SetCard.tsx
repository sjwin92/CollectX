
import React, { useState } from "react";
import { Link } from "react-router-dom";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Trophy, Calendar, Plus } from "lucide-react";
import { format } from "date-fns";
import { PokemonSet } from "@/services/pokemonSetsApi";
import AddToCollectionModal from "./AddToCollectionModal";

interface SetCardProps {
  set: PokemonSet;
}

const SetCard = ({ set }: SetCardProps) => {
  const [showAddModal, setShowAddModal] = useState(false);

  const openAddModal = (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setShowAddModal(true);
  };

  return (
    <>
      <Link to={`/pokemon-sets/${set.id}`}>
        <Card className="overflow-hidden h-full transition-all hover:shadow-lg hover:border-primary/50 relative group">
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
        />
      )}
    </>
  );
};

export default SetCard;
