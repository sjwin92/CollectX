
import { z } from "zod";

// Define card condition options
export const cardConditions = [
  { value: "M", label: "Mint (M)" },
  { value: "NM", label: "Near Mint (NM)" },
  { value: "LP", label: "Lightly Played (LP)" },
  { value: "MP", label: "Moderately Played (MP)" },
  { value: "HP", label: "Heavily Played (HP)" },
  { value: "D", label: "Damaged (D)" },
];

// Define grading companies
export const gradingCompanies = [
  { value: "PSA", label: "PSA (Professional Sports Authenticator)" },
  { value: "BGS", label: "BGS (Beckett Grading Services)" },
  { value: "CGC", label: "CGC (Certified Guaranty Company)" },
  { value: "SGC", label: "SGC (Sportscard Guaranty)" },
  { value: "GMA", label: "GMA (Global Authentication Inc.)" },
  { value: "AGS", label: "AGS (Ace Grading)" },
];

export const quickAddFormSchema = z.object({
  quantity: z.coerce.number().min(1, "Quantity must be at least 1").default(1),
  condition: z.string().min(1, "Please select a condition"),
  isGraded: z.boolean().default(false),
  gradingCompany: z.string().optional(),
  grade: z.coerce.number().min(1).max(10).optional(),
  tradePreferences: z.string().optional(),
  forTrade: z.boolean().default(false),
  forSale: z.boolean().default(false),
  productType: z.enum(['card', 'booster-pack', 'blister-pack', 'etb', 'tin', 'box', 'deck', 'other']).default('card'),
  isSealed: z.boolean().default(false),
  packCount: z.coerce.number().min(1).optional(),
  setCode: z.string().optional(),
});

export type QuickAddFormValues = z.infer<typeof quickAddFormSchema>;
