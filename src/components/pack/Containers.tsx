import type { Product } from "@/lib/products";
import { categoryColor, liquidColor } from "@/lib/pack";
import { Label, LABEL_W } from "./Label";

// Flat livery illustrations of the three containers, each drawn in its own
// local box (see PACK_SIZE) and placed by ProductShot. Ink outlines and hard
// highlights match the site's printed-decal look rather than a photo render.

const INK = "var(--color-ink)";
const HDPE = "oklch(0.975 0.008 95)";
const HDPE_SHADE = "oklch(0.9 0.012 95)";
const LIME = "var(--color-lime)";
const STROKE = 3;
const DISPLAY = { fontFamily: "var(--font-display), sans-serif" };

export const PACK_SIZE = {
  can: { w: 210, h: 320 },
  drum: { w: 226, h: 304 },
  bottle: { w: 120, h: 250 },
} as const;

type PackProps = { product: Product; volume: string; uid: string };

// Shared outline of the jerry can body: shoulders, side walls, arched base.
const CAN_BODY =
  "M0 82 Q0 40 42 40 H168 Q210 40 210 82 V300 Q210 320 190 320 H138 Q105 311 72 320 H20 Q0 320 0 300 Z";

/** 20/25 L translucent HDPE jerry can, after the supplied container photos. */
export function JerryCan({ product, volume, uid }: PackProps) {
  const clip = `${uid}-can`;
  const liquid = liquidColor(product);

  return (
    <g>
      <defs>
        <clipPath id={clip}>
          <path d={CAN_BODY} />
        </clipPath>
      </defs>

      {/* Carry handle (behind the body), with its grip opening */}
      <path
        d="M46 0 H134 Q150 0 150 16 V50 H30 V16 Q30 0 46 0 Z M58 13 Q50 13 50 21 V29 Q50 36 58 36 H122 Q130 36 130 29 V21 Q130 13 122 13 Z"
        fillRule="evenodd"
        fill={HDPE}
        stroke={INK}
        strokeWidth={STROKE}
        strokeLinejoin="round"
      />

      {/* Cap and neck on the right shoulder */}
      <rect x="164" y="34" width="28" height="14" fill={HDPE_SHADE} stroke={INK} strokeWidth={STROKE} />
      <rect x="157" y="12" width="42" height="26" rx="4" fill={LIME} stroke={INK} strokeWidth={STROKE} />
      {[165, 173, 181, 189].map((x) => (
        <line key={x} x1={x} y1="17" x2={x} y2="33" stroke={INK} strokeWidth="1.5" opacity="0.55" />
      ))}

      {/* Body, with the fuel showing through the milky plastic */}
      <path d={CAN_BODY} fill={HDPE} />
      <g clipPath={`url(#${clip})`}>
        <rect x="0" y="112" width="210" height="210" fill={liquid} opacity="0.4" />
        <line x1="0" y1="112" x2="210" y2="112" stroke={liquid} strokeWidth="3" opacity="0.9" />
        {/* Side walls fall off into shade */}
        <rect x="0" y="40" width="14" height="280" fill={INK} opacity="0.07" />
        <rect x="190" y="40" width="20" height="280" fill={INK} opacity="0.1" />
        {/* Moulded ridges */}
        <line x1="0" y1="118" x2="210" y2="118" stroke={INK} strokeWidth="2" opacity="0.35" />
        <line x1="0" y1="121" x2="210" y2="121" stroke="#fff" strokeWidth="2" opacity="0.8" />
        <line x1="0" y1="296" x2="210" y2="296" stroke={INK} strokeWidth="2" opacity="0.35" />
        <line x1="0" y1="299" x2="210" y2="299" stroke="#fff" strokeWidth="2" opacity="0.8" />
        {/* Hard highlight down the left wall */}
        <rect x="16" y="56" width="7" height="232" fill="#fff" opacity="0.85" />
      </g>

      {/* Recessed panel with the embossed volume */}
      <rect x="52" y="58" width="106" height="46" rx="7" fill={HDPE_SHADE} stroke={INK} strokeWidth="2" opacity="0.9" />
      <text x="106" y="91" textAnchor="middle" style={DISPLAY} fontSize="24" fill="#fff">
        {volume}
      </text>
      <text x="105" y="90" textAnchor="middle" style={DISPLAY} fontSize="24" fill={INK} opacity="0.22">
        {volume}
      </text>

      <path d={CAN_BODY} fill="none" stroke={INK} strokeWidth={STROKE} strokeLinejoin="round" />

      {/* Label sticker */}
      <g transform="translate(20 132)">
        <Label product={product} volume={volume} />
      </g>
    </g>
  );
}

/** 200 L steel drum. */
export function Drum({ product, volume }: PackProps) {
  const color = categoryColor[product.category];
  const scale = 0.84;
  const lx = (226 - LABEL_W * scale) / 2;

  return (
    <g>
      {/* Body */}
      {/* Black body so the drum stands off its colour slab; hoops and chimes carry the category colour. */}
      <rect x="3" y="10" width="220" height="284" rx="6" fill={INK} stroke={INK} strokeWidth={STROKE} />
      {/* Cylinder shading */}
      <rect x="20" y="12" width="12" height="280" fill="#fff" opacity="0.18" />
      <rect x="38" y="12" width="4" height="280" fill="#fff" opacity="0.12" />
      <rect x="190" y="12" width="31" height="280" fill="#fff" opacity="0.05" />
      {/* Rolling hoops */}
      {[80, 216].map((y) => (
        <g key={y}>
          <rect x="1" y={y} width="224" height="10" rx="2" fill={color} stroke={INK} strokeWidth="2.5" />
          <rect x="1" y={y + 6} width="224" height="4" fill={INK} opacity="0.25" />
        </g>
      ))}
      {/* Top and bottom chimes */}
      <rect x="0" y="2" width="226" height="13" rx="4" fill={color} stroke={INK} strokeWidth={STROKE} />
      <rect x="0" y="289" width="226" height="13" rx="4" fill={color} stroke={INK} strokeWidth={STROKE} />
      <rect x="2" y="9" width="222" height="5" fill={INK} opacity="0.2" />

      <g transform={`translate(${lx} 94) scale(${scale})`}>
        <Label product={product} volume={volume} />
      </g>
    </g>
  );
}

/** 250 ml to 1 L additive bottle in black HDPE with a lime cap. */
export function Bottle({ product, volume, outline }: PackProps & { outline: string }) {
  const scale = 104 / LABEL_W;
  const body =
    "M44 46 H76 C76 62 120 62 120 92 V236 Q120 250 106 250 H14 Q0 250 0 236 V92 C0 62 44 62 44 46 Z";

  return (
    <g>
      <rect x="44" y="30" width="32" height="18" fill={INK} stroke={outline} strokeWidth={STROKE} />
      <rect x="37" y="2" width="46" height="32" rx="4" fill={LIME} stroke={outline === INK ? INK : outline} strokeWidth={STROKE} />
      {[46, 54, 62, 70].map((x) => (
        <line key={x} x1={x} y1="8" x2={x} y2="28" stroke={INK} strokeWidth="1.5" opacity="0.55" />
      ))}
      <path d={body} fill={INK} stroke={outline} strokeWidth={STROKE} strokeLinejoin="round" />
      <rect x="9" y="92" width="6" height="136" fill="#fff" opacity="0.22" />
      <rect x="104" y="92" width="10" height="136" fill="#fff" opacity="0.06" />
      <g transform={`translate(8 116) scale(${scale})`}>
        <Label product={product} volume={volume} />
      </g>
    </g>
  );
}
