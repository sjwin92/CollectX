// Set ID mapping service to handle various set ID formats
const SET_ID_MAPPING: Record<string, string> = {
  // Scarlet & Violet series mappings
  'rsv10pt5': 'sv8pt5', // Crown Zenith subset
  'sv10pt5': 'sv8pt5',  // Alternative format
  'sv8pt5': 'sv8pt5',   // Crown Zenith
  'sv8': 'sv8',         // Fusion Strike
  'sv7': 'sv7',         // Lost Origin
  'sv6': 'sv6',         // Astral Radiance
  'sv5': 'sv5',         // Brilliant Stars
  'sv4': 'sv4',         // Darkness Ablaze
  'sv3': 'sv3',         // Rebel Clash
  'sv2': 'sv2',         // Sword & Shield
  'sv1': 'sv1',         // Base Set
  
  // Sword & Shield series
  'swsh12pt5': 'swsh12pt5', // Crown Zenith
  'swsh12': 'swsh12',       // Silver Tempest
  'swsh11': 'swsh11',       // Lost Origin
  'swsh10': 'swsh10',       // Astral Radiance
  'swsh9': 'swsh9',         // Brilliant Stars
  'swsh8': 'swsh8',         // Fusion Strike
  'swsh7': 'swsh7',         // Evolving Skies
  'swsh6': 'swsh6',         // Chilling Reign
  'swsh5': 'swsh5',         // Battle Styles
  'swsh4': 'swsh4',         // Vivid Voltage
  'swsh3': 'swsh3',         // Darkness Ablaze
  'swsh2': 'swsh2',         // Rebel Clash
  'swsh1': 'swsh1',         // Sword & Shield
  
  // Sun & Moon series
  'sm12': 'sm12',           // Cosmic Eclipse
  'sm11': 'sm11',           // Unified Minds
  'sm10': 'sm10',           // Unbroken Bonds
  'sm9': 'sm9',             // Team Up
  'sm8': 'sm8',             // Lost Thunder
  'sm7': 'sm7',             // Celestial Storm
  'sm6': 'sm6',             // Forbidden Light
  'sm5': 'sm5',             // Ultra Prism
  'sm4': 'sm4',             // Crimson Invasion
  'sm3': 'sm3',             // Burning Shadows
  'sm2': 'sm2',             // Guardians Rising
  'sm1': 'sm1',             // Sun & Moon
};

export const normalizeSetId = (setId: string): string => {
  if (!setId) return setId;
  
  const normalized = setId.toLowerCase().trim();
  
  // Check if we have a direct mapping
  if (SET_ID_MAPPING[normalized]) {
    console.log(`Mapped set ID "${setId}" to "${SET_ID_MAPPING[normalized]}"`);
    return SET_ID_MAPPING[normalized];
  }
  
  // Handle common variations
  if (normalized.startsWith('r')) {
    // Remove 'r' prefix (rsv10pt5 -> sv10pt5)
    const withoutR = normalized.substring(1);
    if (SET_ID_MAPPING[withoutR]) {
      console.log(`Mapped set ID "${setId}" to "${SET_ID_MAPPING[withoutR]}" (removed 'r' prefix)`);
      return SET_ID_MAPPING[withoutR];
    }
  }
  
  // Return original if no mapping found
  console.warn(`No mapping found for set ID "${setId}", using as-is`);
  return setId;
};

// Get popular/recent set IDs for suggestions
export const getPopularSetIds = (): Array<{id: string, name: string}> => {
  return [
    { id: 'sv8pt5', name: 'Crown Zenith' },
    { id: 'sv8', name: 'Fusion Strike' },
    { id: 'sv7', name: 'Lost Origin' },
    { id: 'sv6', name: 'Astral Radiance' },
    { id: 'sv5', name: 'Brilliant Stars' },
    { id: 'swsh12pt5', name: 'Crown Zenith' },
    { id: 'swsh12', name: 'Silver Tempest' },
    { id: 'swsh11', name: 'Lost Origin' },
    { id: 'swsh10', name: 'Astral Radiance' },
    { id: 'base1', name: 'Base Set' },
    { id: 'base2', name: 'Jungle' },
    { id: 'base3', name: 'Fossil' },
  ];
};