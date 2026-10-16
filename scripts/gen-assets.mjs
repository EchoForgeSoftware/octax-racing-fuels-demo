import { fileURLToPath } from "node:url";
import { dirname, join } from "node:path";
import { mkdirSync, writeFileSync } from "node:fs";
import sharp from "sharp";
import pngToIco from "png-to-ico";

const __dirname = dirname(fileURLToPath(import.meta.url));
const root = join(__dirname, "..");
const appDir = join(root, "src", "app");
const ogDir = join(root, "public", "og");
mkdirSync(ogDir, { recursive: true });

const PAPER = "#f2efe6";
const INK = "#191817";
const LIME = "#c6f24e";
const FLARE = "#d52200"; // matches --color-flare

// Favicon: the red rounded-square O from the OCTA wordmark (keep in sync with src/app/icon.svg).
const iconSvg = (size) => `
<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 48 48" width="${size}" height="${size}">
  <rect width="48" height="48" rx="8" fill="${PAPER}"/>
  <path transform="translate(6 6.5) scale(0.5)" fill-rule="evenodd" fill="${FLARE}" d="M18 0 H54 Q72 0 72 18 V52 Q72 70 54 70 H18 Q0 70 0 52 V18 Q0 0 18 0 Z M24 18 Q18 18 18 24 V46 Q18 52 24 52 H48 Q54 52 54 46 V24 Q54 18 48 18 Z"/>
</svg>`;

// OCTA letterforms, mirrored from src/components/brand/Wordmark.tsx.
const letters = `<path fill-rule="evenodd" fill="${FLARE}" d="M18 0 H54 Q72 0 72 18 V52 Q72 70 54 70 H18 Q0 70 0 52 V18 Q0 0 18 0 Z M24 18 Q18 18 18 24 V46 Q18 52 24 52 H48 Q54 52 54 46 V24 Q54 18 48 18 Z"/><path fill="${INK}" d="M142 0 H96 Q80 0 80 16 V54 Q80 70 96 70 H142 V52 H104 Q98 52 98 46 V24 Q98 18 104 18 H142 Z"/><path fill="${INK}" d="M148 0 H206 V18 H186 V70 H168 V18 H148 Z"/><path fill="${INK}" d="M208 70 L245 0 L282 70 Z"/><path fill="${PAPER}" d="M224 70 L245 30 L266 70 Z"/><path fill="${INK}" d="M235 70 L245 51 L255 70 Z"/>`;

const stripe = Array.from({ length: 60 }, (_, i) => {
  const x = i * 28 - 200;
  return `<rect x="${x}" y="0" width="14" height="46" transform="skewX(-30)" fill="${INK}"/>`;
}).join("");

const ogSvg = `
<svg xmlns="http://www.w3.org/2000/svg" width="1200" height="630" viewBox="0 0 1200 630">
  <rect width="1200" height="630" fill="${PAPER}"/>
  <g>${stripe}</g>
  <rect x="0" y="584" width="1200" height="46" fill="${LIME}"/>
  <text x="72" y="124" font-family="Arial, sans-serif" font-size="24" font-weight="700" letter-spacing="6" fill="${INK}">OCTA-X // OCTA-M // OCTA-BOOST</text>
  <text x="336" y="372" font-family="Arial Black, Arial, sans-serif" font-size="250" font-weight="900" fill="${LIME}">X</text>
  <g transform="translate(72 190) scale(1.55)">${letters}</g>
  <text x="76" y="380" font-family="Arial, sans-serif" font-size="30" font-weight="700" letter-spacing="15" fill="${INK}">PERFORMANCE</text>
  <text x="72" y="490" font-family="Arial Black, Arial, sans-serif" font-size="64" font-style="italic" font-weight="900" fill="${INK}">FUEL THE ADDICTION</text>
</svg>`;

async function main() {
  await sharp(Buffer.from(iconSvg(180))).resize(180, 180).png().toFile(join(appDir, "apple-icon.png"));

  const pngBuffers = await Promise.all(
    [16, 32, 48].map((s) => sharp(Buffer.from(iconSvg(s))).resize(s, s).png().toBuffer()),
  );
  writeFileSync(join(appDir, "favicon.ico"), await pngToIco(pngBuffers));

  await sharp(Buffer.from(ogSvg)).png().toFile(join(ogDir, "default.png"));

  console.log("Generated favicon.ico, apple-icon.png and og/default.png");
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
