import "./env.mjs";
import assert from "node:assert/strict";
import { readFileSync, readdirSync, existsSync } from "node:fs";
import { join } from "node:path";
import { fileURLToPath } from "node:url";
import sharp from "sharp";
import { BASE_PATH, INDEXABLE, absoluteUrl } from "../site.config.mjs";
import { contentPolicy } from "../security.config.mjs";

const root = fileURLToPath(new URL("../out/", import.meta.url));
const canonicalUrls = new Set();
const titles = new Set();
let pages = 0;
let products = 0;
const localPath = (url) => {
  const parsed = new URL(url);
  assert.ok(parsed.href.startsWith(absoluteUrl("/")), `Foreign site URL: ${url}`);
  return join(root, parsed.pathname.slice(BASE_PATH.length));
};
async function walk(dir) {
  for (const entry of readdirSync(dir, { withFileTypes: true })) {
    const path = join(dir, entry.name);
    if (entry.isDirectory()) { await walk(path); continue; }
    if (!entry.name.endsWith(".html")) continue;
    const html = readFileSync(path, "utf8");
    const policy = /http-equiv="Content-Security-Policy" content="([^"]+)"/.exec(html)?.[1];
    assert.equal(policy, contentPolicy(html, process.env.NEXT_PUBLIC_SUPABASE_URL || ""), `Missing or changed script hashes: ${path}`);
    assert.ok(html.indexOf('http-equiv="Content-Security-Policy"') < html.indexOf("<script"));
    const title = /<title>(.*?)<\/title>/.exec(html)?.[1];
    assert.ok(title, `Missing title: ${path}`);
    const robots = /name="robots" content="([^"]+)"/.exec(html)?.[1] || "";
    const canonical = /rel="canonical" href="([^"]+)"/.exec(html)?.[1];
    const notFound = /(?:\\|\/)404(?:\.html|(?:\\|\/)index.html)$/.test(path);
    const privatePage = /(?:\\|\/)(?:admin|account|cart|checkout)(?:\\|\/)/.test(path);
    if (!INDEXABLE || privatePage || notFound) assert.match(robots, /noindex/, `Page must remain noindex: ${path}`);
    if (!notFound) {
      assert.ok(canonical, `Missing canonical: ${path}`);
      assert.ok(!canonicalUrls.has(canonical), `Duplicate canonical: ${canonical}`);
      assert.ok(!titles.has(title), `Duplicate title: ${title}`);
      canonicalUrls.add(canonical); titles.add(title);
      const file = localPath(canonical);
      assert.ok(existsSync(join(file, "index.html")), `Canonical target does not exist: ${canonical}`);
      assert.match(html, /name="description" content="[^"]+"/);
      const image = /property="og:image" content="([^"]+)"/.exec(html)?.[1];
      assert.ok(image, `Missing social image: ${path}`);
      const dimensions = await sharp(localPath(image)).metadata();
      assert.equal(dimensions.width, 1200); assert.equal(dimensions.height, 630);
    }
    for (const [, json] of html.matchAll(/<script[^>]*type="application\/ld\+json"[^>]*>([\s\S]*?)<\/script>/g)) {
      const data = JSON.parse(json);
      if (data["@type"] !== "Product") continue;
      products++;
      assert.ok(data.offers.length && data.offers.every((offer) => Number(offer.price) > 0 && offer.priceCurrency === "ZAR" && offer.availability === "https://schema.org/BackOrder"));
      assert.ok(!data.aggregateRating && !data.review, "Do not publish invented reviews");
      for (const image of data.image) assert.ok(existsSync(localPath(image)));
    }
    pages++;
  }
}
await walk(root);
const sitemap = readFileSync(join(root, "sitemap.xml"), "utf8");
assert.doesNotMatch(sitemap, /\/(admin|account|cart|checkout)\//);
for (const [, url] of sitemap.matchAll(/<loc>([^<]+)<\/loc>/g)) assert.ok(canonicalUrls.has(url), `Sitemap URL lacks a matching page: ${url}`);
assert.equal(products, 5);
const agents = readFileSync(join(root,"agents/index.html"),"utf8");
assert.ok(agents.includes("Review application") && agents.includes("/agents/"),"Missing reseller route/form");
const sheets = JSON.parse(readFileSync(new URL("../src/data/technical-sheets.json", import.meta.url), "utf8"));
const information = readFileSync(join(root, "information/index.html"), "utf8");
for (const sheet of sheets) {
  const pdf = `data-sheets/${sheet.slug}-technical-data-sheet.pdf`;
  assert.ok(readFileSync(join(root, pdf)).subarray(0, 5).equals(Buffer.from("%PDF-")), `Missing PDF: ${pdf}`);
  assert.ok(existsSync(join(root, `data-sheets/${sheet.slug}-preview.webp`)));
  const product = readFileSync(join(root, "shop", sheet.slug, "index.html"), "utf8");
  assert.ok(product.includes(pdf) && information.includes(pdf), `Missing product/information PDF link: ${sheet.slug}`);
}
console.log(`Verified ${pages} exported pages: exact CSP hashes, indexing rules, unique titles/canonicals, social images, product data and public sitemap.`);
