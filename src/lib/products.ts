// OCTA Performance catalogue. Product names, UN numbers, hazard classes, mix
// ratios and label wording come from the supplied product labels. Pack sizes,
// prices and stock are still sample data for the demo.

export type Category = {
  slug: string;
  name: string;
  blurb: string;
};

export type Variant = {
  size: string;
  sku: string;
  price: number; // in ZAR
  stock: number;
};

export type Pictogram = "flame" | "goggles" | "gloves" | "respirator" | "no-flame";

/** Everything printed on the product label, as supplied. */
export type ProductLabel = {
  /** Lime mark after the OCTA wordmark: a letter (X, M) or a word (BOOST). */
  mark: string;
  /** Product name printed large, with an optional lime highlight (e.g. "95%"). */
  title: string;
  highlight?: string;
  un: string;
  hazardClass: string;
  /** Whether the UN line sits above the product name (OCTA-X) or below it (OCTA-M). */
  unPlacement: "above" | "below";
  /** Show the alcohol chain doodle next to the mark. */
  chain: boolean;
  pictograms: Pictogram[];
  disclaimer: string;
  /** Mixing instructions (OCTA-BOOST). */
  mix?: { lead: string; rows: { ratio: string; text: string }[] };
};

export type Product = {
  slug: string;
  name: string;
  category: string; // category slug
  short: string;
  description: string;
  specs: { label: string; value: string }[];
  applications: string[];
  featured?: boolean;
  variants: Variant[];
  label: ProductLabel;
};

export const categories: Category[] = [
  {
    slug: "ethanol",
    name: "Ethanol",
    blurb: "OCTA-X: 95% ethanol for performance use, for alcohol-fuelled and flex-fuel builds.",
  },
  {
    slug: "methanol",
    name: "Methanol",
    blurb: "OCTA-M: methanol in its purest form for methanol-burning performance engines.",
  },
  {
    slug: "additives",
    name: "Octane booster",
    blurb: "OCTA-BOOST: octane booster mixed with 95 octane pump fuel, from 1:7 up to 1:4.",
  },
];

const PPE: Pictogram[] = ["flame", "goggles", "gloves", "respirator"];

