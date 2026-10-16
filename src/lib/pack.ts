// Packaging data derived from the catalogue: which container a size ships in,
// what the label says, and what colour the fuel shows through the HDPE.
import type { Product, Variant } from "./products";

export type PackKind = "can" | "drum" | "bottle";

/** 200L ships in a steel drum, 5L and up in an HDPE jerry can, smaller in a bottle. */
export function packKind(size: string): PackKind {
  if (/drum/i.test(size)) return "drum";
  const litres = /ml/i.test(size) ? parseFloat(size) / 1000 : parseFloat(size);
  return litres >= 5 ? "can" : "bottle";
}

/** "20L" -> "20 L", "200L drum" -> "200 L", "500ml" -> "500 ml". */
export function volumeLabel(size: string): string {
  const m = size.match(/(\d+(?:\.\d+)?)\s*(ml|l)/i);
  if (!m) return size.toUpperCase();
  return `${m[1]} ${m[2].toLowerCase() === "ml" ? "ml" : "L"}`;
}

// Product code printed large on the label, taken from the SKU (OX-RF102-20 -> RF102).
const codeOverrides: Record<string, string> = { METH: "MeOH" };

export function productCode(product: Product): string {
  const raw = product.variants[0]?.sku.split("-")[1] ?? product.slug.slice(0, 4).toUpperCase();
  return codeOverrides[raw] ?? raw;
}

/** Product name without the brand and the code, for the label's descriptor line. */
export function labelName(product: Product): string {
  const raw = product.variants[0]?.sku.split("-")[1] ?? "";
  return product.name
    .replace(/^Octax\s+/i, "")
    .replace(new RegExp(`\\b${raw}\\b`, "i"), "")
    .replace(/\s+/g, " ")
    .trim();
}

/** Greedy word wrap for SVG text, which has no native wrapping. */
export function wrap(text: string, maxChars: number, maxLines = 2): string[] {
  const lines: string[] = [];
  let line = "";
  for (const word of text.split(" ")) {
    const next = line ? `${line} ${word}` : word;
    if (next.length > maxChars && line) {
      lines.push(line);
      line = word;
    } else {
      line = next;
    }
  }
  if (line) lines.push(line);
  return lines.slice(0, maxLines);
}

export const categoryColor: Record<string, string> = {
  "race-fuels": "var(--color-flare)",
  methanol: "var(--color-cobalt)",
  ethanol: "var(--color-lime)",
  additives: "var(--color-ink)",
};

/** Text colour that reads on a category colour. */
export function onCategory(category: string): string {
  return category === "ethanol" ? "var(--color-ink)" : "var(--color-paper)";
}

/** Dyed fuels show their colour through the translucent can; clear fuels a faint tint. */
export function liquidColor(product: Product): string {
  if (product.category === "additives") return "oklch(0.78 0.14 75)";
  const colour = product.specs.find((s) => s.label === "Colour")?.value.toLowerCase() ?? "";
  if (colour.includes("green")) return "oklch(0.74 0.17 150)";
  if (colour.includes("purple")) return "oklch(0.55 0.2 305)";
  if (colour.includes("blue")) return "oklch(0.6 0.16 245)";
  return "oklch(0.9 0.06 95)";
}

/** Hazard class shown on the label: flammable fuels get the GHS flame. */
export function hazard(product: Product): "flame" | "warning" {
  return product.category === "additives" ? "warning" : "flame";
}

export function primaryVariant(product: Product): Variant {
  return product.variants[0];
}
