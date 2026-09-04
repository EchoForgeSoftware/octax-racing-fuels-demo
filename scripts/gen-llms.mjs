import { fileURLToPath } from "node:url";
import { dirname, join } from "node:path";
import { mkdirSync, writeFileSync } from "node:fs";
import { SITE, SITE_URL } from "../site.config.mjs";

const __dirname = dirname(fileURLToPath(import.meta.url));
const publicDir = join(__dirname, "..", "public");
mkdirSync(publicDir, { recursive: true });

const u = (p) => `${SITE_URL}${p}`;

const content = `# ${SITE.name}

> ${SITE.description}

This is a demonstration e-commerce site. Products, prices and stock are sample data
and no real orders are placed.

## Main pages
- [Home](${u("/")}): Overview of Octax Racing Fuels and featured products.
- [Shop](${u("/shop/")}): Full catalogue of race fuels, methanol, ethanol and additives.
- [Information](${u("/information/")}): Fuel selection guide, safe handling and delivery.
- [Contact](${u("/contact/")}): Enquiries about fuel advice, orders and delivery.

## Product categories
- [Race fuels](${u("/shop/?category=race-fuels")}): 102 to 118 octane leaded and unleaded competition fuels.
- [Methanol](${u("/shop/?category=methanol")}): High-purity methanol for methanol-burning engines.
- [Ethanol](${u("/shop/?category=ethanol")}): Anhydrous ethanol and consistent E85 blends.
- [Additives](${u("/shop/?category=additives")}): Octane boosters, lubricants and fuel-system treatments.

## Notes
- Built and maintained by Echo Software (https://echosoftware.co.za).
`;

writeFileSync(join(publicDir, "llms.txt"), content, "utf8");
console.log("Generated public/llms.txt");
