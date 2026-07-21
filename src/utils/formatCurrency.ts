import type { Currency } from "@/models/trade";

export const formatCurrency = (amount: number, currency: Currency | string = "USD"): string =>
  new Intl.NumberFormat("en-US", {
    style: "currency",
    currency,
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(amount);
