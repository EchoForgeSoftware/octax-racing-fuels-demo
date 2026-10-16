// OCTA Performance catalogue. Product names, UN numbers, hazard classes, mix
// ratios and label wording come from the supplied product labels. Prices and
// pack sizes come from the supplied price list (ZAR, VAT included, courier
// excluded). No stock is held on hand, so stock is not tracked.

export type Category = {
  slug: string;
  name: string;
  blurb: string;
};

export type Variant = {
  size: string;
  sku: string;
  /** ZAR, VAT included, courier excluded. null = subject to quotation. */
  price: number | null;
};

export type Pictogram = "flame" | "goggles" | "gloves" | "respirator" | "no-flame";

/** Everything printed on the product label, as supplied. */
export type ProductLabel = {
  /** "wide" is the 2:3 can label (OCTA-X, OCTA-M); "tall" the 9:16 jug and bottle label. */
  layout: "wide" | "tall";
  /** Lime mark after the OCTA wordmark: a letter (X, M) or a word (BOOST). */
  mark: string;
  /** Product name printed large, with an optional lime highlight (e.g. "96%"). */
  title: string;
  highlight?: string;
  /** Left off where the product's dangerous-goods data has not been supplied yet. */
  un?: string;
  hazardClass?: string;
  /** Whether the UN line sits above the product name (OCTA-X) or below it (OCTA-M). */
  unPlacement: "above" | "below";
  /** Show the alcohol chain doodle next to the mark. */
  chain: boolean;
  pictograms: Pictogram[];
  disclaimer: string;
  /** Mixing instructions (OCTA-BOOST). */
  mix?: { lead: string; rows: { ratio: string; text: string }[] };
  /** Short descriptor lines for tall labels without a mix table. */
  lines?: string[];
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
    blurb: "OCTA-X: 96% ethanol for performance use, for alcohol-fuelled and flex-fuel builds.",
  },
  {
    slug: "methanol",
    name: "Methanol",
    blurb: "OCTA-M: 100% methanol in its purest form for methanol-burning performance engines.",
  },
  {
    slug: "additives",
    name: "Octane booster",
    blurb: "OCTA-BOOST in 5L for mixing with 95 octane pump fuel, and OCTA-SHOT fuel octane booster in 500ml.",
  },
  {
    slug: "diesel",
    name: "Diesel improver",
    blurb: "OCTA-TORQUE: diesel improver in a 500ml bottle.",
  },
];

const PPE: Pictogram[] = ["flame", "goggles", "gloves", "respirator"];

