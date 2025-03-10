
// Define the TCGDexCard interface and export it
export interface TCGDexCard {
  id: string;
  name: string;
  image: string;
  hp?: string;
  types?: string[];
  rarity?: string;
  localId?: string;
  illustrator?: string;
  legal?: {
    standard: boolean;
    expanded: boolean;
    unlimited: boolean;
  };
  variants?: {
    normal: string;
    reverse?: string;
    holo?: string;
  };
  set: {
    id: string;
    name: string;
    printedTotal?: number;
    total?: number;
    releaseDate?: string;
    symbol?: string;
    logo?: string;
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
      console.error(`Failed to fetch card: ${response.statusText} for ID ${id}`);
      throw new Error(`Failed to fetch card: ${response.statusText}`);
    }
    
    const data = await response.json();
    
    // Map the response to our internal format
    return {
      id: `${data.set?.id}-${data.localId}`,
      name: data.name,
      image: data.image || createCardImageUrl(data.set?.id, data.localId),
      hp: data.hp,
      types: data.types,
      rarity: data.rarity,
      localId: data.localId,
      illustrator: data.illustrator,
      legal: data.legal,
      variants: data.variants || {
        normal: createCardImageUrl(data.set?.id, data.localId)
      },
      set: {
        id: data.set?.id,
        name: data.set?.name,
        printedTotal: data.set?.printedTotal,
        total: data.set?.total,
        releaseDate: data.set?.releaseDate,
        symbol: data.set?.symbol,
        logo: data.set?.logo
      }
    };
  } catch (error) {
    console.error("Error fetching TCGDex card by ID:", error);
    return null;
  }
};

// Export getCardById as a direct alias of fetchCardById
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
    return data.map((card: any) => ({
      id: `${card.set?.id}-${card.localId}`,
      name: card.name,
      image: card.image || createCardImageUrl(card.set?.id, card.localId),
      hp: card.hp,
      types: card.types,
      rarity: card.rarity,
      localId: card.localId,
      illustrator: card.illustrator,
      legal: card.legal,
      variants: card.variants || {
        normal: createCardImageUrl(card.set?.id, card.localId)
      },
      set: {
        id: card.set?.id,
        name: card.set?.name,
        printedTotal: card.set?.printedTotal,
        total: card.set?.total,
        releaseDate: card.set?.releaseDate,
        symbol: card.set?.symbol,
        logo: card.set?.logo
      }
    }));
  } catch (error) {
    console.error("Error searching TCGDex cards:", error);
    return [];
  }
};

// Export searchCards function for use in components
export const searchCards = async (name: string): Promise<TCGDexCard[]> => {
  try {
    const apiUrl = `https://api.tcgdex.net/v2/en/search/${encodeURIComponent(name)}`;
    const response = await fetch(apiUrl);
    
    if (!response.ok) {
      throw new Error(`Failed to search cards: ${response.statusText}`);
    }
    
    const data = await response.json();
    
    return data.map((card: any) => ({
      id: `${card.set?.id}-${card.localId}`,
      name: card.name,
      image: card.image || createCardImageUrl(card.set?.id, card.localId),
      hp: card.hp,
      types: card.types,
      rarity: card.rarity,
      localId: card.localId,
      illustrator: card.illustrator,
      legal: card.legal,
      variants: {
        normal: card.image || createCardImageUrl(card.set?.id, card.localId)
      },
      set: {
        id: card.set?.id,
        name: card.set?.name,
        printedTotal: card.set?.printedTotal,
        total: card.set?.total,
        releaseDate: card.set?.releaseDate,
        symbol: card.set?.symbol,
        logo: card.set?.logo
      }
    }));
  } catch (error) {
    console.error("Error searching TCGDex cards:", error);
    return [];
  }
};

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
    return cards.slice(start, end).map((card: any) => ({
      id: `${card.set?.id}-${card.localId}`,
      name: card.name,
      image: card.image || createCardImageUrl(card.set?.id, card.localId),
      hp: card.hp,
      types: card.types,
      rarity: card.rarity,
      localId: card.localId,
      illustrator: card.illustrator,
      legal: card.legal,
      variants: card.variants || {
        normal: createCardImageUrl(card.set?.id, card.localId)
      },
      set: {
        id: card.set?.id,
        name: card.set?.name,
        printedTotal: card.set?.printedTotal,
        total: card.set?.total,
        releaseDate: card.set?.releaseDate,
        symbol: card.set?.symbol,
        logo: card.set?.logo
      }
    }));
  } catch (error) {
    console.error("Error fetching TCGDex cards:", error);
    return [];
  }
};

// Helper function to create a card URL
export const createCardImageUrl = (setId: string, cardNumber: string): string => {
  if (!setId || !cardNumber) {
    return "https://archives.bulbagarden.net/media/upload/1/17/Cardback.jpg";
  }
  
  // First try TCGDex format
  const tcgdexUrl = `https://assets.tcgdex.net/en/${setId}/${cardNumber}`;
  
  // Alternative image sources that can be tried by components
  return tcgdexUrl;
};

// Define the TradeCard interface for use in tradeService
export interface TradeCard {
  id: string;
  name: string;
  imageUrl: string;
  condition: string;
  estimatedValue: number;  // Changed from number | string to number
  currency?: string;
}

// Helper function to map a TCGDexCard to a TradeCard
export const mapToTradeCard = (card: TCGDexCard | null): import("@/models/escrow").TradeCard => {
  if (!card) {
    // Return a fallback card if input is null
    return {
      id: "fallback-1",
      name: "Placeholder Card",
      imageUrl: "https://archives.bulbagarden.net/media/upload/1/17/Cardback.jpg",
      condition: "Near Mint",
      estimatedValue: 0,
      currency: "USD"
    };
  }
  
  return {
    id: card.id,
    name: card.name,
    imageUrl: card.image,
    condition: "Near Mint",
    estimatedValue: 0, // Fixed to always be a number
    currency: "USD"
  };
};
