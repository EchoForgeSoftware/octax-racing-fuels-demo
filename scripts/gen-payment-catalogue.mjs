import "./env.mjs";
import { readFileSync, writeFileSync } from "node:fs";
import ts from "typescript";
import { LEGAL } from "../site.config.mjs";

async function source(name) {
  const text = readFileSync(new URL(`../src/lib/${name}.ts`, import.meta.url), "utf8");
  const { outputText } = ts.transpileModule(text, { compilerOptions: { module: ts.ModuleKind.ESNext, target: ts.ScriptTarget.ES2022 } });
  return import(`data:text/javascript;base64,${Buffer.from(outputText).toString("base64")}`);
}
const { products } = await source("products");
const { courierRates } = await source("courierRates");
const catalogue = {
  termsVersion: LEGAL.version,
  items: products.flatMap((p) => p.variants.map((v) => ({ sku: v.sku, slug: p.slug, name: p.name, size: v.size, price: v.price }))),
  courier: courierRates,
};
writeFileSync(new URL("../supabase/functions/_shared/catalogue.json", import.meta.url), JSON.stringify(catalogue, null, 2) + "\n");
console.log("Generated server payment catalogue from storefront prices and courier rates");
