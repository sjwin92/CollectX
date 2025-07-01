
import { TradeCard } from "@/models/escrow";

// Mock pricing data - in a real app, this would come from a pricing API
const CARD_PRICING: Record<string, number> = {
  "charizard": 250.00,
  "pikachu": 45.00,
  "mewtwo": 180.00,
  "blastoise": 120.00,
  "venusaur": 95.00,
  "mew": 75.00,
  "lugia": 140.00,
  "ho-oh": 130.00,
  "rayquaza": 160.00,
  "dialga": 85.00,
};

const PRODUCT_PRICING: Record<string, number> = {
  "etb": 49.99,
  "booster-box": 143.99,
  "tin": 24.99,
  "blister-pack": 14.99,
  "deck": 19.99,
  "single-pack": 4.99,
};

// Estimate card value based on name, rarity, and condition
export const estimateCardValue = (card: TradeCard): number => {
  let basePrice = 0;
  
  // Try to find a base price from our mock data
  const cardName = card.name.toLowerCase();
  for (const [key, price] of Object.entries(CARD_PRICING)) {
    if (cardName.includes(key)) {
      basePrice = price;
      break;
    }
  }
  
  // If no match found, use a default based on assumed rarity
  if (basePrice === 0) {
    if (cardName.includes("vmax") || cardName.includes("gx")) {
      basePrice = 25.00;
    } else if (cardName.includes("v") || cardName.includes("ex")) {
      basePrice = 15.00;
    } else {
      basePrice = 2.00; // Common card
    }
  }
  
  // Adjust for condition
  const conditionMultiplier = getConditionMultiplier(card.condition);
  
  return Math.round(basePrice * conditionMultiplier * 100) / 100;
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

// Get condition multiplier for pricing
const getConditionMultiplier = (condition: string): number => {
  switch (condition.toLowerCase()) {
    case "mint":
    case "near mint":
      return 1.0;
    case "excellent":
    case "lightly played":
      return 0.8;
    case "good":
    case "moderately played":
      return 0.6;
    case "played":
      return 0.4;
    case "poor":
      return 0.2;
    default:
      return 0.8; // Default to lightly played
  }
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
