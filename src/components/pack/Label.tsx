import type { Product } from "@/lib/products";
import { categoryColor, hazard, labelName, onCategory, productCode, wrap } from "@/lib/pack";

// Livery label, drawn at 170 x 140 and scaled onto each container.
export const LABEL_W = 170;
export const LABEL_H = 140;

const INK = "var(--color-ink)";
const PAPER = "var(--color-panel)";
const LIME = "var(--color-lime)";
const DISPLAY = { fontFamily: "var(--font-display), sans-serif" };
const MONO = { fontFamily: "var(--font-mono), monospace", fontWeight: 700 };

function codeSize(code: string): number {
  // Archivo Black averages ~0.74em per capital; keep the code inside 150 units.
  return Math.min(50, 150 / (code.length * 0.74));
}

function Pictogram({ kind, x, y }: { kind: "flame" | "warning"; x: number; y: number }) {
  // GHS-style diamond: white field, red border, black symbol.
  return (
    <g transform={`translate(${x} ${y})`}>
      <path d="M15 1 L29 15 L15 29 L1 15 Z" fill="#fff" stroke="var(--color-flare)" strokeWidth="2.5" strokeLinejoin="round" />
      {kind === "flame" ? (
        <g fill={INK}>
          <path d="M15 7.5c1 2.4 3.8 3.6 3.8 7.2a3.8 3.8 0 0 1-7.6 0c0-1.7.9-2.7 1.8-3.5 0 1.7.8 2.6 1.8 2.6 0-2.5-.9-4.2.2-6.3z" />
          <rect x="9.5" y="20.5" width="11" height="1.8" />
        </g>
      ) : (
        <g fill={INK}>
          <rect x="13.6" y="7.5" width="2.8" height="9.5" />
          <rect x="13.6" y="19" width="2.8" height="2.8" />
        </g>
      )}
    </g>
  );
}

export function Label({ product, volume }: { product: Product; volume: string }) {
  const color = categoryColor[product.category];
  const onColor = onCategory(product.category);
  const code = productCode(product);
  const spec = product.specs[0];
  const lines = wrap(labelName(product).toUpperCase(), 17);

  return (
    <g>
      <rect width={LABEL_W} height={LABEL_H} fill={PAPER} />

      {/* Brand band */}
      <rect width={LABEL_W} height="22" fill={INK} />
      <rect x="7" y="4" width="14" height="14" fill={LIME} />
      <path d="M10.5 7.5 L14 11 L10.5 14.5 M17.5 7.5 L14 11 L17.5 14.5" stroke={INK} strokeWidth="1.8" fill="none" strokeLinecap="square" />
      <text x="26" y="16" style={DISPLAY} fontSize="12" fill={LIME} letterSpacing="0.5">OCTAX</text>
      <text x={LABEL_W - 7} y="14.5" textAnchor="end" style={MONO} fontSize="5.6" letterSpacing="1.2" fill={PAPER} opacity="0.75">
        RACING FUELS
      </text>

      {/* Colour block with the product code */}
      <path d={`M0 22 H${LABEL_W} V80 L0 93 Z`} fill={color} />
      <text x="9" y="66" style={DISPLAY} fontSize={codeSize(code)} fill={onColor}>
        {code}
      </text>
      {spec && (
        <text x="10" y="82" style={MONO} fontSize="6.2" letterSpacing="1" fill={onColor}>
          {`${spec.label} ${spec.value}`.toUpperCase().slice(0, 30)}
        </text>
      )}

      {/* Descriptor and hazard */}
      {lines.map((l, i) => (
        <text key={l} x="9" y={107 + i * 11} style={DISPLAY} fontSize="9.5" fill={INK}>
          {l}
        </text>
      ))}
      <Pictogram kind={hazard(product)} x={LABEL_W - 37} y={94} />

      {/* Hazard stripe foot with the volume */}
      <g>
        <rect y={LABEL_H - 13} width={LABEL_W} height="13" fill={INK} />
        {/* Stripes start and stop inside the label edges once skewed. */}
        {Array.from({ length: 14 }).map((_, i) => (
          <rect key={i} x={i * 12 + 82} y={LABEL_H - 13} width="5" height="13" transform={`skewX(-30)`} fill={LIME} />
        ))}
        <rect x="6" y={LABEL_H - 19} width="44" height="16" fill={PAPER} stroke={INK} strokeWidth="2" />
        <text x="28" y={LABEL_H - 7.5} textAnchor="middle" style={DISPLAY} fontSize="9" fill={INK}>
          {volume}
        </text>
      </g>

      <rect width={LABEL_W} height={LABEL_H} fill="none" stroke={INK} strokeWidth="2.5" />
    </g>
  );
}
