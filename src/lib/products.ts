// Sample catalogue for the demo. All products, prices and stock are illustrative
// sample data, not a real price list.

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
};

export const categories: Category[] = [
  {
    slug: "race-fuels",
    name: "Race Fuels",
    blurb:
      "High-octane leaded and unleaded competition fuels blended for consistent power and detonation resistance.",
  },
  {
    slug: "methanol",
    name: "Methanol",
    blurb:
      "High-purity methanol for methanol-burning engines, top fuel classes and speedway applications.",
  },
  {
    slug: "ethanol",
    name: "Ethanol",
    blurb:
      "Anhydrous ethanol and E85 blends for flex-fuel builds chasing cool intake charges and more timing.",
  },
  {
    slug: "additives",
    name: "Additives",
    blurb:
      "Octane boosters, upper-cylinder lubricants and fuel-system treatments to protect and sharpen your setup.",
  },
];

export const products: Product[] = [
  {
    slug: "rf102-unleaded",
    name: "Octax RF102 Unleaded Race Fuel",
    category: "race-fuels",
    short: "102 RON unleaded for modern high-compression and boosted engines.",
    description:
      "RF102 is an ash-free unleaded competition fuel for engines with catalytic converters, oxygen sensors and modern engine management. It resists detonation under boost while staying friendly to sensors and emissions hardware, making it a safe upgrade over pump premium for track days and club racing.",
    specs: [
      { label: "Octane (RON)", value: "102" },
      { label: "Lead", value: "Unleaded" },
      { label: "Oxygen content", value: "2.7%" },
      { label: "Colour", value: "Clear" },
    ],
    applications: ["Track days", "Turbo and supercharged", "Sensor-equipped engines"],
    featured: true,
    variants: [
      { size: "20L", sku: "OX-RF102-20", price: 1290, stock: 42 },
      { size: "200L drum", sku: "OX-RF102-200", price: 11900, stock: 6 },
    ],
  },
  {
    slug: "rf110-leaded",
    name: "Octax RF110 Leaded Race Fuel",
    category: "race-fuels",
    short: "110 RON leaded all-rounder for naturally aspirated and mild boost.",
    description:
      "RF110 is a leaded competition fuel that suits a wide spread of high-compression naturally aspirated engines and moderately boosted setups. The lead package cushions valve seats and lifts detonation resistance for aggressive timing without exotic tuning.",
    specs: [
      { label: "Octane (RON)", value: "110" },
      { label: "Lead", value: "Leaded" },
      { label: "Oxygen content", value: "0%" },
      { label: "Colour", value: "Green" },
    ],
    applications: ["Circuit racing", "Naturally aspirated", "Mild boost"],
    featured: true,
    variants: [
      { size: "20L", sku: "OX-RF110-20", price: 1490, stock: 55 },
      { size: "200L drum", sku: "OX-RF110-200", price: 13800, stock: 9 },
    ],
  },
  {
    slug: "rf118-drag",
    name: "Octax RF118 Leaded Drag Fuel",
    category: "race-fuels",
    short: "118 RON leaded fuel for high-boost and big-compression drag builds.",
    description:
      "RF118 is a high-lead, high-octane drag and pull fuel for engines running extreme cylinder pressure. It gives maximum detonation protection for large power adders and aggressive tune-ups on the strip.",
    specs: [
      { label: "Octane (RON)", value: "118" },
      { label: "Lead", value: "High lead" },
      { label: "Oxygen content", value: "0%" },
      { label: "Colour", value: "Purple" },
    ],
    applications: ["Drag racing", "High boost", "Nitrous"],
    variants: [
      { size: "20L", sku: "OX-RF118-20", price: 1790, stock: 28 },
      { size: "200L drum", sku: "OX-RF118-200", price: 16900, stock: 4 },
    ],
  },
  {
    slug: "e85-oxygenated",
    name: "Octax E85 Oxygenated Race Fuel",
    category: "ethanol",
    short: "Consistent 85% ethanol blend for flex-fuel and dedicated E85 builds.",
    description:
      "Unlike pump E85, Octax E85 holds a consistent ethanol percentage batch to batch, so your tune stays honest. The high latent heat drops intake temperatures and lets you run more timing and boost on the right hardware.",
    specs: [
      { label: "Ethanol content", value: "85% (consistent)" },
      { label: "Octane (RON)", value: "108 equivalent" },
      { label: "Oxygen content", value: "29.8%" },
      { label: "Colour", value: "Clear" },
    ],
    applications: ["Flex fuel", "Turbo and supercharged", "Dyno tuning"],
    featured: true,
    variants: [
      { size: "20L", sku: "OX-E85-20", price: 690, stock: 80 },
      { size: "200L drum", sku: "OX-E85-200", price: 6200, stock: 12 },
    ],
  },
  {
    slug: "ethanol-e100",
    name: "Octax Anhydrous Ethanol E100",
    category: "ethanol",
    short: "99.9% anhydrous ethanol for blending and dedicated ethanol engines.",
    description:
      "Anhydrous (water-free) ethanol for teams that blend their own fuel or run dedicated E100 setups. Supplied at 99.9% purity so your target ethanol percentage is repeatable.",
    specs: [
      { label: "Purity", value: "99.9% anhydrous" },
      { label: "Water content", value: "< 0.1%" },
      { label: "Colour", value: "Clear" },
      { label: "Handling", value: "Flammable" },
    ],
    applications: ["Fuel blending", "Dedicated ethanol", "Speedway"],
    variants: [
      { size: "25L", sku: "OX-E100-25", price: 990, stock: 34 },
      { size: "200L drum", sku: "OX-E100-200", price: 7400, stock: 7 },
    ],
  },
  {
    slug: "methanol-pure",
    name: "Octax Pure Methanol 99.9%",
    category: "methanol",
    short: "High-purity methanol for methanol-burning race engines.",
    description:
      "Race-grade methanol at 99.9% purity for sprint cars, speedway, top fuel classes and methanol drag engines. Consistent purity protects your tune and keeps corrosion in check when the system is maintained correctly.",
    specs: [
      { label: "Purity", value: "99.9%" },
      { label: "Water content", value: "< 0.1%" },
      { label: "Colour", value: "Clear" },
      { label: "Handling", value: "Toxic, flammable" },
    ],
    applications: ["Speedway", "Sprint cars", "Methanol drag"],
    featured: true,
    variants: [
      { size: "25L", sku: "OX-METH-25", price: 640, stock: 60 },
      { size: "200L drum", sku: "OX-METH-200", price: 4800, stock: 15 },
    ],
  },
  {
    slug: "octane-booster",
    name: "Octax Octane Booster Concentrate",
    category: "additives",
    short: "Concentrated booster to lift pump fuel a few points for spirited runs.",
    description:
      "A concentrated octane booster for lifting pump premium a few points when race fuel is not on hand. Dose per the label for the octane gain you need on the day.",
    specs: [
      { label: "Treats", value: "Up to 60L per litre" },
      { label: "Octane gain", value: "Up to 5 points" },
      { label: "Form", value: "Liquid concentrate" },
      { label: "Lead", value: "Unleaded" },
    ],
    applications: ["Track days", "Street and strip", "Top-up"],
    variants: [
      { size: "1L", sku: "OX-OB-1", price: 320, stock: 120 },
      { size: "5L", sku: "OX-OB-5", price: 1390, stock: 40 },
    ],
  },
  {
    slug: "upper-cylinder-lube",
    name: "Octax Upper Cylinder Lubricant",
    category: "additives",
    short: "Lubricity additive for methanol and high-ethanol fuel systems.",
    description:
      "Methanol and high-ethanol fuels are dry and can starve pumps and injectors of lubrication. This upper-cylinder lubricant restores lubricity to protect fuel-system components in alcohol setups.",
    specs: [
      { label: "For", value: "Methanol and E85/E100" },
      { label: "Dose", value: "1-2% by volume" },
      { label: "Form", value: "Liquid" },
      { label: "Protects", value: "Pumps, injectors, seals" },
    ],
    applications: ["Methanol engines", "E85 and E100", "Alcohol drag"],
    variants: [
      { size: "1L", sku: "OX-UCL-1", price: 280, stock: 95 },
      { size: "5L", sku: "OX-UCL-5", price: 1180, stock: 30 },
    ],
  },
  {
    slug: "fuel-system-cleaner",
    name: "Octax Fuel System Cleaner",
    category: "additives",
    short: "Detergent treatment to clear injectors and restore spray pattern.",
    description:
      "A strong detergent treatment that clears injector deposits and restores spray pattern between race weekends, so fuelling stays crisp and repeatable.",
    specs: [
      { label: "Treats", value: "Up to 60L per bottle" },
      { label: "Form", value: "Liquid" },
      { label: "Use", value: "Every few tanks" },
      { label: "Safe for", value: "Petrol and E85 systems" },
    ],
    applications: ["Maintenance", "Injector cleaning", "Between events"],
    variants: [{ size: "500ml", sku: "OX-FSC-500", price: 180, stock: 140 }],
  },
  {
    slug: "valve-saver-lead-substitute",
    name: "Octax Valve Saver Lead Substitute",
    category: "additives",
    short: "Valve-seat protection for older engines run on unleaded fuel.",
    description:
      "A lead-substitute additive that protects unhardened valve seats in classic and older race engines when running on unleaded fuel, guarding against valve-seat recession.",
    specs: [
      { label: "Protects", value: "Unhardened valve seats" },
      { label: "Treats", value: "Up to 100L per bottle" },
      { label: "Form", value: "Liquid" },
      { label: "For", value: "Classic and vintage engines" },
    ],
    applications: ["Classic race engines", "Historic motorsport", "Unleaded conversion"],
    variants: [{ size: "250ml", sku: "OX-VS-250", price: 210, stock: 75 }],
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
