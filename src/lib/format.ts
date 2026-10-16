import { SITE } from "./site";

// Deterministic currency formatter so server and client render identically.
// Prices carry cents (e.g. R5 230.89), so round to the cent before formatting.
export function formatPrice(n: number): string {
  const [rand, cents] = (Math.round(n * 100) / 100).toFixed(2).split(".");
  const grouped = rand.replace(/\B(?=(\d{3})+(?!\d))/g, " ");
  return `${SITE.currencySymbol}${grouped}.${cents}`;
}
