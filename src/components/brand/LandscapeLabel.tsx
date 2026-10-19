import type { Product } from "@/lib/products";
import { wrap } from "@/lib/pack";
import { WordmarkWithMark, wordmarkWidth, Halftone } from "./Wordmark";
import { PictogramRow } from "./Pictograms";
import { labelContact } from "./BrandLabel";

// Landscape artwork master, independent of a final physical label size.
// Approved SDS details must be completed before production.
export function LandscapeLabel({product,ownerLogo}:{product:Product;ownerLogo:string}){
  const l=product.label;
  const title=l.highlight?`${l.title} ${l.highlight}`:l.title;
  const titleSize=title.length>15?65:84;
  const markScale=600/wordmarkWidth(l.mark);
  return <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 1600 1000" width="1600" height="1000" role="img" aria-label={`${product.name} landscape label artwork`}>
    <rect width="1600" height="1000" fill="var(--color-paper)"/>
    <rect x="4" y="4" width="1592" height="992" fill="none" stroke="var(--color-ink)" strokeWidth="8"/>
    <rect x="20" y="20" width="1560" height="25" fill="var(--color-ink)"/>
    <rect x="20" y="955" width="1560" height="25" fill="var(--color-ink)"/>
    {Array.from({length:46},(_,i)=><g key={i} fill="var(--color-lime)"><path d={`M${i*36+22} 20 l-14 25 h15 l14-25Z`}/><path d={`M${i*36+22} 955 l-14 25 h15 l14-25Z`}/></g>)}
    <g transform={`translate(62 87) scale(${markScale})`}><WordmarkWithMark mark={l.mark}/></g>
    <text x="62" y="328" fontFamily="Arial" fontSize="39" fontWeight="bold" fontStyle="italic" fill="var(--color-ink)">FUEL THE ADDICTION</text>
    <Halftone x={1040} y={90} cols={12} rows={16} step={13} color="var(--color-lime)"/>
    {l.badge&&<g><rect x="690" y="150" width="250" height="96" fill="var(--color-lime)" stroke="var(--color-ink)" strokeWidth="4"/><text x="815" y="226" textAnchor="middle" fontFamily="Arial" fontSize="76" fontWeight="bold" fontStyle="italic" fill="var(--color-ink)">{l.badge}</text></g>}
    <image href={ownerLogo} x="1225" y="100" width="290" height="117" preserveAspectRatio="xMidYMid meet" style={{mixBlendMode:"multiply"}}/>
    <text x="1530" y="266" textAnchor="end" fontFamily="Arial" fontSize="20" fontWeight="bold" fill="var(--color-ink)">ZRG-X (PTY) LTD</text>
    <text x="1530" y="294" textAnchor="end" fontFamily="Arial" fontSize="16" fill="var(--color-ink)">REG. 2026/667453/07</text>
    <path d="M62 357H1538" stroke="var(--color-ink)" strokeWidth="4"/>
    <text x="62" y="452" fontFamily="Arial" fontSize={titleSize} fontWeight="bold" fill="var(--color-ink)">{title}</text>
    <text x="66" y="495" fontFamily="Arial" fontSize="24" fontWeight="bold" fill="var(--color-flare)">FOR PERFORMANCE USE</text>
    <rect x="1120" y="388" width="418" height="374" fill="var(--color-panel)" stroke="var(--color-ink)" strokeWidth="3"/>
    <rect x="1120" y="388" width="418" height="50" fill="var(--color-ink)"/>
    <text x="1329" y="422" textAnchor="middle" fontFamily="Arial" fontWeight="bold" fontSize="24" fill="var(--color-lime)">HANDLE WITH CARE</text>
    <PictogramRow items={l.pictograms} x={1140} y={463} width={378} size={71}/>
    {l.un?<><text x="1145" y="615" fontFamily="Arial" fontSize="39" fontWeight="bold" fill="var(--color-ink)">{l.un}</text><text x="1145" y="655" fontFamily="Arial" fontSize="26" fontWeight="bold" fill="var(--color-ink)">{l.hazardClass}</text><text x="1145" y="698" fontFamily="Arial" fontSize="20" fill="var(--color-ink)">Keep away from heat and ignition.</text></>:<><text x="1145" y="615" fontFamily="Arial" fontSize="23" fontWeight="bold" fill="var(--color-ink)">FOLLOW THE PRODUCT SDS</text><text x="1145" y="655" fontFamily="Arial" fontSize="20" fill="var(--color-ink)">Keep sealed and out of reach</text><text x="1145" y="682" fontFamily="Arial" fontSize="20" fill="var(--color-ink)">of children.</text></>}
    <text x="1145" y="733" fontFamily="Arial" fontSize="17" fill="var(--color-ink)">Consult approved handling instructions.</text>
    {l.mix?<g><text x="65" y="547" fontFamily="Arial" fontSize="22" fontWeight="bold" fill="var(--color-ink)">{l.mix.lead}</text>{l.mix.rows.map((r,i)=><g key={r.ratio}><rect x={65+(i%2)*505} y={570+Math.floor(i/2)*63} width="476" height="51" fill="var(--color-lime)"/><text x={81+(i%2)*505} y={605+Math.floor(i/2)*63} fontFamily="Arial" fontSize="27" fontWeight="bold" fill="var(--color-ink)">{r.ratio} / {r.text}</text></g>)}</g>:<g>{wrap(product.short,66,3).map((line,i)=><text key={i} x="65" y={554+i*35} fontFamily="Arial" fontSize="26" fill="var(--color-ink)">{line}</text>)}{l.lines?.map((line,i)=><text key={line} x="65" y={654+i*32} fontFamily="Arial" fontSize="22" fontWeight="bold" fill="var(--color-ink)">{line}</text>)}</g>}
    <g fontFamily="Arial" fill="var(--color-ink)"><text x="65" y="749" fontSize="20" fontWeight="bold">NET CONTENTS</text><rect x="255" y="718" width="220" height="44" fill="none" stroke="var(--color-ink)" strokeWidth="2"/><text x="514" y="749" fontSize="20" fontWeight="bold">MFD</text><rect x="575" y="718" width="214" height="44" fill="none" stroke="var(--color-ink)" strokeWidth="2"/><text x="822" y="749" fontSize="20" fontWeight="bold">BATCH</text><rect x="910" y="718" width="182" height="44" fill="none" stroke="var(--color-ink)" strokeWidth="2"/></g>
    <path d="M62 790H1538" stroke="var(--color-ink)" strokeWidth="3"/>
    {wrap(l.disclaimer,126,4).map((line,i)=><text key={i} x="65" y={823+i*25} fontFamily="Arial" fontSize="17" fill="var(--color-ink)">{line}</text>)}
    <text x="65" y="933" fontFamily="Arial" fontSize="24" fontWeight="bold" fill="var(--color-ink)">CONTACT: {labelContact()}</text>
  </svg>;
}