export const products: Product[] = [
  {
    slug: "octa-x-ethanol",
    name: "OCTA-X Ethanol 96%",
    category: "ethanol",
    short: "96% ethanol in its purest form for performance use.",
    description:
      "OCTA-X is ethanol in its purest form for performance use. Alcohol fuels carry their own oxygen and cool the intake charge as they evaporate, which is why ethanol-fuelled builds can run more timing and boost. Run it only in a fuel system rated for alcohol. Every can carries a manufacture date and batch number for traceability.",
    specs: [
      { label: "Ethanol", value: "96%" },
      { label: "UN number", value: "UN 1170" },
      { label: "Hazard class", value: "Class 3, flammable liquid" },
      { label: "Traceability", value: "MFD date and batch on every pack" },
    ],
    applications: ["Ethanol-fuelled builds", "Flex-fuel setups", "Performance use"],
    featured: true,
    variants: [
      { size: "25L", sku: "OCTA-X-25", price: 760 },
      { size: "210L plastic drum", sku: "OCTA-X-210", price: 6160 },
    ],
    label: {
      layout: "wide",
      mark: "X",
      title: "ETHANOL",
      highlight: "96%",
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
    name: "OCTA-M Methanol 100%",
    category: "methanol",
    short: "100% methanol in its purest form for performance use.",
    description:
      "OCTA-M is methanol in its purest form for performance use, for methanol-burning engines. Methanol is flammable and toxic: handle it with eye protection, gloves and a respirator, keep it away from open flame, and use it only in a fuel system built for methanol. Every can carries a manufacture date and batch number for traceability.",
    specs: [
      { label: "Methanol", value: "100%" },
      { label: "UN number", value: "UN 1230" },
      { label: "Hazard class", value: "Class 3, flammable liquid" },
      { label: "Traceability", value: "MFD date and batch on every pack" },
    ],
    applications: ["Methanol-burning engines", "Performance use"],
    featured: true,
    variants: [
      { size: "25L", sku: "OCTA-M-25", price: 600 },
      { size: "210L plastic drum", sku: "OCTA-M-210", price: 5500 },
    ],
    label: {
      layout: "wide",
      mark: "M",
      title: "METHANOL",
      highlight: "100%",
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
    // 5L HDPE jug; the 20L can is priced on quotation.
    variants: [
      { size: "5L", sku: "OCTA-BOOST-5", price: 440 },
      { size: "20L", sku: "OCTA-BOOST-20", price: null },
    ],
    label: {
      layout: "tall",
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
  {
    slug: "octa-shot",
    name: "OCTA-SHOT Fuel Octane Booster",
    category: "additives",
    short: "Fuel octane booster in a 500ml bottle.",
    description:
      "OCTA-SHOT is OCTA's fuel octane booster in a 500ml bottle, the compact partner to the 5L OCTA-BOOST. Follow the dosing instructions supplied with the product, and re-check your tune whenever you change your fuel.",
    specs: [
      { label: "Size", value: "500ml bottle" },
      { label: "Use", value: "Fuel octane booster" },
    ],
    applications: ["Petrol engines", "Performance use"],
    featured: true,
    variants: [{ size: "500ml", sku: "OCTA-SHOT-500", price: 150 }],
    label: {
      layout: "tall",
      mark: "SHOT",
      title: "OCTANE",
      highlight: "BOOSTER",
      unPlacement: "below",
      chain: false,
      pictograms: ["goggles", "gloves"],
      lines: ["500ML BOTTLE", "FOR PETROL ENGINES"],
      disclaimer:
        "USE AT OWN RISK. OCTA-SHOT IS FOR PERFORMANCE USE ONLY. TO THE MAXIMUM EXTENT PERMITTED BY LAW, OCTA, ZRG-X (PTY) LTD AND THEIR DIRECTORS AND OWNERS ARE NOT LIABLE FOR LOSS, INJURY OR DAMAGE ARISING FROM ITS USE, OTHER THAN LIABILITY THAT CANNOT LAWFULLY BE EXCLUDED.",
    },
  },
  {
    slug: "octa-torque",
    name: "OCTA-TORQUE Diesel Improver",
    category: "diesel",
    short: "Diesel improver in a 500ml bottle.",
    description:
      "OCTA-TORQUE is OCTA's diesel improver in a 500ml bottle, for diesel engines. Follow the dosing instructions supplied with the product.",
    specs: [
      { label: "Size", value: "500ml bottle" },
      { label: "Use", value: "Diesel improver" },
    ],
    applications: ["Diesel engines"],
    variants: [{ size: "500ml", sku: "OCTA-TORQUE-500", price: 120 }],
    label: {
      layout: "tall",
      mark: "TORQUE",
      title: "DIESEL",
      highlight: "IMPROVER",
      unPlacement: "below",
      chain: false,
      pictograms: ["goggles", "gloves"],
      lines: ["500ML BOTTLE", "FOR DIESEL ENGINES"],
      disclaimer:
        "USE AT OWN RISK. TO THE MAXIMUM EXTENT PERMITTED BY LAW, OCTA, ZRG-X (PTY) LTD AND THEIR DIRECTORS AND OWNERS ARE NOT LIABLE FOR LOSS, INJURY OR DAMAGE ARISING FROM THE USE OF OCTA-TORQUE, OTHER THAN LIABILITY THAT CANNOT LAWFULLY BE EXCLUDED.",
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

/** Lowest listed price; quote-only sizes are ignored. */
export function fromPrice(p: Product): number {
  const listed = p.variants.flatMap((v) => (v.price === null ? [] : [v.price]));
  return Math.min(...listed);
}
