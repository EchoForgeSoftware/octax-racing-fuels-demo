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
const FLARE = "#e8451f";

const iconSvg = (size) => `
<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 48 48" width="${size}" height="${size}">
  <rect width="48" height="48" rx="6" fill="${LIME}"/>
  <path d="M16 15 L25 24 L16 33 M32 15 L23 24 L32 33" fill="none" stroke="${INK}" stroke-width="3.5" stroke-linecap="round" stroke-linejoin="round"/>
</svg>`;

const stripe = Array.from({ length: 60 }, (_, i) => {
  const x = i * 28 - 200;
  return `<rect x="${x}" y="0" width="14" height="46" transform="skewX(-30)" fill="${INK}"/>`;
}).join("");

const ogSvg = `
<svg xmlns="http://www.w3.org/2000/svg" width="1200" height="630" viewBox="0 0 1200 630">
  <rect width="1200" height="630" fill="${PAPER}"/>
  <g>${stripe}</g>
  <rect x="0" y="584" width="1200" height="46" fill="${LIME}"/>
  <text x="72" y="150" font-family="Arial, sans-serif" font-size="24" font-weight="700" letter-spacing="6" fill="${INK}">RACE FUELS // METHANOL // ETHANOL</text>
  <text x="68" y="300" font-family="Arial Black, Arial, sans-serif" font-size="128" font-weight="900" fill="${INK}">OCTAX</text>
  <text x="72" y="410" font-family="Arial Black, Arial, sans-serif" font-size="96" font-weight="900" fill="${INK}">RACING <tspan fill="${FLARE}">FUELS</tspan></text>
  <text x="72" y="500" font-family="Arial, sans-serif" font-size="30" fill="${INK}">High-octane fuel, engineered for the grid.</text>
  <g transform="translate(940 96)">
    <rect x="0" y="0" width="180" height="52" fill="${FLARE}"/>
    <text x="90" y="35" text-anchor="middle" font-family="Arial, sans-serif" font-size="26" font-weight="700" letter-spacing="4" fill="${PAPER}">DEMO</text>
  </g>
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
