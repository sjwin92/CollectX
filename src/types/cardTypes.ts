
export interface CardItemProps {
  id: string;
  name: string;
  imageUrl: string;
  rarity: string;
  condition: string;
  estimatedValue: string;
  graded?: boolean;
  gradingCompany?: string;
  gradeScore?: string;
  forTrade?: boolean;
  forSale?: boolean;
  set?: {
    id: string;
    name: string;
  };
  number: string;
  productType?: 'card' | 'booster-pack' | 'blister-pack' | 'etb' | 'tin' | 'box' | 'deck' | 'other';
}

export interface UploadedCardImage {
  id: string;
  url: string;
  cardId: string;
  userId: string;
  uploadedAt: string;
}

export interface ExtendedCardItemProps extends CardItemProps {
  quantity?: number;
  conditionImages?: UploadedCardImage[];
  tradePreferences?: string;
  productType?: 'card' | 'booster-pack' | 'blister-pack' | 'etb' | 'tin' | 'box' | 'deck' | 'other';
  isSealed?: boolean;
  packCount?: number; // For blister packs, ETBs, etc.
  setCode?: string;
}

// Product type definitions
export const productTypes = [
  { value: 'card', label: 'Individual Card', icon: '🎴' },
  { value: 'booster-pack', label: 'Booster Pack', icon: '📦' },
  { value: 'blister-pack', label: 'Blister Pack', icon: '🎁' },
  { value: 'etb', label: 'Elite Trainer Box', icon: '📦' },
  { value: 'tin', label: 'Tin', icon: '🥫' },
  { value: 'box', label: 'Booster Box', icon: '📦' },
  { value: 'deck', label: 'Theme/Battle Deck', icon: '🎴' },
  { value: 'other', label: 'Other Product', icon: '❓' }
];

export const getProductTypeLabel = (type: string): string => {
  const productType = productTypes.find(p => p.value === type);
  return productType ? productType.label : 'Unknown Product';
};

export const getProductTypeIcon = (type: string): string => {
  const productType = productTypes.find(p => p.value === type);
  return productType ? productType.icon : '❓';
};
