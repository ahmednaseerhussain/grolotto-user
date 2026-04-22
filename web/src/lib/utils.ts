import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

export function formatCurrency(amount: number, currency: "USD" | "HTG" = "USD"): string {
  if (currency === "HTG") {
    return `${amount.toLocaleString("fr-HT")} HTG`;
  }
  return `$${amount.toFixed(2)}`;
}

/**
 * Returns Tailwind classes for vendor balance display based on currency.
 * HTG = red palette, USD = green palette.
 */
export function getVendorBalanceClasses(currency: "USD" | "HTG" | string = "HTG") {
  if (currency === "USD") {
    return {
      gradient: "bg-linear-to-br from-green-600 to-emerald-700",
      solidBg: "bg-green-600",
      text: "text-green-600",
      textLight: "text-green-100",
      border: "border-green-200",
      ring: "ring-green-500",
      chipBg: "bg-green-100",
      chipText: "text-green-700",
    };
  }
  // HTG (default)
  return {
    gradient: "bg-linear-to-br from-red-600 to-rose-700",
    solidBg: "bg-red-600",
    text: "text-red-600",
    textLight: "text-red-100",
    border: "border-red-200",
    ring: "ring-red-500",
    chipBg: "bg-red-100",
    chipText: "text-red-700",
  };
}

export function formatDate(date: string | number | Date, format: "short" | "long" | "time" = "short"): string {
  const d = new Date(date);
  if (format === "long") {
    return d.toLocaleDateString("en-US", { year: "numeric", month: "long", day: "numeric" });
  }
  if (format === "time") {
    return d.toLocaleTimeString("en-US", { hour: "2-digit", minute: "2-digit" });
  }
  return d.toLocaleDateString("en-US", { year: "numeric", month: "short", day: "numeric" });
}

export const EXCHANGE_RATE = 150; // 1 USD = 150 HTG

export const GAME_TYPES = ["senp", "maryaj", "loto3", "loto4", "loto5"] as const;
export type GameType = (typeof GAME_TYPES)[number];

export const DRAW_STATE_CODES = ["NY", "FL", "GA", "TX", "PA", "CT", "TN", "NJ"] as const;
export type DrawState = (typeof DRAW_STATE_CODES)[number];

// Lookup objects indexed by string for flexible use
export const DRAW_STATES: Record<string, string> = {
  NY: "New York", FL: "Florida", GA: "Georgia", TX: "Texas",
  PA: "Pennsylvania", CT: "Connecticut", TN: "Tennessee", NJ: "New Jersey",
};

export const MULTIPLIERS: Record<string, number> = {
  senp: 50,
  maryaj: 100,
  loto3: 500,
  loto4: 5000,
  loto5: 50000,
};

export const GAME_LABELS: Record<string, string> = {
  senp: "Senp",
  maryaj: "Maryaj",
  loto3: "Lotto 3",
  loto4: "Lotto 4",
  loto5: "Lotto 5",
};
