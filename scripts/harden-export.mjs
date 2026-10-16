import "./env.mjs";
import { readdirSync, readFileSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import { fileURLToPath } from "node:url";
import { BASE_PATH, INDEXABLE } from "../site.config.mjs";
import { hardenHtml, securityHeaders } from "../security.config.mjs";

const out = fileURLToPath(new URL("../out/", import.meta.url));
let pages = 0;
function walk(directory) {
  for (const entry of readdirSync(directory, { withFileTypes: true })) {
    const path = join(directory, entry.name);
    if (entry.isDirectory()) walk(path);
    else if (entry.name.endsWith(".html")) {
      writeFileSync(path, hardenHtml(readFileSync(path, "utf8"), process.env.NEXT_PUBLIC_SUPABASE_URL || ""));
      pages++;
    }
  }
}
walk(out);
const rules = ["/*", ...Object.entries(securityHeaders).map(([name, value]) => `  ${name}: ${value}`)];
if (!INDEXABLE) rules.push("  X-Robots-Tag: noindex, nofollow");
for (const route of ["admin", "account", "cart", "checkout"]) {
  for (const path of [`${BASE_PATH}/${route}`, `${BASE_PATH}/${route}/*`]) {
    rules.push("", path, "  Cache-Control: no-store", "  X-Robots-Tag: noindex, nofollow", "  Referrer-Policy: no-referrer");
  }
}
writeFileSync(join(out, "_headers"), rules.join("\n") + "\n");
console.log(`Hardened ${pages} static pages with script hashes and generated hosting headers`);
