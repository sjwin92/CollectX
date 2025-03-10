
interface TCGDexCard {
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

// Helper function to create a card URL
export const createCardImageUrl = (setId: string, cardNumber: string): string => {
  return `https://assets.tcgdex.net/en/${setId}/${cardNumber}`;
};
