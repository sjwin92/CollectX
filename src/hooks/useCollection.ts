
import { useState, useEffect, useCallback } from "react";
import { ExtendedCardItemProps } from "@/types/cardTypes";
import { useLocation } from "react-router-dom";
import { 
  getCollection, 
  migrateLocalStorageToSupabase,
  ExtendedCardItemWithDB 
} from "@/services/supabaseCollectionService";
import { useUser } from "@/hooks/useUser";
import { supabase } from "@/integrations/supabase/client";

export const useCollection = (propCollection?: ExtendedCardItemProps[]) => {
  const [searchQuery, setSearchQuery] = useState("");
  const [showGradedOnly, setShowGradedOnly] = useState(false);
  const [filteredCards, setFilteredCards] = useState<ExtendedCardItemWithDB[]>([]);
  const [collection, setCollection] = useState<ExtendedCardItemWithDB[]>([]);
  const [loading, setLoading] = useState(true);
  const location = useLocation();
  const { user, isLoaded } = useUser();
  
  // Load collection data from Supabase
  const loadCollectionFromStorage = useCallback(async () => {
    if (!user || !isLoaded) {
      setCollection([]);
      setFilteredCards([]);
      setLoading(false);
      return;
    }

    try {
      setLoading(true);
      
      // First try to migrate any localStorage data
      await migrateLocalStorageToSupabase();
      
      // Then load from Supabase
      const cards = await getCollection();
      console.log('Loaded collection from Supabase:', cards.length, 'cards');
      
      setCollection(cards);
    } catch (error) {
      console.error('Error loading collection:', error);
      setCollection([]);
    } finally {
      setLoading(false);
    }
  }, [user, isLoaded]);

  // Set up real-time subscription
  useEffect(() => {
    if (!user) return;

    const channel = supabase
      .channel('user-cards-changes')
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'user_cards',
          filter: `user_id=eq.${user.id}`
        },
        () => {
          // Reload collection when data changes
          loadCollectionFromStorage();
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [user, loadCollectionFromStorage]);

  // Load collection when user or route changes
  useEffect(() => {
    if (propCollection) {
      setCollection(propCollection as ExtendedCardItemWithDB[]);
      setLoading(false);
    } else {
      loadCollectionFromStorage();
    }
  }, [propCollection, user, isLoaded, location.pathname, loadCollectionFromStorage]);

  // Apply filters when search query, filter settings, or collection changes
  useEffect(() => {
    filterCards(searchQuery, showGradedOnly);
  }, [searchQuery, showGradedOnly, collection]);
  
  const handleSearchChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const query = e.target.value.toLowerCase();
    setSearchQuery(query);
    console.log("Collection Manager - Searching for:", query);
  };
  
  const handleGradedFilterChange = (checked: boolean) => {
    setShowGradedOnly(checked);
  };
  
  const filterCards = useCallback((query: string, gradedOnly: boolean) => {
    if (!collection || !Array.isArray(collection)) {
      console.log("No cards to filter or invalid cards array");
      setFilteredCards([]);
      return;
    }
    
    console.log(`Filtering ${collection.length} cards with query: "${query}"`);
    let filtered = [...collection];
    
    if (query.trim() !== "") {
      filtered = filtered.filter(card => {
        if (!card) return false;
        
        const searchLower = query.toLowerCase();
        
        // Search in card name
        const nameMatch = card.name && card.name.toLowerCase().includes(searchLower);
        
        // Search in rarity
        const rarityMatch = card.rarity && card.rarity.toLowerCase().includes(searchLower);
        
        // Search in condition
        const conditionMatch = card.condition && card.condition.toLowerCase().includes(searchLower);
        
        // Search in set name
        const setMatch = card.set && card.set.name && card.set.name.toLowerCase().includes(searchLower);
        
        // Search in card number
        const numberMatch = card.number && card.number.toLowerCase().includes(searchLower);
        
        // Search in card ID
        const idMatch = card.id && card.id.toLowerCase().includes(searchLower);
        
        // Search in estimated value
        const valueMatch = card.estimatedValue && card.estimatedValue.toLowerCase().includes(searchLower);
        
        // Search in grading company
        const gradingMatch = card.gradingCompany && card.gradingCompany.toLowerCase().includes(searchLower);
        
        // Search in grade score
        const gradeMatch = card.gradeScore && card.gradeScore.toLowerCase().includes(searchLower);
        
        return nameMatch || rarityMatch || conditionMatch || setMatch || numberMatch || 
               idMatch || valueMatch || gradingMatch || gradeMatch;
      });
      
      console.log(`Found ${filtered.length} cards matching "${query}"`);
    }
    
    if (gradedOnly) {
      filtered = filtered.filter(card => card.graded === true);
      console.log(`Found ${filtered.length} graded cards`);
    }
    
    setFilteredCards(filtered);
  }, [collection]);

  return {
    searchQuery,
    showGradedOnly,
    filteredCards,
    collection,
    loading,
    handleSearchChange,
    handleGradedFilterChange,
    loadCollectionFromStorage
  };
};
