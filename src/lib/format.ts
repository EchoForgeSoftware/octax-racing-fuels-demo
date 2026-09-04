import { SITE } from "./site";

// Deterministic currency formatter so server and client render identically.
export function formatPrice(n: number): string {
  const grouped = Math.round(n)
    .toString()
    .replace(/\B(?=(\d{3})+(?!\d))/g, " ");
  return `${SITE.currencySymbol}${grouped}`;
}
