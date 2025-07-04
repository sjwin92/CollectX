
import React, { useEffect } from "react";
import { useToast } from "@/hooks/use-toast";
import { useNavigate } from "react-router-dom";
import { ExtendedCardItemProps } from "@/types/cardTypes";
import CardGrid from "@/components/cards/CardGrid";
import GlassCard from "@/components/ui/custom/GlassCard";
import CollectionHeader from "./CollectionHeader";
import CollectionSearch from "./CollectionSearch";
import EmptyCollection from "./EmptyCollection";
import NoSearchResults from "./NoSearchResults";
import CollectionStats from "./CollectionStats";
import { useCollection } from "@/hooks/useCollection";
import { debugCollections } from "@/services/collectionService";

interface CollectionManagerProps {
  collection?: ExtendedCardItemProps[];
}

const CollectionManager = ({ collection: propCollection }: CollectionManagerProps) => {
  const { toast } = useToast();
  const navigate = useNavigate();
  
  const {
    searchQuery,
    showGradedOnly,
    filteredCards,
    collection,
    handleSearchChange,
    handleGradedFilterChange,
    loadCollectionFromStorage
  } = useCollection(propCollection);

  // Debug: Log collection on mount
  useEffect(() => {
    console.log("CollectionManager mounted, current collection:", collection.length, "cards");
    debugCollections();
  }, []);

  const handleAddCard = () => {
    navigate("/pokemon-sets");
    toast({
      title: "Browse Sets",
      description: "Choose a set to find cards to add to your collection."
    });
  };

  const refreshCollection = () => {
    loadCollectionFromStorage();
    toast({
      title: "Collection Refreshed",
      description: "Your collection has been updated with the latest cards."
    });
  };

  return (
    <GlassCard className="p-6 mb-6">
      <CollectionHeader 
        onAddCard={handleAddCard} 
        onRefresh={refreshCollection} 
      />
      
      <CollectionSearch 
        searchQuery={searchQuery}
        showGradedOnly={showGradedOnly}
        onSearchChange={handleSearchChange}
        onGradedFilterChange={handleGradedFilterChange}
      />
      
      {filteredCards.length > 0 ? (
        <CardGrid 
          cards={filteredCards} 
          columns={{ sm: 1, md: 2, lg: 3 }} 
          animated
        />
      ) : (
        <NoSearchResults 
          searchQuery={searchQuery}
          showGradedOnly={showGradedOnly}
        />
      )}
      
      {collection.length === 0 && (
        <EmptyCollection onAddCard={handleAddCard} />
      )}
      
      {collection.length > 0 && (
        <div className="mt-6">
          <CollectionStats collection={collection} />
        </div>
      )}
    </GlassCard>
  );
};

export default CollectionManager;
