// Small test-only loader for the application's pure TypeScript modules.
import {readFileSync} from "node:fs";
import {resolve,dirname} from "node:path";
import {createRequire} from "node:module";
import ts from "typescript";
import * as site from "../site.config.mjs";
const require=createRequire(import.meta.url),cache=new Map();
export function loadTs(path) {
  const file=resolve(path); if(cache.has(file)) return cache.get(file);
  const exports={};cache.set(file,exports);
  const code=ts.transpileModule(readFileSync(file,"utf8"),{compilerOptions:{module:ts.ModuleKind.CommonJS,target:ts.ScriptTarget.ES2022,esModuleInterop:true,jsx:ts.JsxEmit.ReactJSX}}).outputText;
  const moduleRequire=name=>{
    if(name==="../site"||name==="@/lib/site"||file.endsWith("src\\lib\\site.ts")&&name.includes("site.config"))return site;
    if(name.startsWith(".")) return loadTs(resolve(dirname(file),name.replace(/\.ts$/,"")+".ts"));
    if(name.startsWith("@/"))return loadTs(resolve("src",name.slice(2)+".ts"));
    return require(name);
  };
  new Function("exports","require",code)(exports,moduleRequire);return exports;
}