export const products: Product[] = [
  {
    slug: "octa-x-ethanol",
    name: "OCTA-X Ethanol 95%",
    category: "ethanol",
    short: "95% ethanol in its purest form for performance use.",
    description:
      "OCTA-X is ethanol in its purest form for performance use. Alcohol fuels carry their own oxygen and cool the intake charge as they evaporate, which is why ethanol-fuelled builds can run more timing and boost. Run it only in a fuel system rated for alcohol. Every can carries a manufacture date and batch number for traceability.",
    specs: [
      { label: "Ethanol", value: "95%" },
      { label: "UN number", value: "UN 1170" },
      { label: "Hazard class", value: "Class 3, flammable liquid" },
      { label: "Traceability", value: "MFD date and batch on every pack" },
    ],
    applications: ["Ethanol-fuelled builds", "Flex-fuel setups", "Performance use"],
    featured: true,
    variants: [
      { size: "25L", sku: "OCTA-X-25", price: 990, stock: 34 },
      { size: "200L drum", sku: "OCTA-X-200", price: 7400, stock: 7 },
    ],
    label: {
      mark: "X",
      title: "ETHANOL",
      highlight: "95%",
      un: "UN 1170",
      hazardClass: "CLASS 3",
      unPlacement: "above",
      chain: true,
      pictograms: PPE,
      disclaimer:
        "OCTA-X IS ETHANOL IN ITS PUREST FORM FOR PERFORMANCE USE. USE AT OWN RISK. TO THE MAXIMUM EXTENT PERMITTED BY LAW, OCTA, ZRG-X (PTY) LTD AND THEIR DIRECTORS AND OWNERS ARE NOT LIABLE FOR LOSS, INJURY OR DAMAGE ARISING FROM ITS USE, OTHER THAN LIABILITY THAT CANNOT LAWFULLY BE EXCLUDED.",
    },
  },
  {
    slug: "octa-m-methanol",
    name: "OCTA-M Methanol",
    category: "methanol",
    short: "Methanol in its purest form for performance use.",
    description:
      "OCTA-M is methanol in its purest form for performance use, for methanol-burning engines. Methanol is flammable and toxic: handle it with eye protection, gloves and a respirator, keep it away from open flame, and use it only in a fuel system built for methanol. Every can carries a manufacture date and batch number for traceability.",
    specs: [
      { label: "Product", value: "Methanol" },
      { label: "UN number", value: "UN 1230" },
      { label: "Hazard class", value: "Class 3, flammable liquid" },
      { label: "Traceability", value: "MFD date and batch on every pack" },
    ],
    applications: ["Methanol-burning engines", "Performance use"],
    featured: true,
    variants: [
      { size: "25L", sku: "OCTA-M-25", price: 640, stock: 60 },
      { size: "200L drum", sku: "OCTA-M-200", price: 4800, stock: 15 },
    ],
    label: {
      mark: "M",
      title: "METHANOL",
      un: "UN 1230",
      hazardClass: "CLASS 3",
      unPlacement: "below",
      chain: true,
      pictograms: [...PPE, "no-flame"],
      disclaimer:
        "OCTA-M IS METHANOL IN ITS PUREST FORM FOR PERFORMANCE USE. USE AT OWN RISK. TO THE MAXIMUM EXTENT PERMITTED BY LAW, OCTA, ZRG-X (PTY) LTD AND THEIR DIRECTORS AND OWNERS ARE NOT LIABLE FOR LOSS, INJURY OR DAMAGE, OTHER THAN LIABILITY THAT CANNOT LAWFULLY BE EXCLUDED.",
    },
  },
  {
    slug: "octa-boost",
    name: "OCTA-BOOST Octane Booster",
    category: "additives",
    short: "Octane booster for 95 octane pump fuel, mixed from 1:7 to 1:4.",
    description:
      "OCTA-BOOST is an octane booster for performance use. Mix it only with 95 octane pump fuel: 1:7 is the maximum dilution, 1:5 is moderate and 1:4 is extreme. Re-check your tune whenever you change the mix.",
    specs: [
      { label: "Mix with", value: "95 octane pump fuel only" },
      { label: "Ratios", value: "1:7 max dilution · 1:5 moderate · 1:4 extreme" },
      { label: "UN number", value: "UN 1170" },
      { label: "Hazard class", value: "Class 3, flammable liquid" },
    ],
    applications: ["95 octane pump fuel", "Performance use"],
    featured: true,
    // Ships in the 5L HDPE jug.
    variants: [{ size: "5L", sku: "OCTA-BOOST-5", price: 1390, stock: 40 }],
    label: {
      mark: "BOOST",
      title: "OCTANE",
      highlight: "BOOSTER",
      un: "UN 1170",
      hazardClass: "CLASS 3",
      unPlacement: "below",
      chain: false,
      pictograms: PPE,
      disclaimer:
        "USE AT OWN RISK. OCTA-BOOST IS FOR PERFORMANCE USE ONLY. TO THE MAXIMUM EXTENT PERMITTED BY LAW, OCTA, ZRG-X (PTY) LTD AND THEIR DIRECTORS AND OWNERS ARE NOT LIABLE FOR LOSS, INJURY OR DAMAGE OF OCTA-BOOST, OTHER THAN LIABILITY THAT CANNOT LAWFULLY BE EXCLUDED.",
      mix: {
        lead: "MIX ONLY WITH 95 OCTANE PUMP FUEL",
        rows: [
          { ratio: "1:7", text: "MAXIMUM DILUTION" },
          { ratio: "1:5", text: "MODERATE" },
          { ratio: "1:4", text: "EXTREME" },
        ],
      },
    },
  },
];

export function getProduct(slug: string): Product | undefined {
  return products.find((p) => p.slug === slug);
}

export function getCategory(slug: string): Category | undefined {
  return categories.find((c) => c.slug === slug);
}

export function productsInCategory(slug: string): Product[] {
  return products.filter((p) => p.category === slug);
}

export function featuredProducts(): Product[] {
  return products.filter((p) => p.featured);
}

export function fromPrice(p: Product): number {
  return Math.min(...p.variants.map((v) => v.price));
}

export function totalStock(p: Product): number {
  return p.variants.reduce((sum, v) => sum + v.stock, 0);
}
