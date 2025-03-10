
// Define the TCGDexCard interface and export it
export interface TCGDexCard {
  id: string;
  name: string;
  image: string;
  rarity?: string;
  set?: {
    id: string;
    name: string;
  };
}

// Function to fetch a card by ID (using the set-number format like "base1-4")
export const fetchCardById = async (id: string): Promise<TCGDexCard | null> => {
  try {
    // Split the ID into set and number
    const [setId, number] = id.split('-');
    
    // Construct the API URL
    const apiUrl = `https://api.tcgdex.net/v2/en/cards/${setId}/${number}`;
    
    // Make the request
    const response = await fetch(apiUrl);
    
    if (!response.ok) {
      throw new Error(`Failed to fetch card: ${response.statusText}`);
    }
    
    const data = await response.json();
    
    // Map the response to our internal format
    return {
      id: `${data.set?.id}-${data.localId}`,
      name: data.name,
      image: data.image || `https://assets.tcgdex.net/en/${data.set?.id}/${data.localId}`,
      rarity: data.rarity,
      set: {
        id: data.set?.id,
        name: data.set?.name
      }
    };
  } catch (error) {
    console.error("Error fetching TCGDex card by ID:", error);
    return null;
  }
};

// Alias for fetchCardById to fix tradeService errors
export const getCardById = fetchCardById;

// Function to search for cards by name
export const fetchCardsByName = async (name: string): Promise<TCGDexCard[]> => {
  try {
    // Construct the API URL for search
    const apiUrl = `https://api.tcgdex.net/v2/en/search/${encodeURIComponent(name)}`;
    
    // Make the request
    const response = await fetch(apiUrl);
    
    if (!response.ok) {
      throw new Error(`Failed to search cards: ${response.statusText}`);
    }
    
    const data = await response.json();
    
    // Map the response to our internal format
    return data.map(card => ({
      id: `${card.set?.id}-${card.localId}`,
      name: card.name,
      image: card.image || `https://assets.tcgdex.net/en/${card.set?.id}/${card.localId}`,
      rarity: card.rarity,
      set: {
        id: card.set?.id,
        name: card.set?.name
      }
    }));
  } catch (error) {
    console.error("Error searching TCGDex cards:", error);
    return [];
  }
};

// Alias for fetchCardsByName to fix import errors
export const searchCards = fetchCardsByName;

// Function to fetch cards with pagination
export const getCards = async (page: number = 1, pageSize: number = 20): Promise<TCGDexCard[]> => {
  try {
    // TCGDex doesn't have a direct pagination API, so we'll use sets API as a workaround
    const setsResponse = await fetch(`https://api.tcgdex.net/v2/en/sets`);
    if (!setsResponse.ok) {
      throw new Error('Failed to fetch sets');
    }
    
    const sets = await setsResponse.json();
    // Get a random set to fetch cards from
    const randomSet = sets[Math.floor(Math.random() * sets.length)];
    
    const cardsResponse = await fetch(`https://api.tcgdex.net/v2/en/sets/${randomSet.id}/cards`);
    if (!cardsResponse.ok) {
      throw new Error('Failed to fetch cards');
    }
    
    const cards = await cardsResponse.json();
    
    // Calculate start and end indices for pagination
    const start = (page - 1) * pageSize;
    const end = start + pageSize;
    
    // Slice the cards array to get the requested page
    return cards.slice(start, end).map(card => ({
      id: `${card.set?.id}-${card.localId}`,
      name: card.name,
      image: card.image || `https://assets.tcgdex.net/en/${card.set?.id}/${card.localId}`,
      rarity: card.rarity,
      set: {
        id: card.set?.id,
        name: card.set?.name
      }
    }));
  } catch (error) {
    console.error("Error fetching TCGDex cards:", error);
    return [];
  }
};

// Helper function to create a card URL
export const createCardImageUrl = (setId: string, cardNumber: string): string => {
  return `https://assets.tcgdex.net/en/${setId}/${cardNumber}`;
};

// Define the TradeCard interface for use in tradeService
export interface TradeCard {
  id: string;
  name: string;
  imageUrl: string;
  condition: string;
  estimatedValue: number | string;
  currency?: string;
}

// Helper function to map a TCGDexCard to a TradeCard
export const mapToTradeCard = (card: TCGDexCard | null): TradeCard => {
  if (!card) {
    return {
      id: "unknown",
      name: "Unknown Card",
      imageUrl: "https://archives.bulbagarden.net/media/upload/1/17/Cardback.jpg",
      condition: "Unknown",
      estimatedValue: 0,
      currency: "USD"
    };
  }
  
  return {
    id: card.id,
    name: card.name,
    imageUrl: card.image,
    condition: "Near Mint", // Default condition
    estimatedValue: 0, // Default value
    currency: "USD"
  };
};
