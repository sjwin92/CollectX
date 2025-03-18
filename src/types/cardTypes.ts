
import { CardItemProps as BaseCardItemProps } from "@/components/cards/CardItem";

// Extend the CardItemProps type with grading info
export interface ExtendedCardItemProps extends BaseCardItemProps {
  graded?: boolean;
  gradingCompany?: string;
  grade?: string;
}
