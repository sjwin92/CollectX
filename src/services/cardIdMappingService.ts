// Service for mapping between different card ID formats
// TCGDx uses format like "sv1-1", Pokemon TCG API uses format like "sv1-1"

export interface CardIdMapping {
  tcgdxId: string;
  pokemonTcgId: string;
  setId: string;
  number: string;
}

// Known mappings for cards currently used in the system
const KNOWN_ID_MAPPINGS: CardIdMapping[] = [
  // Charizard cards
  { tcgdxId: 'sm12-150', pokemonTcgId: 'sm12-150', setId: 'sm12', number: '150' },
  
  // Scarlet & Violet cards  
  { tcgdxId: 'sv1-1', pokemonTcgId: 'sv1-1', setId: 'sv1', number: '1' },
  
  // Sword & Shield cards
  { tcgdxId: 'swsh4-44', pokemonTcgId: 'swsh4-44', setId: 'swsh4', number: '44' },
  { tcgdxId: 'swsh35-22', pokemonTcgId: 'swsh35-22', setId: 'swsh35', number: '22' },
  
  // XY cards
  { tcgdxId: 'xy8-52', pokemonTcgId: 'xy8-52', setId: 'xy8', number: '52' },
  
  // Base set cards
  { tcgdxId: 'base2-2', pokemonTcgId: 'base2-2', setId: 'base2', number: '2' },
];

/**
 * Convert TCGDx ID format to Pokemon TCG API format
 */
export const convertTcgdxToPokemonTcg = (tcgdxId: string): string => {
  // Check known mappings first
  const mapping = KNOWN_ID_MAPPINGS.find(m => m.tcgdxId === tcgdxId);
  if (mapping) {
    return mapping.pokemonTcgId;
  }
  
  // For most cases, the formats are the same
  // TCGDx: "sv1-1" -> Pokemon TCG: "sv1-1"
  return tcgdxId;
};

/**
 * Convert Pokemon TCG API ID format to TCGDx format
 */
export const convertPokemonTcgToTcgdx = (pokemonTcgId: string): string => {
  // Check known mappings first
  const mapping = KNOWN_ID_MAPPINGS.find(m => m.pokemonTcgId === pokemonTcgId);
  if (mapping) {
    return mapping.tcgdxId;
  }
  
  // For most cases, the formats are the same
  return pokemonTcgId;
};

/**
 * Parse card ID to extract set and number
 */
export const parseCardId = (cardId: string): { setId: string; number: string } => {
  const parts = cardId.split('-');
  if (parts.length >= 2) {
    return {
      setId: parts[0],
      number: parts.slice(1).join('-') // Handle cases like "base1-1a"
    };
  }
  
  // Fallback for malformed IDs
  return {
    setId: cardId,
    number: '1'
  };
};

/**
 * Build card ID from set and number
 */
export const buildCardId = (setId: string, number: string): string => {
  return `${setId}-${number}`;
};

/**
 * Validate if a card ID format is valid
 */
export const isValidCardId = (cardId: string): boolean => {
  const pattern = /^[a-zA-Z0-9]+[-][a-zA-Z0-9]+$/;
  return pattern.test(cardId);
};

/**
 * Get all known card IDs (useful for testing/debugging)
 */
export const getKnownCardIds = (): { tcgdx: string[]; pokemonTcg: string[] } => {
  return {
    tcgdx: KNOWN_ID_MAPPINGS.map(m => m.tcgdxId),
    pokemonTcg: KNOWN_ID_MAPPINGS.map(m => m.pokemonTcgId)
  };
};