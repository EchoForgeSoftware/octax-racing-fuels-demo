import { fileURLToPath } from "node:url";
import { dirname, join } from "node:path";
import { mkdirSync } from "node:fs";
import sharp from "sharp";
import pngToIco from "png-to-ico";

const __dirname = dirname(fileURLToPath(import.meta.url));
const root = join(__dirname, "..");
const appDir = join(root, "src", "app");
const ogDir = join(root, "public", "og");
mkdirSync(ogDir, { recursive: true });

const BRAND = "#ff6a1a";
const BG = "#0a0a0b";

const iconSvg = (size) => `
<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 48 48" width="${size}" height="${size}">
  <rect width="48" height="48" rx="10" fill="${BG}"/>
  <path d="M24 7 38 15v18L24 41 10 33V15z" fill="none" stroke="${BRAND}" stroke-width="2.5" stroke-linejoin="round"/>
  <path d="M18 17 L25 24 L18 31 M30 17 L23 24 L30 31" fill="none" stroke="${BRAND}" stroke-width="3" stroke-linecap="round" stroke-linejoin="round"/>
</svg>`;

const ogSvg = `
<svg xmlns="http://www.w3.org/2000/svg" width="1200" height="630" viewBox="0 0 1200 630">
  <rect width="1200" height="630" fill="${BG}"/>
  <g stroke="#ffffff" stroke-opacity="0.05" stroke-width="1">
    ${Array.from({ length: 27 }, (_, i) => `<line x1="${i * 44}" y1="0" x2="${i * 44}" y2="630"/>`).join("")}
    ${Array.from({ length: 15 }, (_, i) => `<line x1="0" y1="${i * 44}" x2="1200" y2="${i * 44}"/>`).join("")}
  </g>
  <circle cx="980" cy="140" r="320" fill="${BRAND}" fill-opacity="0.16"/>
  <g transform="translate(96 150)">
    <path d="M64 0 118 30v60L64 120 10 90V30z" fill="none" stroke="${BRAND}" stroke-width="6" stroke-linejoin="round"/>
    <path d="M40 26 L74 60 L40 94 M88 26 L54 60 L88 94" fill="none" stroke="${BRAND}" stroke-width="7" stroke-linecap="round" stroke-linejoin="round"/>
  </g>
  <rect x="96" y="300" width="70" height="6" fill="${BRAND}"/>
  <text x="96" y="392" font-family="Segoe UI, Arial, sans-serif" font-size="82" font-weight="800" fill="#f6f6f5">Octax Racing Fuels</text>
  <text x="96" y="452" font-family="Segoe UI, Arial, sans-serif" font-size="34" fill="#a6a6b0">Race fuels, methanol, ethanol and additives</text>
  <g transform="translate(96 496)">
    <rect x="0" y="0" width="150" height="42" rx="21" fill="${BRAND}"/>
    <text x="75" y="29" text-anchor="middle" font-family="Segoe UI, Arial, sans-serif" font-size="22" font-weight="700" fill="${BG}">DEMO</text>
  </g>
</svg>`;

async function main() {
  // apple-icon 180x180
  await sharp(Buffer.from(iconSvg(180)))
    .resize(180, 180)
    .png()
    .toFile(join(appDir, "apple-icon.png"));

  // favicon.ico from multiple sizes
  const sizes = [16, 32, 48];
  const pngBuffers = await Promise.all(
    sizes.map((s) =>
      sharp(Buffer.from(iconSvg(s))).resize(s, s).png().toBuffer(),
    ),
  );
  const ico = await pngToIco(pngBuffers);
  const { writeFileSync } = await import("node:fs");
  writeFileSync(join(appDir, "favicon.ico"), ico);

  // OG image 1200x630
  await sharp(Buffer.from(ogSvg)).png().toFile(join(ogDir, "default.png"));

  console.log("Generated favicon.ico, apple-icon.png and og/default.png");
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
