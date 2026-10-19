// GENERATED from src/lib/backoffice/stock.ts by scripts/gen-backoffice-function.mjs. Do not edit.
// Stock control. Pure: stock on hand is worked out from what was booked in,
// what was invoiced and what stock takes found, so there is no separate
// running total to drift. Sales use the oldest batch first (earliest expiry,
// then earliest book-in), which is also the order staff should pick stock in.
import { cents } from "./calc.ts";
import type { BackofficeData, CatalogueItem, StockBatch } from "./types.ts";

export const VAT_RATE = 0.15;
/** Batches older than this (days since book-in) are flagged as old stock. */
export const OLD_STOCK_DAYS = 180;
/** Batches expiring within this many days are flagged. */
export const EXPIRY_WARN_DAYS = 60;

export const inclVat = (ex: number) => cents(ex * (1 + VAT_RATE));
export const exVat = (incl: number) => cents(incl / (1 + VAT_RATE));

/** The cost that counts: a business not registered for VAT cannot claim it back, so it pays the VAT-inclusive cost. */
export const effectiveCost = (b: Pick<StockBatch, "unitCostEx" | "unitCostIncl">, vatRegistered: boolean) => (vatRegistered ? b.unitCostEx : b.unitCostIncl);

/** Profit per unit and margin on the selling price; `under` when the price is below cost. */
export function unitProfit(sell: number | null, cost: number) {
  if (sell === null || !(sell > 0)) return null;
  const profit = cents(sell - cost);
  return { profit, margin: Math.round((profit / sell) * 1000) / 10, under: sell < cost };
}

const days = (from: string, to: string) => Math.round((Date.parse(`${to}T00:00:00Z`) - Date.parse(`${from}T00:00:00Z`)) / 86_400_000);

export type BatchWarning = "expired" | "expires-soon" | "old" | "older-than-newest";
export const WARNING_LABEL: Record<BatchWarning, string> = {
  expired: "Expired: do not sell",
  "expires-soon": "Expires soon: sell first",
  old: "Old stock: sell first",
  "older-than-newest": "Older batch still on the shelf: sell before newer stock",
};

export type BatchLevel = StockBatch & { remaining: number; warnings: BatchWarning[] };
export type StockLevel = {
  sku: string;
  bookedIn: number;
  sold: number;
  /** Net stock-take differences (negative = missing). */
  adjusted: number;
  onHand: number;
  value: number;
  batches: BatchLevel[];
  warnings: BatchWarning[];
  lastCount: string | null;
};

/** FIFO pick order: expired first is wrong to sell, so earliest expiry wins, then earliest book-in. */
function pickOrder(a: StockBatch, b: StockBatch) {
  const ea = a.expiryDate ?? "9999-12-31";
  const eb = b.expiryDate ?? "9999-12-31";
  return ea.localeCompare(eb) || a.date.localeCompare(b.date) || a.id.localeCompare(b.id);
}

/** Whether the website shows this product as out of stock. */
export function isSoldOut(item: Pick<CatalogueItem, "sku" | "stock">, levels: Pick<StockLevel, "sku" | "onHand">[]): boolean {
  if (item.stock === "out") return true;
  if (item.stock !== "auto") return false;
  return (levels.find((l) => l.sku === item.sku)?.onHand ?? 0) <= 0;
}

