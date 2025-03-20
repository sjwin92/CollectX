
import { CardItemProps as BaseCardItemProps } from "@/components/cards/CardItem";

// Extend the CardItemProps type with grading info and quantity
export interface ExtendedCardItemProps extends BaseCardItemProps {
  graded?: boolean;
  gradingCompany?: string;
  grade?: string;
  gradeScore?: string;
  forTrade?: boolean;
  tradePreferences?: string;
  set?: {
    id?: string;
    name?: string;
  };
  number?: string;
  quantity?: number;
}
