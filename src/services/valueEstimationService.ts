
import { TradeCard } from "@/models/escrow";

// Grading company multipliers (how much more valuable a graded card is vs raw)
const GRADING_COMPANY_MULTIPLIERS: Record<string, number> = {
  "PSA": 1.0,      // PSA is the baseline
  "BGS": 0.95,     // BGS slightly less than PSA
  "CGC": 0.85,     // CGC growing but still less premium
  "SGC": 0.80,     // SGC solid but lower premium
  "GMA": 0.70,     // GMA less recognized
  "AGS": 0.65,     // AGS newer, lower premium
};

// Grade score multipliers (how much each grade increases value)
const GRADE_MULTIPLIERS: Record<number, number> = {
  10: 4.0,   // PSA 10 - Pristine, huge premium
  9: 2.5,    // PSA 9 - Mint, significant premium  
  8: 1.8,    // PSA 8 - Near Mint, good premium
  7: 1.4,    // PSA 7 - Good condition, moderate premium
  6: 1.1,    // PSA 6 - Fair condition, small premium
  5: 0.9,    // PSA 5 - Poor condition, often worth less than raw
  4: 0.7,    // PSA 4 - Very poor, significantly less
  3: 0.5,    // PSA 3 - Damaged, much less
  2: 0.3,    // PSA 2 - Heavily damaged
  1: 0.2,    // PSA 1 - Extremely damaged
};

// Rarity multipliers for graded cards (some rarities benefit more from grading)
const RARITY_GRADING_MULTIPLIERS: Record<string, number> = {
  "Special Illustration Rare": 1.5,
  "Rainbow Rare": 1.4,
  "Gold Rare": 1.3,
  "Ultra Rare": 1.2,
  "Secret Rare": 1.2,
  "Rare": 1.1,
  "Common": 0.8,  // Commons don't benefit much from grading
  "Uncommon": 0.9,
};

// Fallback GBP prices used only when the Pokemon TCG API returns no price data.
// These are rough market averages — the API's TCGPlayer prices take precedence.
const CARD_PRICING: Record<string, number> = {
  "charizard": 200.00,
  "pikachu": 35.00,
  "mewtwo": 145.00,
  "blastoise": 95.00,
  "venusaur": 75.00,
  "mew": 60.00,
  "lugia": 110.00,
  "ho-oh": 105.00,
  "rayquaza": 125.00,
  "dialga": 65.00,
  "umbreon": 80.00,
  "gengar": 55.00,
  "eevee": 30.00,
};

const PRODUCT_PRICING: Record<string, number> = {
  "etb": 49.99,
  "booster-box": 143.99,
  "tin": 24.99,
  "blister-pack": 14.99,
  "deck": 19.99,
  "single-pack": 4.99,
};

// Estimate card value based on name, rarity, condition, and grading.
// If the card already has a real price from the Pokemon TCG API, use that directly.
export const estimateCardValue = (card: TradeCard): number => {
  if (card.estimatedValue > 0) return card.estimatedValue;

  let basePrice = 0;

  // Fallback: look up by name keyword
  const cardName = card.name.toLowerCase();
  for (const [key, price] of Object.entries(CARD_PRICING)) {
    if (cardName.includes(key)) {
      basePrice = price;
      break;
    }
  }
  
  // If no name match, estimate by card mechanic in name
  if (basePrice === 0) {
    if (cardName.includes("vstar") || cardName.includes("vmax")) basePrice = 20.00;
    else if (cardName.includes(" ex") || cardName.includes("-ex") || cardName.includes("gx")) basePrice = 12.00;
    else if (cardName.includes(" v ") || cardName.endsWith(" v")) basePrice = 8.00;
    else basePrice = 1.50;
  }
  
  // Check if card is graded
  if (card.graded && card.gradingCompany && card.grade) {
    const gradeScore = parseFloat(card.grade);
    // Determine rarity from card name for grading premium
    const estimatedRarity = estimateRarityFromName(card.name);
    return estimateGradedCardValue(basePrice, card.gradingCompany, gradeScore, estimatedRarity);
  }
  
  // Adjust for condition (ungraded cards)
  const conditionMultiplier = getConditionMultiplier(card.condition);
  
  return Math.round(basePrice * conditionMultiplier * 100) / 100;
};

