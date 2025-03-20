
import { useState, useEffect } from "react";
import { ExtendedCardItemProps } from "@/types/cardTypes";
import { useLocation } from "react-router-dom";

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
  
  const loadCollectionFromStorage = () => {
    const savedCollection = localStorage.getItem('myCollection');
    if (savedCollection) {
      try {
        const parsedCollection = JSON.parse(savedCollection);
        console.log('Loaded collection from localStorage:', parsedCollection.length, 'cards');
        setCollection(parsedCollection);
      } catch (error) {
        console.error('Error parsing collection from localStorage:', error);
        setCollection([]);
      }
    } else {
      console.log('No collection found in localStorage');
      setCollection([]);
    }
  };
  
  const handleSearchChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const query = e.target.value.toLowerCase();
    setSearchQuery(query);
    console.log("Collection Manager - Searching for:", query);
  };
  
  const handleGradedFilterChange = (checked: boolean) => {
    setShowGradedOnly(checked);
  };
  
  const filterCards = (query: string, gradedOnly: boolean) => {
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
  };

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
