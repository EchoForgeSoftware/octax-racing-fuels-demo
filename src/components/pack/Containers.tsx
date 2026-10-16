import type { Product } from "@/lib/products";
import { BrandLabel, labelSize } from "../brand/BrandLabel";

// Flat livery illustrations of the three OCTA containers, each drawn in its own
// local box (see PACK_SIZE) and placed by ProductShot. Shapes follow the
// supplied container photos; every pack carries the real product label.

const INK = "var(--color-ink)";
const HDPE = "oklch(0.985 0.004 95)";
const HDPE_SHADE = "oklch(0.92 0.008 95)";
const MILK = "oklch(0.9 0.025 95)";
const CAP = "var(--color-flare)";
const STROKE = 3;
const DISPLAY = { fontFamily: "var(--font-display), sans-serif" };

export const PACK_SIZE = {
  can: { w: 210, h: 320 },
  drum: { w: 226, h: 308 },
  jug: { w: 176, h: 310 },
  bottle: { w: 120, h: 250 },
} as const;

type PackProps = { product: Product; volume: string; uid: string };

/** Scale the product label to fit a box on the container, centred horizontally. */
function PlacedLabel({ product, cx, y, maxW, maxH }: {
  product: Product;
  cx: number;
  y: number;
  maxW: number;
  maxH: number;
}) {
  const { w, h } = labelSize(product);
  const s = Math.min(maxW / w, maxH / h);
  return (
    <g transform={`translate(${cx - (w * s) / 2} ${y}) scale(${s})`}>
      <BrandLabel product={product} />
      <rect width={w} height={h} fill="none" stroke={INK} strokeWidth={STROKE / s} />
    </g>
  );
}

function Embossed({ x, y, size, children }: { x: number; y: number; size: number; children: string }) {
  return (
    <g>
      <text x={x + 1} y={y + 1} style={DISPLAY} fontSize={size} fill="#fff">{children}</text>
      <text x={x} y={y} style={DISPLAY} fontSize={size} fill={INK} opacity="0.16">{children}</text>
    </g>
  );
}

function Ribs({ xs, y1, y2 }: { xs: number[]; y1: number; y2: number }) {
  return (
    <g>
      {xs.map((x) => (
        <rect key={x} x={x} y={y1} width="4" height={y2 - y1} rx="2" fill="none" stroke={INK} strokeWidth="1.5" opacity="0.3" />
      ))}
    </g>
  );
}

function ThreadedCap({ x, y, w, h }: { x: number; y: number; w: number; h: number }) {
  const ribs = Array.from({ length: Math.floor(w / 8) - 1 }, (_, i) => x + 8 + i * 8);
  return (
    <g>
      <rect x={x} y={y} width={w} height={h} rx="4" fill={CAP} stroke={INK} strokeWidth={STROKE} />
      {ribs.map((rx) => (
        <line key={rx} x1={rx} y1={y + 5} x2={rx} y2={y + h - 5} stroke={INK} strokeWidth="1.5" opacity="0.4" />
      ))}
      <rect x={x + 3} y={y + 3} width={w - 6} height="4" fill="#fff" opacity="0.3" />
    </g>
  );
}

// Jerry can body: rounded shoulders, side walls, arched base.
const CAN_BODY =
  "M0 82 Q0 40 42 40 H168 Q210 40 210 82 V300 Q210 320 190 320 H138 Q105 311 72 320 H20 Q0 320 0 300 Z";

