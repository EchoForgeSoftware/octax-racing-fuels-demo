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

This is a demonstration e-commerce site; no real orders are placed.

## Main pages
- [Home](${u("/")}): Overview of OCTA Performance and its products.
- [Shop](${u("/shop/")}): The OCTA range: ethanol, methanol and octane booster.
- [Information](${u("/information/")}): Product guide, mix ratios, safe handling and delivery.
- [Contact](${u("/contact/")}): Enquiries about products, orders and delivery.

## Products
- [OCTA-X Ethanol 96%](${u("/shop/octa-x-ethanol/")}): Ethanol for performance use. UN 1170, Class 3.
- [OCTA-M Methanol 100%](${u("/shop/octa-m-methanol/")}): Methanol for performance use. UN 1230, Class 3.
- [OCTA-BOOST](${u("/shop/octa-boost/")}): Octane booster for 95 octane pump fuel, 1:7 to 1:4, 5L. UN 1170, Class 3.
- [OCTA-SHOT](${u("/shop/octa-shot/")}): Fuel octane booster, 500ml.
- [OCTA-TORQUE](${u("/shop/octa-torque/")}): Diesel improver, 500ml.

Prices are in ZAR, include VAT and exclude courier.

OCTA Performance is a brand of ${SITE.legalName}.

## Notes
- Built and maintained by Echo Software (https://echosoftware.co.za).
`;

writeFileSync(join(publicDir, "llms.txt"), content, "utf8");
console.log("Generated public/llms.txt");
