// Pack pictures for products added in the back office: the admin picks one of
// the OCTA containers and types the label words; the picture and label are
// drawn by the same components as the built-in range (ProductShot, BrandLabel,
// LandscapeLabel). Pure, so it is tested in scripts/backoffice.test.mjs.
import type { CatalogueItem, PackDesign } from "./backoffice/types";
import type { Product } from "./products";
import { packKind, type PackKind } from "./pack";

export const CONTAINERS: { value: PackKind; label: string; size: string }[] = [
  { value: "can", label: "25 L jerry can", size: "25L" },
  { value: "drum", label: "210 L plastic drum", size: "210L plastic drum" },
  { value: "jug", label: "5 L jug", size: "5L" },
  { value: "bottle", label: "500 ml bottle", size: "500ml" },
];

export const COLOURS: { value: PackDesign["colour"]; label: string; category: string }[] = [
  { value: "lime", label: "Lime (like OCTA-X)", category: "ethanol" },
  { value: "flare", label: "Red (like OCTA-M)", category: "methanol" },
  { value: "ink", label: "Black (like OCTA-BOOST)", category: "additives" },
  { value: "cobalt", label: "Blue (like OCTA-TORQUE)", category: "diesel" },
];

export const PICTOGRAMS: { value: PackDesign["pictograms"][number]; label: string }[] = [
  { value: "flame", label: "Flammable" },
  { value: "goggles", label: "Eye protection" },
  { value: "gloves", label: "Gloves" },
  { value: "respirator", label: "Respirator" },
  { value: "no-flame", label: "No open flame" },
];

/** Uppercase label text, trimmed to what fits the label. */
export const LIMITS = { mark: 6, title: 12, highlight: 6, badge: 6, un: 10, hazardClass: 10, line: 22, disclaimer: 420 } as const;

const clip = (text: string, max: number) => text.trim().toUpperCase().slice(0, max);

/** A starting design from the product's name, size and category. */
export function defaultPack(item: Pick<CatalogueItem, "productName" | "size" | "category">): PackDesign {
  const name = item.productName.trim();
  // "OCTA-N Nitro methane 98%" -> mark N, title NITRO, highlight 98%.
  const mark = /^OCTA-?([A-Z0-9]+)/i.exec(name)?.[1] ?? "";
  const rest = name.replace(/^OCTA-?[A-Z0-9]+\s*/i, "");
  const highlight = /(\d+(?:\.\d+)?%)/.exec(rest)?.[1] ?? "";
  const title = rest.replace(highlight, "").trim().split(/\s+/)[0] ?? "";
  const hasLitres = /\d\s*(ml|l)\b/i.test(item.size) || /drum/i.test(item.size);
  const fuel = ["ethanol", "methanol", "fuel", "additives"].includes(item.category);
  return {
    container: hasLitres ? packKind(item.size) : "can",
    colour: item.category === "methanol" ? "flare" : item.category === "additives" ? "ink" : "lime",
    mark: clip(mark || "X", LIMITS.mark),
    title: clip(title || name, LIMITS.title),
    highlight: clip(highlight, LIMITS.highlight),
    badge: "",
    un: fuel ? "UN 1170" : "",
    hazardClass: fuel ? "CLASS 3" : "",
    pictograms: fuel ? ["flame", "goggles", "gloves", "respirator"] : [],
    lines: [],
    disclaimer: `${name.toUpperCase() || "THIS PRODUCT"} IS FOR PERFORMANCE USE. USE AT OWN RISK. TO THE MAXIMUM EXTENT PERMITTED BY LAW, OCTA, ZRG-X (PTY) LTD AND THEIR DIRECTORS AND OWNERS ARE NOT LIABLE FOR LOSS, INJURY OR DAMAGE ARISING FROM ITS USE, OTHER THAN LIABILITY THAT CANNOT LAWFULLY BE EXCLUDED.`,
  };
}

/** Keep a design within what the label can hold. */
export function cleanPack(p: PackDesign): PackDesign {
  return {
    container: CONTAINERS.some((c) => c.value === p.container) ? p.container : "can",
    colour: COLOURS.some((c) => c.value === p.colour) ? p.colour : "lime",
    mark: clip(p.mark, LIMITS.mark),
    title: clip(p.title, LIMITS.title),
    highlight: clip(p.highlight, LIMITS.highlight),
    badge: clip(p.badge, LIMITS.badge),
    un: clip(p.un, LIMITS.un),
    hazardClass: clip(p.hazardClass, LIMITS.hazardClass),
    pictograms: PICTOGRAMS.map((x) => x.value).filter((v) => p.pictograms.includes(v)),
    lines: p.lines.map((l) => clip(l, LIMITS.line)).filter(Boolean).slice(0, 3),
    disclaimer: p.disclaimer.trim().toUpperCase().slice(0, LIMITS.disclaimer),
  };
}

/** The pack size the picture shows: the item's own size when it fits the container, else the container's standard size. */
function shownSize(item: Pick<CatalogueItem, "size">, container: PackKind): string {
  const fits = (/\d\s*(ml|l)\b/i.test(item.size) || /drum/i.test(item.size)) && packKind(item.size) === container;
  return fits ? item.size : CONTAINERS.find((c) => c.value === container)!.size;
}

/** A product record the pack components can draw. */
export function packProduct(item: Pick<CatalogueItem, "sku" | "productName" | "size"> & { short?: string }, design: PackDesign): Product {
  const p = cleanPack(design);
  const wide = p.container === "can" || p.container === "drum";
  return {
    slug: item.sku.toLowerCase(),
    name: item.productName,
    category: COLOURS.find((c) => c.value === p.colour)!.category,
    short: item.short ?? "",
    description: "",
    specs: [],
    applications: [],
    variants: [{ size: shownSize(item, p.container), sku: item.sku, price: null }],
    label: {
      layout: wide ? "wide" : "tall",
      mark: p.mark || "X",
      title: p.title,
      ...(p.highlight ? { highlight: p.highlight } : {}),
      ...(p.badge && wide ? { badge: p.badge } : {}),
      ...(p.un ? { un: p.un, hazardClass: p.hazardClass } : {}),
      unPlacement: "above",
      chain: false,
      pictograms: p.pictograms,
      disclaimer: p.disclaimer,
      ...(!wide && p.lines.length ? { lines: p.lines } : {}),
    },
  };
}
