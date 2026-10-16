import type { Product } from "@/lib/products";
import { wrap } from "@/lib/pack";
import { LABEL_LIME, OctaLetters, Performance, WordmarkWithMark, wordmarkWidth } from "./Wordmark";
import { PictogramRow } from "./Pictograms";

// Vector rebuild of the supplied OCTA product labels. OCTA-X and OCTA-M share
// the 2:3 layout (they differ in where the UN line sits and in the pictogram
// count); OCTA-BOOST, OCTA-SHOT and OCTA-TORQUE use the taller 9:16 layout,
// with the mix table when there is one and descriptor lines otherwise.

const INK = "var(--color-ink)";
export const LABEL_PAPER = "oklch(0.975 0.016 98)";
const MUTED_LIME = "oklch(0.74 0.09 118)";
const LABEL_FONT = "var(--font-label), sans-serif";

const cond = (weight: number, italic = false) => ({
  fontFamily: LABEL_FONT,
  fontWeight: weight,
  fontStyle: italic ? "italic" : "normal",
});

export function labelSize(product: Product): { w: number; h: number } {
  return product.label.layout === "tall" ? { w: 360, h: 660 } : { w: 400, h: 600 };
}

/** Hazard-stripe frame, bracket lines and black X corners shared by every label. */
function Frame({ w, h }: { w: number; h: number }) {
  const bars: React.ReactElement[] = [];
  // Top and bottom: slanted bars.
  for (let x = 74; x < w - 80; x += 22) {
    bars.push(<path key={`t${x}`} d={`M${x} 26 L${x + 10} 10 H${x + 20} L${x + 10} 26 Z`} />);
    bars.push(<path key={`b${x}`} d={`M${x} ${h - 10} L${x + 10} ${h - 26} H${x + 20} L${x + 10} ${h - 10} Z`} />);
  }
  // Left and right: slanted ticks down the edges.
  for (let y = 170; y < h - 130; y += 22) {
    bars.push(<path key={`l${y}`} d={`M10 ${y + 12} L22 ${y} V${y + 9} L10 ${y + 21} Z`} />);
    bars.push(<path key={`r${y}`} d={`M${w - 22} ${y + 12} L${w - 10} ${y} V${y + 9} L${w - 22} ${y + 21} Z`} />);
  }

  const cornerX = (cx: number, cy: number) => (
    <path d={`M${cx - 8} ${cy - 8} L${cx + 8} ${cy + 8} M${cx + 8} ${cy - 8} L${cx - 8} ${cy + 8}`} stroke={LABEL_LIME} strokeWidth="3.2" />
  );

  return (
    <g>
      <rect width={w} height={h} fill={LABEL_PAPER} />
      <g fill={LABEL_LIME}>{bars}</g>

      {/* Top-left black corner with X */}
      <path d="M4 4 H58 V26 H26 V150 H4 Z" fill={INK} />
      {cornerX(24, 24)}
      {/* Top-right lime corner and bracket */}
      <path d={`M${w - 76} 4 H${w - 4} V76 H${w - 22} V22 H${w - 76} Z`} fill={LABEL_LIME} />
      <path d={`M${w - 104} 40 H${w - 36} V70`} fill="none" stroke={INK} strokeWidth="2.6" />
      {/* Bottom-left lime corner and bracket */}
      <path d={`M4 ${h - 76} V${h - 4} H76 V${h - 22} H22 V${h - 76} Z`} fill={LABEL_LIME} />
      <path d={`M26 ${h - 118} V${h - 36} H92`} fill="none" stroke={INK} strokeWidth="2.6" />
      {/* Bottom-right black corner with X */}
      <path d={`M${w - 4} ${h - 4} H${w - 58} V${h - 26} H${w - 26} V${h - 150} H${w - 4} Z`} fill={INK} />
      {cornerX(w - 24, h - 24)}

      <rect x="2" y="2" width={w - 4} height={h - 4} fill="none" stroke={INK} strokeWidth="2.5" />
    </g>
  );
}

/** Alcohol chain doodle (zig-zag ending in OH) beside the product mark. */
function Chain({ x, y }: { x: number; y: number }) {
  return (
    <g transform={`translate(${x} ${y})`}>
      <path d="M0 18 L12 6 L24 18 L36 6 L48 18 L58 8" fill="none" stroke={INK} strokeWidth="2" strokeLinejoin="round" />
      <text x="56" y="10" style={{ fontFamily: "var(--font-sans), sans-serif", fontWeight: 600 }} fontSize="15" fill={INK}>
        OH
      </text>
    </g>
  );
}

function MfdBatch({ y, w }: { y: number; w: number }) {
  const mid = w / 2;
  return (
    <g>
      <text x={46} y={y + 15} style={cond(600)} fontSize="15" fill={INK}>MFD:</text>
      <rect x={82} y={y} width={mid - 102} height="20" fill="none" stroke={INK} strokeWidth="2" />
      <text x={mid + 4} y={y + 15} style={cond(600)} fontSize="15" fill={INK}>BATCH:</text>
      <rect x={mid + 52} y={y} width={mid - 96} height="20" fill="none" stroke={INK} strokeWidth="2" />
      <text x={mid} y={y + 40} textAnchor="middle" style={cond(600)} fontSize="10.5" fill={INK}>
        FOR TRACEABILITY — WRITE WITH MARKER
      </text>
    </g>
  );
}

function Disclaimer({ text, y, x, maxChars, size, center }: {
  text: string;
  y: number;
  x: number;
  maxChars: number;
  size: number;
  center?: boolean;
}) {
  return (
    <g>
      {wrap(text, maxChars, 7).map((line, i) => (
        <text
          key={i}
          x={x}
          y={y + i * (size + 2.6)}
          textAnchor={center ? "middle" : "start"}
          style={cond(500)}
          fontSize={size}
          fill={INK}
        >
          {line}
        </text>
      ))}
    </g>
  );
}

