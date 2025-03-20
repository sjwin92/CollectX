
import { ExtendedCardItemProps } from "@/types/cardTypes";
import { queryClient } from "@/lib/react-query";

// Helper function to check if a card already exists in a collection
const cardExistsInCollection = (collection: ExtendedCardItemProps[], cardId: string): boolean => {
  return collection.some(card => card.id === cardId);
};

// Helper function to safely parse collection data from localStorage
const safelyParseCollection = (key: string): ExtendedCardItemProps[] => {
  const savedData = localStorage.getItem(key);
  if (!savedData) return [];
  
  try {
    return JSON.parse(savedData);
  } catch (error) {
    console.error(`Error parsing ${key} from localStorage:`, error);
    return [];
  }
};

// Helper function to notify collection changes
const notifyCollectionChange = () => {
  // Dispatch a storage event to notify components of collection changes
  window.dispatchEvent(new Event('storage'));
};

export const addCardToCollection = (newCard: ExtendedCardItemProps): void => {
  // Get existing collection from localStorage
  let collection = safelyParseCollection('myCollection');
  
  // Check if the card exists first
  const existingCardIndex = collection.findIndex(card => {
    // Generate a unique key based on card properties
    const cardKey = getCardUniqueKey(card);
    const newCardKey = getCardUniqueKey(newCard);
    return cardKey === newCardKey;
  });

  if (existingCardIndex >= 0) {
    // If card already exists with same properties, update quantity
    const existingCard = collection[existingCardIndex];
    existingCard.quantity = (existingCard.quantity || 1) + (newCard.quantity || 1);
    collection[existingCardIndex] = existingCard;
    console.log("Updated card quantity in collection:", existingCard);
  } else {
    // Add new card to collection
    // Make sure quantity is set
    if (!newCard.quantity) {
      newCard.quantity = 1;
    }
    console.log("Adding to collection:", newCard);
    collection.push(newCard);
  }
  
  // Save back to localStorage
  localStorage.setItem('myCollection', JSON.stringify(collection));
  console.log("Added card to collection:", newCard);
  
  // Invalidate collection data to refresh UI
  queryClient.invalidateQueries({ queryKey: ['collection'] });
  
  // Notify collection change
  notifyCollectionChange();
  
  // If card is for trade, also add to tradable cards
  if (newCard.forTrade) {
    addCardToTradable(newCard);
  }
};

// Generate a unique key for a card based on all its properties
export const getCardUniqueKey = (card: ExtendedCardItemProps): string => {
  return `${card.id}-${card.condition || ''}-${card.graded ? '1' : '0'}-${card.gradingCompany || ''}-${card.gradeScore || ''}-${card.forTrade ? '1' : '0'}`;
};

export const addCardToTradable = (card: ExtendedCardItemProps): void => {
  if (!card.forTrade) return;
  
  let tradable = safelyParseCollection('tradableCards');
  
  // If card already exists, don't add it again
  if (cardExistsInCollection(tradable, card.id)) {
    console.log("Card already exists in tradable cards, not adding duplicate:", card.id);
    return;
  }
  
  tradable.push(card);
  localStorage.setItem('tradableCards', JSON.stringify(tradable));
  console.log("Added card to tradable cards:", card);
  
  // Invalidate tradable cards data to refresh UI
  queryClient.invalidateQueries({ queryKey: ['tradableCards'] });
  
  // Notify collection change
  notifyCollectionChange();
};

export const getCollection = (): ExtendedCardItemProps[] => {
  return safelyParseCollection('myCollection');
};

export const getTradableCards = (): ExtendedCardItemProps[] => {
  return safelyParseCollection('tradableCards');
};

// Function to check if a specific card is in the collection
export const isCardInCollection = (cardId: string): boolean => {
  const collection = getCollection();
  return cardExistsInCollection(collection, cardId);
};

// Debug function to inspect the current state of collections
export const debugCollections = (): { collection: ExtendedCardItemProps[], tradable: ExtendedCardItemProps[] } => {
  const collection = getCollection();
  const tradable = getTradableCards();
  
  console.log("DEBUG - Collection:", collection);
  console.log("DEBUG - Tradable:", tradable);
  
  return { collection, tradable };
};

// Clear all collections (for testing)
export const clearCollections = (): void => {
  localStorage.removeItem('myCollection');
  localStorage.removeItem('tradableCards');
  localStorage.removeItem('wishlistCards');
  
  // Invalidate queries to refresh UI
  queryClient.invalidateQueries({ queryKey: ['collection'] });
  queryClient.invalidateQueries({ queryKey: ['tradableCards'] });
  
  // Notify collection change
  notifyCollectionChange();
  
  console.log("All collections cleared from localStorage");
};
