// GENERATED from src/lib/backoffice/costing.ts by scripts/gen-backoffice-function.mjs. Do not edit.
// Product costing: what one pack costs to make, built from cost lines entered
// excluding VAT (product price per litre, sticker, container, cap, travel fee,
// and any other costs with a description). Lines can be switched on and off,
// so the same table works for a 25 L drum and for a hoodie. Pure, so the
// numbers are tested in scripts/backoffice.test.mjs.
import { cents } from "./calc.ts";
import { inclVat } from "./stock.ts";
import type { CatalogueItem } from "./types.ts";

export type CostLine = {
  id: string;
  label: string;
  /** Free text, e.g. what an "other cost" is for. */
  description: string;
  enabled: boolean;
  /** Amount excluding VAT; per litre when `perLitre`, else per pack. */
  exVat: number;
  perLitre: boolean;
  /** Built-in lines can be switched off but not deleted. */
  builtIn: boolean;
};

export type Costing = {
  /** Purity received (e.g. 95, 96, 100); optional, shown on the shop when switched on. */
  purityEnabled: boolean;
  purity: number | null;
  /** Litres in one pack, for per-litre lines. */
  litres: number | null;
  lines: CostLine[];
  /** When true, the costing total becomes the product's cost for profit. */
  useAsCost: boolean;
};

/** "25L" → 25, "210L plastic drum" → 210, "500ml" → 0.5, "Large" → null. */
export function litresIn(size: string): number | null {
  const m = size.match(/(\d+(?:[.,]\d+)?)\s*(ml|l)\b/i);
  if (!m) return null;
  const n = Number(m[1].replace(",", "."));
  return m[2].toLowerCase() === "ml" ? n / 1000 : n;
}

const FUEL = /ethanol|methanol|fuel|avgas|nitro/i;

export function defaultCosting(item: Pick<CatalogueItem, "size" | "productName" | "category">): Costing {
  const litres = litresIn(item.size);
  const liquid = litres !== null;
  const purity = Number(item.productName.match(/(\d+(?:\.\d+)?)\s*%/)?.[1] ?? NaN);
  const line = (id: string, label: string, enabled: boolean, perLitre = false): CostLine =>
    ({ id, label, description: "", enabled, exVat: 0, perLitre, builtIn: true });
  return {
    purityEnabled: FUEL.test(item.category) || FUEL.test(item.productName),
    purity: Number.isFinite(purity) ? purity : null,
    litres,
    lines: [
      line("product", liquid ? "Product price per litre" : "Product price", true, liquid),
      line("sticker", "Sticker / label", true),
      line("container", "Container", liquid),
      line("cap", "Container cap", liquid),
      line("travel", "Travel fee", true),
    ],
    useAsCost: true,
  };
}

export type CostingTotals = {
  lines: (CostLine & { amountEx: number; amountIncl: number })[];
  exVat: number;
  inclVat: number;
};

export function costingTotals(c: Costing): CostingTotals {
  const lines = c.lines.map((l) => {
    const amountEx = l.enabled ? cents(l.perLitre ? l.exVat * (c.litres ?? 1) : l.exVat) : 0;
    return { ...l, amountEx, amountIncl: inclVat(amountEx) };
  });
  const exVat = cents(lines.reduce((n, l) => n + l.amountEx, 0));
  return { lines, exVat, inclVat: inclVat(exVat) };
}

/** The cost that counts for profit: incl VAT unless the business is VAT-registered. */
export const costingCost = (c: Costing, vatRegistered: boolean) => {
  const t = costingTotals(c);
  return vatRegistered ? t.exVat : t.inclVat;
};
