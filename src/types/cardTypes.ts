
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
  set?: {
    id: string;
    name: string;
  };
  number: string;
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
}