/** 20/25 L white HDPE jerry can with red cap, after the supplied can photos. */
export function JerryCan({ product, volume, uid }: PackProps) {
  const clip = `${uid}-can`;
  return (
    <g>
      <defs>
        <clipPath id={clip}>
          <path d={CAN_BODY} />
        </clipPath>
      </defs>

      {/* Carry handle, with its grip opening */}
      <path
        d="M46 0 H134 Q150 0 150 16 V50 H30 V16 Q30 0 46 0 Z M58 13 Q50 13 50 21 V29 Q50 36 58 36 H122 Q130 36 130 29 V21 Q130 13 122 13 Z"
        fillRule="evenodd"
        fill={HDPE}
        stroke={INK}
        strokeWidth={STROKE}
        strokeLinejoin="round"
      />
      <rect x="164" y="32" width="28" height="14" fill={HDPE_SHADE} stroke={INK} strokeWidth={STROKE} />
      <ThreadedCap x={157} y={10} w={42} h={26} />

      <path d={CAN_BODY} fill={HDPE} />
      <g clipPath={`url(#${clip})`}>
        {/* Contents showing faintly through the plastic */}
        <rect x="0" y="112" width="210" height="210" fill={MILK} opacity="0.45" />
        <rect x="0" y="40" width="14" height="280" fill={INK} opacity="0.06" />
        <rect x="190" y="40" width="20" height="280" fill={INK} opacity="0.09" />
        <line x1="0" y1="106" x2="210" y2="106" stroke={INK} strokeWidth="2" opacity="0.3" />
        <line x1="0" y1="109" x2="210" y2="109" stroke="#fff" strokeWidth="2" opacity="0.9" />
        <line x1="0" y1="298" x2="210" y2="298" stroke={INK} strokeWidth="2" opacity="0.3" />
        <line x1="0" y1="301" x2="210" y2="301" stroke="#fff" strokeWidth="2" opacity="0.9" />
        <rect x="16" y="56" width="7" height="232" fill="#fff" opacity="0.9" />
      </g>

      <Embossed x={26} y={92} size={26}>{volume}</Embossed>
      <Ribs xs={[172, 180, 188]} y1={70} y2={98} />
      <Ribs xs={[14, 22, 30]} y1={304} y2={316} />
      <rect x="82" y="304" width="46" height="11" rx="2" fill="none" stroke={INK} strokeWidth="1.5" opacity="0.3" />

      <path d={CAN_BODY} fill="none" stroke={INK} strokeWidth={STROKE} strokeLinejoin="round" />

      <PlacedLabel product={product} cx={105} y={116} maxW={128} maxH={176} />
    </g>
  );
}

// 210 L plastic drum: rounded blue HDPE body, two bungs on the lid.
const DRUM_BLUE = "oklch(0.52 0.15 252)";
const DRUM_BODY = "M24 14 H202 Q224 14 224 36 V286 Q224 308 202 308 H24 Q2 308 2 286 V36 Q2 14 24 14 Z";

/** 210 L blue HDPE plastic drum with moulded rolling rings and red bung caps. */
export function Drum({ product, uid }: PackProps) {
  const clip = `${uid}-drum`;
  const ring = (y: number) => (
    <g key={y}>
      <rect x="-1" y={y} width="228" height="14" rx="7" fill={DRUM_BLUE} stroke={INK} strokeWidth="2.5" />
      <line x1="6" y1={y + 10} x2="220" y2={y + 10} stroke={INK} strokeWidth="1.5" opacity="0.18" />
    </g>
  );

  return (
    <g>
      <defs>
        <clipPath id={clip}>
          <path d={DRUM_BODY} />
        </clipPath>
      </defs>

      {/* Bung caps on the lid */}
      <ThreadedCap x={36} y={0} w={34} h={18} />
      <ThreadedCap x={160} y={2} w={26} h={16} />

      <path d={DRUM_BODY} fill={DRUM_BLUE} />
      <g clipPath={`url(#${clip})`}>
        <rect x="2" y="14" width="18" height="294" fill={INK} opacity="0.12" />
        <rect x="196" y="14" width="28" height="294" fill={INK} opacity="0.2" />
        <rect x="24" y="44" width="8" height="236" fill="#fff" opacity="0.35" />
        <rect x="38" y="44" width="3" height="236" fill="#fff" opacity="0.2" />
      </g>
      <path d={DRUM_BODY} fill="none" stroke={INK} strokeWidth={STROKE} strokeLinejoin="round" />

      {/* Moulded top chime and rolling rings */}
      <path d="M8 30 H218" stroke={INK} strokeWidth="2" opacity="0.3" />
      {ring(40)}
      {ring(266)}

      <PlacedLabel product={product} cx={113} y={62} maxW={140} maxH={196} />
    </g>
  );
}

// 5 L jug: integrated handle (with its opening) at top left, neck at top right.
const JUG_BODY =
  "M0 296 V40 Q0 12 28 12 H104 Q118 12 124 24 L130 38 H158 Q176 42 176 62 V296 Q176 310 162 310 H14 Q0 310 0 296 Z";
