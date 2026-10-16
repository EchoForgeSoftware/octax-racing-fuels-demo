import "./env.mjs";
import { createServer } from "node:http";
import { readFileSync, statSync, realpathSync } from "node:fs";
import { resolve, sep, extname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { securityHeaders } from "../security.config.mjs";
import { BASE_PATH, INDEXABLE } from "../site.config.mjs";

const root = realpathSync(fileURLToPath(new URL("../out/", import.meta.url)));
const types = { ".xlsx": "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet", ".pdf": "application/pdf", ".html": "text/html; charset=utf-8", ".js": "text/javascript; charset=utf-8", ".css": "text/css; charset=utf-8", ".json": "application/json", ".txt": "text/plain; charset=utf-8", ".xml": "application/xml", ".svg": "image/svg+xml", ".png": "image/png", ".ico": "image/x-icon", ".webp": "image/webp", ".woff": "font/woff", ".woff2": "font/woff2", ".jpg": "image/jpeg" };
const server = createServer((request, response) => {
  for (const [name, value] of Object.entries(securityHeaders)) response.setHeader(name, value);
  if (!INDEXABLE) response.setHeader("X-Robots-Tag", "noindex, nofollow");
  if (!["GET", "HEAD"].includes(request.method)) { response.writeHead(405); response.end(); return; }
  try {
    let path = decodeURIComponent(new URL(request.url, "http://127.0.0.1").pathname);
    if (BASE_PATH && (path === "/" || path === BASE_PATH)) { response.writeHead(307, { Location: `${BASE_PATH}/` }); response.end(); return; }
    if (BASE_PATH && !path.startsWith(`${BASE_PATH}/`)) throw new Error("outside mount");
    path = path.slice(BASE_PATH.length);
    const privatePage = /^\/(admin|account|cart|checkout)(\/|$)/.test(path);
    if (privatePage) { response.setHeader("Cache-Control", "no-store"); response.setHeader("X-Robots-Tag", "noindex, nofollow"); response.setHeader("Referrer-Policy", "no-referrer"); }
    let file = resolve(root, "." + path);
    if (!file.startsWith(root + sep) && file !== root) throw new Error("outside root");
    if (statSync(file).isDirectory()) file = join(file, "index.html");
    file = realpathSync(file);
    if (!file.startsWith(root + sep)) throw new Error("outside root");
    response.setHeader("Content-Type", types[extname(file)] || "application/octet-stream");
    if (!privatePage) response.setHeader("Cache-Control", "no-cache");
    const body = readFileSync(file);
    response.writeHead(200);
    response.end(request.method === "HEAD" ? undefined : body);
  } catch {
    response.setHeader("Content-Type", "text/html; charset=utf-8");
    response.setHeader("Cache-Control", "no-store");
    response.setHeader("X-Robots-Tag", "noindex, nofollow");
    response.writeHead(404);
    response.end(request.method === "HEAD" ? undefined : readFileSync(join(root, "404.html")));
  }
});
const port = Number(process.env.PORT || 3000);
server.listen(port, "127.0.0.1", () => console.log(`Production preview: http://127.0.0.1:${port}${BASE_PATH}/`));
