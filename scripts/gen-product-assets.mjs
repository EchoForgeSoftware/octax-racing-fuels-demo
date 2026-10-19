import * as siteConfig from "../site.config.mjs";
import { readFileSync, writeFileSync, existsSync, mkdirSync } from "node:fs";
import { createRequire } from "node:module";
import { dirname, join, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { runInNewContext } from "node:vm";
import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import sharp from "sharp";
import ts from "typescript";

const root = fileURLToPath(new URL("../", import.meta.url));
const nativeRequire = createRequire(import.meta.url);
const cache = new Map();
function load(path) {
  if (cache.has(path)) return cache.get(path);
  const exports = {}; cache.set(path, exports);
  const code = ts.transpileModule(readFileSync(path, "utf8"), { compilerOptions: {
    module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022, jsx: ts.JsxEmit.ReactJSX, esModuleInterop: true,
  } }).outputText;
  runInNewContext(code, { exports, require: (name) => {
    if (name.endsWith("site.config.mjs")) return siteConfig;
    if (!name.startsWith(".") && !name.startsWith("@/")) return nativeRequire(name);
    const stem = name.startsWith("@/") ? join(root, "src", name.slice(2)) : resolve(dirname(path), name);
    const file = [stem, stem + ".ts", stem + ".tsx"].find(existsSync);
    if (!file) throw new Error(`Asset component dependency not found: ${name}`);
    return load(file);
  } }, { filename: path });
  return exports;
}
const { products } = load(join(root, "src/lib/products.ts"));
const { ProductShot } = load(join(root, "src/components/pack/ProductShot.tsx"));
const { OctaLogo } = load(join(root, "src/components/brand/Wordmark.tsx"));
const colors = { ink: "#191817", paper: "#f2efe6", "paper-2": "#e9e5db", panel: "#fffefa", lime: "#c6f24e", flare: "#d52200", cobalt: "#2555c4" };
// librsvg does not support CSS Color 4 OKLCH. Convert authored colours to sRGB
// for the exported assets while keeping the site's vector source unchanged.
function srgb(lightness, chroma, hue) {
  const a = chroma * Math.cos(hue * Math.PI / 180), b = chroma * Math.sin(hue * Math.PI / 180);
  const l = (lightness + 0.3963377774 * a + 0.2158037573 * b) ** 3;
  const m = (lightness - 0.1055613458 * a - 0.0638541728 * b) ** 3;
  const s = (lightness - 0.0894841775 * a - 1.291485548 * b) ** 3;
  return "#" + [4.0767416621 * l - 3.3077115913 * m + 0.2309699292 * s,
    -1.2684380046 * l + 2.6097574011 * m - 0.3413193965 * s,
    -0.0041960863 * l - 0.7034186147 * m + 1.707614701 * s].map((v) => {
      const value = v <= 0.0031308 ? 12.92 * v : 1.055 * v ** (1 / 2.4) - 0.055;
      return Math.round(Math.max(0, Math.min(1, value)) * 255).toString(16).padStart(2, "0");
    }).join("");
}
function fixedSvg(component) {
  return renderToStaticMarkup(component).replace("<svg ", '<svg xmlns="http://www.w3.org/2000/svg" ')
    .replace(/var\(--color-([a-z-]+)\)/g, (_, name) => colors[name] || "#191817")
    .replace(/oklch\(([\d.]+)\s+([\d.]+)\s+([\d.]+)\)/g, (_, l, c, h) => srgb(Number(l), Number(c), Number(h)))
    .replace(/(<text[^>]*style="[^"]*font-family:var\(--font-label\)[^"]*"[^>]*font-size=")([\d.]+)(")/g, (_, before, size, after) => `${before}${Number(size) * 0.7}${after}`)
    .replace(/var\(--font-[a-z-]+\)/g, "Arial")
    .replace(/<text\b([^>]*)>([^<]*)<\/text>/g, (tag, attrs, text) => {
      const width = /textLength="([\d.]+)"/.exec(attrs)?.[1];
      const size = /font-size="([\d.]+)"/.exec(attrs)?.[1];
      if (!width || !size || !text) return tag;
      const fit = Math.min(Number(size), Number(width) / (text.length * 0.66));
      return `<text${attrs.replace(/font-size="[\d.]+"/, `font-size="${fit}"`)}>${text}</text>`;
    });
}
const productDir = join(root, "public/products");
const ogDir = join(root, "public/og/products");
mkdirSync(productDir, { recursive: true }); mkdirSync(ogDir, { recursive: true });
for (const product of products) {
  const svg = fixedSvg(createElement(ProductShot, { product, frame: "square" }));
  await sharp(Buffer.from(svg)).resize(1000, 1000).png().toFile(join(productDir, `${product.slug}.png`));
  const card = await sharp(Buffer.from(svg)).resize(600, 600).png().toBuffer();
  const name = product.name.replace(/[&<>"']/g, (char) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&apos;" }[char]));
  const words = name.split(" "); const lines = []; let line = "";
  for (const word of words) { if ((line + " " + word).length > 20) { lines.push(line); line = word; } else line = line ? line + " " + word : word; }
  if (line) lines.push(line);
  const label = `<svg width="1200" height="630" xmlns="http://www.w3.org/2000/svg"><rect width="1200" height="630" fill="#f2efe6"/><rect width="18" height="630" fill="#c6f24e"/><text x="65" y="110" font-family="Arial" font-size="25" font-weight="bold" fill="#191817">OCTA PERFORMANCE</text>${lines.map((text, i) => `<text x="65" y="${240 + i * 62}" font-family="Arial" font-size="42" font-weight="bold" fill="#191817">${text}</text>`).join("")}<text x="65" y="545" font-family="Arial" font-size="21" fill="#191817">Fuel the addiction</text></svg>`;
  await sharp(Buffer.from(label)).composite([{ input: card, left: 600, top: 15 }]).png().toFile(join(ogDir, `${product.slug}.png`));
}
await sharp(Buffer.from(fixedSvg(createElement(OctaLogo, {})))).resize({ width: 600 }).png().toFile(join(root, "public/og/logo.png"));
console.log(`Generated ${products.length} product images and social cards from the existing product artwork`);