const JUG_HOLE = "M30 34 H100 Q110 34 110 44 V94 Q110 106 98 106 H30 Q20 106 20 96 V44 Q20 34 30 34 Z";

/** 5 L translucent HDPE jug with moulded grip dots, after the supplied photo. */
export function Jug({ product, volume, uid }: PackProps) {
  const clip = `${uid}-jug`;
  const dots = [];
  for (let row = 0; row < 2; row++) {
    for (let x = 32 + row * 4; x < 104; x += 8) dots.push(<circle key={`${row}-${x}`} cx={x} cy={19 + row * 7} r="1.9" />);
  }

  return (
    <g>
      <defs>
        <clipPath id={clip}>
          <path d={`${JUG_BODY} ${JUG_HOLE}`} clipRule="evenodd" />
        </clipPath>
      </defs>

      {/* Threaded neck and cap */}
      <rect x="136" y="18" width="24" height="24" fill={HDPE_SHADE} stroke={INK} strokeWidth={STROKE} />
      <ThreadedCap x={130} y={0} w={36} h={22} />

      <path d={`${JUG_BODY} ${JUG_HOLE}`} fillRule="evenodd" fill={HDPE} />
      <g clipPath={`url(#${clip})`}>
        <rect x="0" y="124" width="176" height="190" fill={MILK} opacity="0.45" />
        <rect x="0" y="12" width="12" height="300" fill={INK} opacity="0.06" />
        <rect x="158" y="40" width="18" height="272" fill={INK} opacity="0.09" />
        <line x1="0" y1="118" x2="176" y2="118" stroke={INK} strokeWidth="2" opacity="0.3" />
        <line x1="0" y1="121" x2="176" y2="121" stroke="#fff" strokeWidth="2" opacity="0.9" />
        <rect x="8" y="128" width="6" height="168" fill="#fff" opacity="0.9" />
        {/* Inside edge of the handle opening */}
        <path d={JUG_HOLE} fill="none" stroke={INK} strokeWidth="6" opacity="0.08" />
      </g>
      <g fill={INK} opacity="0.28">{dots}</g>

      <path d={`${JUG_BODY} ${JUG_HOLE}`} fillRule="evenodd" fill="none" stroke={INK} strokeWidth={STROKE} strokeLinejoin="round" />

      <PlacedLabel product={product} cx={88} y={128} maxW={124} maxH={168} />
      <Embossed x={128} y={112} size={14}>{volume}</Embossed>
    </g>
  );
}

// 500 ml bottle: shoulders curving into a short neck.
const BOTTLE_BODY =
  "M44 44 H76 C76 60 120 60 120 90 V236 Q120 250 106 250 H14 Q0 250 0 236 V90 C0 60 44 60 44 44 Z";

/** 500 ml white HDPE bottle with red cap, matching the can and jug. */
export function Bottle({ product, volume, uid }: PackProps) {
  const clip = `${uid}-bottle`;
  return (
    <g>
      <defs>
        <clipPath id={clip}>
          <path d={BOTTLE_BODY} />
        </clipPath>
      </defs>

      <rect x="46" y="26" width="28" height="20" fill={HDPE_SHADE} stroke={INK} strokeWidth={STROKE} />
      <ThreadedCap x={38} y={2} w={44} h={28} />

      <path d={BOTTLE_BODY} fill={HDPE} />
      <g clipPath={`url(#${clip})`}>
        <rect x="0" y="96" width="120" height="160" fill={MILK} opacity="0.45" />
        <rect x="0" y="44" width="10" height="210" fill={INK} opacity="0.06" />
        <rect x="104" y="60" width="16" height="194" fill={INK} opacity="0.09" />
        <rect x="8" y="92" width="5" height="140" fill="#fff" opacity="0.9" />
      </g>
      <path d={BOTTLE_BODY} fill="none" stroke={INK} strokeWidth={STROKE} strokeLinejoin="round" />

      <PlacedLabel product={product} cx={60} y={94} maxW={96} maxH={140} />
      <Embossed x={44} y={84} size={11}>{volume}</Embossed>
    </g>
  );
}
