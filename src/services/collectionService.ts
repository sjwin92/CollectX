
import { ExtendedCardItemProps } from "@/types/cardTypes";
import { queryClient } from "@/lib/react-query";
import { useToast } from "@/hooks/use-toast";

export const addCardToCollection = (newCard: ExtendedCardItemProps): void => {
  // Get existing collection from localStorage
  const savedCollection = localStorage.getItem('myCollection');
  let collection: ExtendedCardItemProps[] = [];
  
  if (savedCollection) {
    try {
      collection = JSON.parse(savedCollection);
    } catch (error) {
      console.error("Error parsing collection", error);
      collection = [];
    }
  }
  
  // Add new card to collection
  collection.push(newCard);
  
  // Save back to localStorage
  localStorage.setItem('myCollection', JSON.stringify(collection));
  console.log("Added card to collection:", newCard);
  
  // Invalidate collection data to refresh UI
  queryClient.invalidateQueries({ queryKey: ['collection'] });
};

export const addCardToTradable = (card: ExtendedCardItemProps): void => {
  if (!card.forTrade) return;
  
  const savedTradable = localStorage.getItem('tradableCards');
  let tradable: ExtendedCardItemProps[] = [];
  
  if (savedTradable) {
    try {
      tradable = JSON.parse(savedTradable);
    } catch (error) {
      console.error("Error parsing tradable cards", error);
      tradable = [];
    }
  }
  
  tradable.push(card);
  localStorage.setItem('tradableCards', JSON.stringify(tradable));
  console.log("Added card to tradable cards:", card);
  
  // Invalidate tradable cards data to refresh UI
  queryClient.invalidateQueries({ queryKey: ['tradableCards'] });
};

export const getCollection = (): ExtendedCardItemProps[] => {
  const savedCollection = localStorage.getItem('myCollection');
  if (!savedCollection) return [];
  
  try {
    return JSON.parse(savedCollection);
  } catch (error) {
    console.error("Error parsing collection", error);
    return [];
  }
};

export const getTradableCards = (): ExtendedCardItemProps[] => {
  const savedTradable = localStorage.getItem('tradableCards');
  if (!savedTradable) return [];
  
  try {
    return JSON.parse(savedTradable);
  } catch (error) {
    console.error("Error parsing tradable cards", error);
    return [];
  }
};