// Estimate rarity from card name for grading calculations
const estimateRarityFromName = (cardName: string): string => {
  const name = cardName.toLowerCase();
  if (name.includes("special illustration") || name.includes("sir")) return "Special Illustration Rare";
  if (name.includes("rainbow")) return "Rainbow Rare";
  if (name.includes("gold")) return "Gold Rare";
  if (name.includes("secret")) return "Secret Rare";
  if (name.includes("ultra rare") || name.includes("ur")) return "Ultra Rare";
  if (name.includes("rare") || name.includes("vmax") || name.includes("vstar") || name.includes("ex")) return "Rare";
  if (name.includes("uncommon")) return "Uncommon";
  return "Common";
};

// Estimate graded card value
export const estimateGradedCardValue = (
  basePrice: number,
  gradingCompany: string,
  gradeScore: number,
  rarity?: string
): number => {
  // Get company multiplier
  const companyMultiplier = GRADING_COMPANY_MULTIPLIERS[gradingCompany.toUpperCase()] || 0.8;
  
  // Get grade multiplier
  const gradeMultiplier = GRADE_MULTIPLIERS[Math.round(gradeScore)] || 1.0;
  
  // Get rarity multiplier for grading premium
  const rarityMultiplier = rarity ? (RARITY_GRADING_MULTIPLIERS[rarity] || 1.0) : 1.0;
  
  // Calculate final graded value
  const gradedValue = basePrice * companyMultiplier * gradeMultiplier * rarityMultiplier;
  
  return Math.round(gradedValue * 100) / 100;
};

// Estimate product value based on type
export const estimateProductValue = (productType: string, packCount?: number): number => {
  let basePrice = PRODUCT_PRICING[productType] || 10.00;
  
  // Adjust for pack count if applicable
  if (packCount && productType === "blister-pack") {
    if (packCount === 1) {
      basePrice = PRODUCT_PRICING["single-pack"] || 4.99;
    } else if (packCount === 3) {
      basePrice = PRODUCT_PRICING["blister-pack"] || 14.99;
    }
  }
  
  return basePrice;
};

// Get condition multiplier for pricing (ungraded cards only)
const getConditionMultiplier = (condition: string): number => {
  switch (condition.toLowerCase()) {
    case "mint":
    case "m":
    case "near mint":
    case "nm":
      return 1.0;
    case "excellent":
    case "lightly played":
    case "lp":
      return 0.8;
    case "good":
    case "moderately played":
    case "mp":
      return 0.6;
    case "played":
    case "hp":
      return 0.4;
    case "poor":
    case "d":
      return 0.2;
    default:
      return 0.8; // Default to lightly played
  }
};

// Get grading information for display
export const getGradingPremium = (
  basePrice: number,
  gradingCompany: string,
  gradeScore: number,
  rarity?: string
): {
  gradedValue: number;
  premium: number;
  premiumPercentage: number;
} => {
  const gradedValue = estimateGradedCardValue(basePrice, gradingCompany, gradeScore, rarity);
  const premium = gradedValue - basePrice;
  const premiumPercentage = Math.round((premium / basePrice) * 100);
  
  return {
    gradedValue,
    premium: Math.round(premium * 100) / 100,
    premiumPercentage
  };
};

// Calculate total trade value
export const calculateTradeValue = (items: TradeCard[]): number => {
  const total = items.reduce((sum, item) => {
    return sum + (item.estimatedValue || estimateCardValue(item));
  }, 0);
  
  return Math.round(total * 100) / 100;
};

// Calculate trade balance and determine if payment is needed
export const calculateTradeBalance = (myItems: TradeCard[], theirItems: TradeCard[]) => {
  const myValue = calculateTradeValue(myItems);
  const theirValue = calculateTradeValue(theirItems);
  const difference = myValue - theirValue;
  
  return {
    myValue,
    theirValue,
    difference: Math.round(difference * 100) / 100,
    needsPayment: Math.abs(difference) > 5.00, // Only require payment if difference > $5
    paymentAmount: Math.abs(difference),
    whoPays: difference > 0 ? "them" : "me"
  };
};