function Tagline({ y, x, width, size }: { y: number; x: number; width: number; size: number }) {
  return (
    <text x={x} y={y} textLength={width} lengthAdjust="spacingAndGlyphs" style={cond(800, true)} fontSize={size} fill={INK}>
      FUEL THE ADDICTION
    </text>
  );
}

/** 2:3 label for OCTA-X (ethanol) and OCTA-M (methanol). */
function AlcoholLabel({ product }: { product: Product }) {
  const l = product.label;
  const W = 400;
  const H = 600;
  const markW = wordmarkWidth(l.mark) + (l.chain ? 46 : 0);
  const s = 322 / markW;
  const above = l.unPlacement === "above";

  return (
    <g>
      <Frame w={W} h={H} />

      <g transform={`translate(${(W - markW * s) / 2} 74) scale(${s})`}>
        <WordmarkWithMark mark={l.mark} cut={LABEL_PAPER} />
        {l.chain && <Chain x={346} y={18} />}
      </g>

      <Tagline x={38} y={232} width={324} size={56} />

      {above ? (
        <>
          <text x={40} y={274} style={cond(600)} fontSize="24" fill={INK}>{l.un}</text>
          <text x={40} y={298} style={cond(600)} fontSize="24" fill={INK}>{l.hazardClass}</text>
          <text x={364} y={352} textAnchor="end" style={cond(800, true)} fontSize="54" fill={INK}>
            {l.title}
            {l.highlight && <tspan fill={MUTED_LIME}> {l.highlight}</tspan>}
          </text>
        </>
      ) : (
        <>
          <text x={W / 2} y={298} textAnchor="middle" style={cond(800, true)} fontSize={l.highlight ? 52 : 60} fill={INK}>
            {l.title}
            {l.highlight && <tspan fill={MUTED_LIME}> {l.highlight}</tspan>}
          </text>
          <text x={W / 2} y={324} textAnchor="middle" style={cond(600)} fontSize="21" fill={INK}>
            {l.un} {l.hazardClass}
          </text>
        </>
      )}

      {above ? (
        <>
          <PictogramRow items={l.pictograms} x={30} y={368} width={340} size={58} />
          <Disclaimer text={l.disclaimer} x={52} y={454} maxChars={62} size={11.2} />
          <MfdBatch y={522} w={W} />
        </>
      ) : (
        <>
          <PictogramRow items={l.pictograms} x={26} y={342} width={348} size={54} />
          <MfdBatch y={414} w={W} />
          <Disclaimer text={l.disclaimer} x={W / 2} y={486} maxChars={70} size={10.4} center />
        </>
      )}
    </g>
  );
}

/** 9:16 label for the jug and bottle products. */
function BoostLabel({ product }: { product: Product }) {
  const l = product.label;
  const W = 360;
  const H = 660;
  const markW = wordmarkWidth(l.mark);
  const s = 292 / markW;

  return (
    <g>
      <Frame w={W} h={H} />

      <g transform={`translate(${(W - markW * s) / 2} 78) scale(${s})`}>
        <WordmarkWithMark mark={l.mark} cut={LABEL_PAPER} />
      </g>

      <Tagline x={36} y={206} width={288} size={50} />

      {l.mix && (
        <g>
          <text x={W / 2} y={242} textAnchor="middle" style={cond(600)} fontSize="18.5" fill={INK}>
            {l.mix.lead}
          </text>
          {l.mix.rows.map((r, i) => (
            <g key={r.ratio}>
              <text x={142} y={272 + i * 27} textAnchor="end" style={cond(600)} fontSize="22" fill={MUTED_LIME}>
                {r.ratio}
              </text>
              <text x={154} y={272 + i * 27} style={cond(600)} fontSize="22" fill={INK}>
                {r.text}
              </text>
            </g>
          ))}
        </g>
      )}

      {!l.mix && l.lines && (
        <g>
          {l.lines.map((line, i) => (
            <text
              key={line}
              x={W / 2}
              y={262 + i * 34}
              textAnchor="middle"
              style={cond(i === 0 ? 800 : 600, i === 0)}
              fontSize={i === 0 ? 30 : 22}
              fill={i === 0 ? INK : MUTED_LIME}
            >
              {line}
            </text>
          ))}
        </g>
      )}

      <text x={W / 2} y={384} textAnchor="middle" style={cond(800, true)} fontSize="40" fill={INK}>
        {l.title}
        {l.highlight && <tspan fill={MUTED_LIME}>{l.highlight}</tspan>}
      </text>
      {l.un && (
        <text x={W / 2} y={410} textAnchor="middle" style={cond(600)} fontSize="18" fill={INK}>
          {l.un} {l.hazardClass}
        </text>
      )}

      <PictogramRow items={l.pictograms} x={30} y={448} width={300} size={54} />
      <Disclaimer text={l.disclaimer} x={W / 2} y={528} maxChars={56} size={10.4} center />
      <MfdBatch y={590} w={W} />
    </g>
  );
}

export function BrandLabel({ product }: { product: Product }) {
  return product.label.layout === "tall" ? <BoostLabel product={product} /> : <AlcoholLabel product={product} />;
}

/** Standalone label as an HTML-embeddable SVG (product page). */
export function LabelArtwork({ product, className }: { product: Product; className?: string }) {
  const { w, h } = labelSize(product);
  return (
    <svg viewBox={`0 0 ${w} ${h}`} className={className} role="img" aria-label={`${product.name} product label`}>
      <BrandLabel product={product} />
    </svg>
  );
}

// Re-exported for the site logo and favicon work.
export { OctaLetters, Performance };
