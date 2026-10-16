// Packaging rules derived from the catalogue: which container a size ships in
// and the colours the product shot uses.
import type { Product } from "./products";

/** 210L ships in a plastic drum, 20L and 25L in the jerry can, 5L in the jug, 500ml in a bottle. */
export type PackKind = "can" | "drum" | "jug" | "bottle";

export function packKind(size: string): PackKind {
  if (/drum/i.test(size)) return "drum";
  const litres = /ml/i.test(size) ? parseFloat(size) / 1000 : parseFloat(size);
  if (litres >= 20) return "can";
  return litres >= 2 ? "jug" : "bottle";
}

/** "25L" -> "25L", "210L plastic drum" -> "210L", "500ml" -> "500ml" (as embossed on the packs). */
export function volumeLabel(size: string): string {
  const m = size.match(/(\d+(?:\.\d+)?)\s*(ml|l)/i);
  if (!m) return size.toUpperCase();
  return `${m[1]}${m[2].toLowerCase() === "ml" ? "ml" : "L"}`;
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
  ethanol: "var(--color-lime)",
  methanol: "var(--color-flare)",
  additives: "var(--color-ink)",
  diesel: "var(--color-cobalt)",
};

/** Text colour that reads on a category colour. */
export function onCategory(category: string): string {
  return category === "ethanol" ? "var(--color-ink)" : "var(--color-paper)";
}

export function packName(kind: PackKind): string {
  return { can: "Jerry can", drum: "Plastic drum", jug: "Jug", bottle: "Bottle" }[kind];
}

export type { Product };
