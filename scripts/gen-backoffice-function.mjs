// Copies the back-office server code (src/lib/backoffice/server.ts and what it
// imports) into supabase/functions/_shared/app/, adding the ".ts" extensions
// Deno needs. The Edge Function then runs exactly the rules the admin screens
// use. Run by `npm test` (pretest) and before deploying the function.
import { mkdirSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import { dirname, relative, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const root = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const lib = resolve(root, "src/lib");
const out = resolve(root, "supabase/functions/_shared/app");
const IMPORT = /(\bfrom\s+|\bimport\s+)(["'])(\.{1,2}\/[^"']+)\2/g;

rmSync(out, { recursive: true, force: true });
const done = new Set();
function copy(file) {
  if (done.has(file)) return;
  done.add(file);
  const source = readFileSync(file, "utf8");
  const rewritten = source.replace(IMPORT, (_m, kw, q, spec) => {
    const target = resolve(dirname(file), spec.replace(/\.ts$/, "") + ".ts");
    if (!target.startsWith(lib)) throw new Error(`${relative(root, file)} imports ${spec}, outside src/lib`);
    copy(target);
    return `${kw}${q}${spec.replace(/\.ts$/, "")}.ts${q}`;
  });
  if (/from\s+["']@\//.test(rewritten)) throw new Error(`${relative(root, file)} uses an "@/" import; use a relative path for server code`);
  const dest = resolve(out, relative(lib, file));
  mkdirSync(dirname(dest), { recursive: true });
  writeFileSync(dest, `// GENERATED from src/lib/${relative(lib, file).replaceAll("\\", "/")} by scripts/gen-backoffice-function.mjs. Do not edit.\n${rewritten}`);
}
copy(resolve(lib, "backoffice/server.ts"));
console.log(`Copied ${done.size} back-office server files for the Edge Function`);