export function stockLevels(data: Pick<BackofficeData, "stock" | "stockCounts" | "documents" | "settings">, today: string): StockLevel[] {
  const skus = [...new Set([...data.stock.map((b) => b.sku), ...data.stockCounts.map((c) => c.sku)])];
  return skus.map((sku) => {
    const batches = data.stock.filter((b) => b.sku === sku).sort(pickOrder);
    // Stock is tracked from the first book-in; earlier sales came from stock that was never booked in.
    const since = batches.reduce((min, b) => (b.date < min ? b.date : min), "9999-12-31");
    const sold = data.documents
      .filter((d) => d.kind === "invoice" && !d.cancelled && d.date >= since)
      .flatMap((d) => d.lines)
      .filter((l) => l.sku === sku)
      .reduce((n, l) => n + l.qty, 0);
    const counts = data.stockCounts.filter((c) => c.sku === sku);
    const adjusted = counts.reduce((n, c) => n + (c.counted - c.expected), 0);
    const bookedIn = batches.reduce((n, b) => n + b.qty, 0);

    // Sales and losses take from the oldest batches; found stock is added to the newest.
    let take = sold + Math.max(0, -counts.filter((c) => c.counted < c.expected).reduce((n, c) => n + (c.counted - c.expected), 0));
    let found = counts.filter((c) => c.counted > c.expected).reduce((n, c) => n + (c.counted - c.expected), 0);
    const levels: BatchLevel[] = batches.map((b) => {
      const used = Math.min(b.qty, take);
      take -= used;
      return { ...b, remaining: b.qty - used, warnings: [] };
    });
    if (found > 0 && levels.length) { levels[levels.length - 1].remaining += found; found = 0; }

    const newest = levels.reduce((max, b) => (b.date > max ? b.date : max), "");
    for (const b of levels) {
      if (b.remaining <= 0) continue;
      if (b.expiryDate && b.expiryDate < today) b.warnings.push("expired");
      else if (b.expiryDate && days(today, b.expiryDate) <= EXPIRY_WARN_DAYS) b.warnings.push("expires-soon");
      if (days(b.date, today) > OLD_STOCK_DAYS) b.warnings.push("old");
      if (b.date < newest && levels.some((o) => o.date === newest && o.remaining > 0) && !b.warnings.length) b.warnings.push("older-than-newest");
    }
    const onHand = bookedIn - sold + adjusted;
    const vat = data.settings.vatRegistered;
    return {
      sku, bookedIn, sold, adjusted, onHand,
      value: cents(levels.reduce((n, b) => n + Math.max(0, b.remaining) * effectiveCost(b, vat), 0)),
      batches: levels,
      warnings: [...new Set(levels.flatMap((b) => b.warnings))],
      lastCount: counts.reduce<string | null>((max, c) => (!max || c.date > max ? c.date : max), null),
    };
  });
}

/** Units and value lost to stock-take shortfalls (missing or stolen stock). */
export function stockLosses(data: Pick<BackofficeData, "stock" | "stockCounts" | "settings">) {
  const short = data.stockCounts.filter((c) => c.counted < c.expected);
  const value = short.reduce((n, c) => {
    const batch = [...data.stock].filter((b) => b.sku === c.sku).sort((a, b) => b.date.localeCompare(a.date))[0];
    return n + (c.expected - c.counted) * (batch ? effectiveCost(batch, data.settings.vatRegistered) : 0);
  }, 0);
  return { units: short.reduce((n, c) => n + c.expected - c.counted, 0), value: cents(value) };
}

const niceDate = (iso: string) => new Date(`${iso}T00:00:00Z`).toLocaleDateString("en-ZA", { day: "numeric", month: "short", year: "numeric", timeZone: "UTC" });

/** What to tell someone adding this product to an order: low stock and batches to sell first. */
export function sellWarnings(level: StockLevel | undefined, qty: number): string[] {
  if (!level) return [];
  const out: string[] = [];
  if (level.onHand < qty) out.push(level.onHand <= 0 ? "None in stock" : `Only ${level.onHand} in stock`);
  const first = level.batches.find((b) => b.remaining > 0);
  if (first?.warnings.includes("expired")) out.push(`Batch ${first.batchNumber || "(no number)"} expired ${niceDate(first.expiryDate!)}: check before selling`);
  else if (first?.warnings.length) out.push(`Sell batch ${first.batchNumber || "(no number)"} first${first.expiryDate ? ` (expires ${niceDate(first.expiryDate)})` : ""}`);
  return out;
}
