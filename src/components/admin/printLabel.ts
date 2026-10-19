// Print label download for products added in the back office: the same
// landscape master as scripts/generate-brand-art.mjs, drawn in the browser and
// saved as a 3000 x 1875 PNG. Loaded only when someone clicks the button.
import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import type { Product } from "@/lib/products";
import { LandscapeLabel } from "../brand/LandscapeLabel";
import zrgLogo from "@/assets/zrg-x-logo.png";

/** OKLCH to sRGB hex, so the picture renders the same everywhere. */
function srgb(lightness: number, chroma: number, hue: number): string {
  const a = chroma * Math.cos((hue * Math.PI) / 180), b = chroma * Math.sin((hue * Math.PI) / 180);
  const l = (lightness + 0.3963377774 * a + 0.2158037573 * b) ** 3;
  const m = (lightness - 0.1055613458 * a - 0.0638541728 * b) ** 3;
  const s = (lightness - 0.0894841775 * a - 1.291485548 * b) ** 3;
  return "#" + [4.0767416621 * l - 3.3077115913 * m + 0.2309699292 * s, -1.2684380046 * l + 2.6097574011 * m - 0.3413193965 * s,
    -0.0041960863 * l - 0.7034186147 * m + 1.707614701 * s].map((v) => {
    const c = v <= 0.0031308 ? 12.92 * v : 1.055 * v ** (1 / 2.4) - 0.055;
    return Math.round(Math.max(0, Math.min(1, c)) * 255).toString(16).padStart(2, "0");
  }).join("");
}
const hex = (color: string) => color.replace(/oklch\(\s*([\d.]+)\s+([\d.]+)\s+([\d.]+)\s*\)/g, (_, l, c, h) => srgb(Number(l), Number(c), Number(h)));

async function asDataUrl(url: string): Promise<string> {
  const blob = await (await fetch(url)).blob();
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(String(reader.result));
    reader.onerror = reject;
    reader.readAsDataURL(blob);
  });
}

export async function downloadPrintLabel(product: Product): Promise<void> {
  const logo = await asDataUrl(typeof zrgLogo === "string" ? zrgLogo : zrgLogo.src);
  const css = getComputedStyle(document.documentElement);
  const svg = hex(renderToStaticMarkup(createElement(LandscapeLabel, { product, ownerLogo: logo }))
    .replace(/var\(--color-([a-z0-9-]+)\)/g, (_, key) => css.getPropertyValue(`--color-${key}`).trim() || "#191817"))
    .replace(/var\(--font-display\)/g, "Arial Black")
    .replace(/var\(--font-[a-z-]+\)/g, "Arial");

  const url = URL.createObjectURL(new Blob([svg], { type: "image/svg+xml" }));
  try {
    const img = new Image();
    await new Promise((resolve, reject) => { img.onload = resolve; img.onerror = reject; img.src = url; });
    const canvas = document.createElement("canvas");
    canvas.width = 3000;
    canvas.height = 1875;
    canvas.getContext("2d")!.drawImage(img, 0, 0, canvas.width, canvas.height);
    const png = await new Promise<Blob | null>((resolve) => canvas.toBlob(resolve, "image/png"));
    if (!png) throw new Error("PNG export failed");
    const link = document.createElement("a");
    link.href = URL.createObjectURL(png);
    link.download = `${product.name.replace(/[^\w %.-]+/g, "").trim() || "OCTA"} label.png`;
    link.click();
    setTimeout(() => URL.revokeObjectURL(link.href), 10000);
  } finally {
    URL.revokeObjectURL(url);
  }
}
