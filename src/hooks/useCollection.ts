
import { useState, useEffect, useCallback } from "react";
import { ExtendedCardItemProps } from "@/types/cardTypes";
import { useLocation } from "react-router-dom";
import { getCollection } from "@/services/collectionService";

export const useCollection = (propCollection?: ExtendedCardItemProps[]) => {
  const [searchQuery, setSearchQuery] = useState("");
  const [showGradedOnly, setShowGradedOnly] = useState(false);
  const [filteredCards, setFilteredCards] = useState<ExtendedCardItemProps[]>([]);
  const [collection, setCollection] = useState<ExtendedCardItemProps[]>([]);
  const location = useLocation();
  
  // Load collection data from props or localStorage
  useEffect(() => {
    if (propCollection) {
      setCollection(propCollection);
    } else {
      loadCollectionFromStorage();
    }
  }, [propCollection]);

  // Load collection when route changes
  useEffect(() => {
    loadCollectionFromStorage();
    console.log("CollectionManager - Loading collection on component mount or route change");
  }, [location.pathname]);

  // Apply filters when search query, filter settings, or collection changes
  useEffect(() => {
    filterCards(searchQuery, showGradedOnly);
  }, [searchQuery, showGradedOnly, collection]);
  
  const loadCollectionFromStorage = useCallback(() => {
    const loadedCollection = getCollection();
    console.log('Loaded collection from localStorage:', loadedCollection.length, 'cards');
    
    // Process the collection to combine duplicate cards and show quantity
    const processedCollection = processDuplicateCards(loadedCollection);
    setCollection(processedCollection);
  }, []);
  
  // Function to process duplicate cards and add quantity field
  const processDuplicateCards = (cards: ExtendedCardItemProps[]): ExtendedCardItemProps[] => {
    if (!cards || !Array.isArray(cards) || cards.length === 0) {
      return [];
    }
    
    const cardMap = new Map<string, ExtendedCardItemProps & { quantity: number }>();
    
    cards.forEach(card => {
      // Only combine exact duplicates (same condition, grading, etc.)
      const cardKey = getCardUniqueKey(card);
      
      if (cardMap.has(cardKey)) {
        // Increase quantity for duplicate
        const existingCard = cardMap.get(cardKey)!;
        existingCard.quantity = (existingCard.quantity || 1) + 1;
      } else {
        // Add new card with quantity 1
        cardMap.set(cardKey, { ...card, quantity: 1 });
      }
    });
    
    return Array.from(cardMap.values());
  };
  
  // Generate a unique key for a card based on all its properties
  const getCardUniqueKey = (card: ExtendedCardItemProps): string => {
    return `${card.id}-${card.condition}-${card.graded ? '1' : '0'}-${card.gradingCompany || ''}-${card.gradeScore || ''}-${card.forTrade ? '1' : '0'}`;
  };
  
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
        
        const nameMatch = card.name && card.name.toLowerCase().includes(query);
        const rarityMatch = card.rarity && card.rarity.toLowerCase().includes(query);
        const conditionMatch = card.condition && card.condition.toLowerCase().includes(query);
        const setMatch = card.set && card.set.name && card.set.name.toLowerCase().includes(query);
        const numberMatch = card.number && card.number.toLowerCase().includes(query);
        
        return nameMatch || rarityMatch || conditionMatch || setMatch || numberMatch;
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
    handleSearchChange,
    handleGradedFilterChange,
    loadCollectionFromStorage
  };
};
