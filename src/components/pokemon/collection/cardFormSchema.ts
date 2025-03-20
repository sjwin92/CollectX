
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
  { value: "PSA", label: "PSA" },
  { value: "BGS", label: "BGS" },
  { value: "SGC", label: "SGC" },
];

export const cardFormSchema = z.object({
  quantity: z.coerce.number().min(1, "Quantity must be at least 1").default(1),
  condition: z.string().min(1, "Please select a condition"),
  isGraded: z.boolean().default(false),
  gradingCompany: z.string().optional(),
  grade: z.coerce.number().min(1).max(10).optional(),
  forTrade: z.boolean().default(false),
  tradePreferences: z.string().optional()
});

export type CardFormValues = z.infer<typeof cardFormSchema>;
