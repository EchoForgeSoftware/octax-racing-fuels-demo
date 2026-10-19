import * as siteConfig from "../site.config.mjs";
// High-resolution packaging artwork. PDFs are assembled separately with Python.
import {readFileSync,writeFileSync,mkdirSync,existsSync} from "node:fs";
import {createRequire} from "node:module";
import {dirname,join,resolve} from "node:path";
import {fileURLToPath} from "node:url";
import {runInNewContext} from "node:vm";
import {createElement} from "react";
import {renderToStaticMarkup} from "react-dom/server";
import sharp from "sharp";
import ts from "typescript";
const root=fileURLToPath(new URL("../",import.meta.url));
const nativeRequire=createRequire(import.meta.url);const cache=new Map();
function load(path){if(cache.has(path))return cache.get(path);const exports={};cache.set(path,exports);const code=ts.transpileModule(readFileSync(path,"utf8"),{compilerOptions:{module:ts.ModuleKind.CommonJS,target:ts.ScriptTarget.ES2022,jsx:ts.JsxEmit.ReactJSX,esModuleInterop:true}}).outputText;runInNewContext(code,{exports,require:(name)=>{if(name.endsWith("site.config.mjs"))return siteConfig;if(!name.startsWith(".")&&!name.startsWith("@/"))return nativeRequire(name);const stem=name.startsWith("@/")?join(root,"src",name.slice(2)):resolve(dirname(path),name);const file=[stem,stem+".ts",stem+".tsx"].find(existsSync);if(!file)throw new Error(name);return load(file);}},{filename:path});return exports;}
const {products}=load(join(root,"src/lib/products.ts"));
const {LandscapeLabel}=load(join(root,"src/components/brand/LandscapeLabel.tsx"));
const {ProductShot}=load(join(root,"src/components/pack/ProductShot.tsx"));
const {OctaLogo}=load(join(root,"src/components/brand/Wordmark.tsx"));
const colors={ink:"#191817",paper:"#f2efe6","paper-2":"#e9e5db",panel:"#fffefa",lime:"#c6f24e",flare:"#d52200",cobalt:"#2555c4"};
function srgb(lightness,chroma,hue){const a=chroma*Math.cos(hue*Math.PI/180),b=chroma*Math.sin(hue*Math.PI/180),l=(lightness+.3963377774*a+.2158037573*b)**3,m=(lightness-.1055613458*a-.0638541728*b)**3,s=(lightness-.0894841775*a-1.291485548*b)**3;return "#"+[4.0767416621*l-3.3077115913*m+.2309699292*s,-1.2684380046*l+2.6097574011*m-.3413193965*s,-.0041960863*l-.7034186147*m+1.707614701*s].map(v=>Math.round(Math.max(0,Math.min(1,v<=.0031308?12.92*v:1.055*v**(1/2.4)-.055))*255).toString(16).padStart(2,"0")).join("");}
function svg(component,pack=false){let source=renderToStaticMarkup(component);if(pack)source=source.replace(/(<text[^>]*style="[^"]*font-family:var\(--font-label\)[^"]*"[^>]*font-size=")([\d.]+)(")/g,(_,before,size,after)=>`${before}${Number(size)*0.7}${after}`);return source.replace(/var\(--color-([a-z-]+)\)/g,(_,key)=>colors[key]||"#191817").replace(/oklch\(0\.86 0\.13 122\)/g,"#c6f24e").replace(/oklch\(0\.975 0\.016 98\)/g,"#f8f6ed").replace(/oklch\(0\.74 0\.09 118\)/g,"#a5b56e").replace(/var\(--font-[a-z-]+\)/g,"Arial").replace(/<svg(?![^>]*xmlns)/,'<svg xmlns="http://www.w3.org/2000/svg"').replace(/<text\b([^>]*)>([^<]*)<\/text>/g,(tag,attrs,text)=>{const width=/textLength="([\d.]+)"/.exec(attrs)?.[1],size=/font-size="([\d.]+)"/.exec(attrs)?.[1];if(!width||!size||!text)return tag;return `<text${attrs.replace(/font-size="[\d.]+"/,`font-size="${Math.min(Number(size),Number(width)/(text.length*.66))}"`)}>${text}</text>`;});}
const out=join(root,"output/brand-pack");for(const name of ["labels","product-images","logos"])mkdirSync(join(out,name),{recursive:true});
const logo=svg(createElement(OctaLogo,{}));
writeFileSync(join(out,"logos/octa-performance.svg"),logo);
await sharp(Buffer.from(logo),{density:300}).resize({width:2400}).withMetadata({density:300}).png().toFile(join(out,"logos/octa-performance.png"));
writeFileSync(join(out,"logos/zrg-x-original.png"),readFileSync(join(root,"src/assets/zrg-x-logo.png")));
const ownerLogo=`data:image/png;base64,${readFileSync(join(root,"src/assets/zrg-x-logo.png")).toString("base64")}`;
for(const p of products){
  const source=svg(createElement(LandscapeLabel,{product:p,ownerLogo}));
  writeFileSync(join(out,"labels",`${p.slug}-landscape.svg`),source);
  await sharp(Buffer.from(source),{density:300}).resize(6000,3750).withMetadata({density:600}).png().toFile(join(out,"labels",`${p.slug}-landscape.png`));
  for(const variant of p.variants){
    const picture=svg(createElement(ProductShot,{product:p,variant,frame:"square"}),true).replace(/oklch\(([\d.]+)\s+([\d.]+)\s+([\d.]+)\)/g,(_,l,c,h)=>srgb(Number(l),Number(c),Number(h)));
    const sku=variant.sku.toLowerCase();
    await sharp(Buffer.from(picture),{density:300}).resize(4000,4000).withMetadata({density:300}).png().toFile(join(out,"product-images",`${sku}.png`));
  }
  console.log(`Exported ${p.name}: landscape label + ${p.variants.length} packaging images`);
}
writeFileSync(join(out,"manifest.json"),JSON.stringify(products.map(p=>({slug:p.slug,name:p.name,label:`labels/${p.slug}-landscape.png`,svg:`labels/${p.slug}-landscape.svg`,variants:p.variants.map(v=>({sku:v.sku,file:`product-images/${v.sku.toLowerCase()}.png`}))})),null,2));
