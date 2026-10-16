import type { Pictogram } from "@/lib/products";

// Label safety pictograms in a 60 x 60 box: the GHS flammable diamond, PPE
// signs (goggles, gloves, respirator) and "no open flame". Line icons share
// one stroke weight so they read as a set at label size.

const INK = "var(--color-ink)";
const SW = 2.6;
const line = { fill: "none", stroke: INK, strokeWidth: SW, strokeLinecap: "round", strokeLinejoin: "round" } as const;

const FLAME =
  "M30 14c2.6 6 9.4 9 9.4 18a9.4 9.4 0 0 1-18.8 0c0-4.2 2.2-6.8 4.4-8.8 0 4.2 2 6.6 4.4 6.6 0-6.2-2.2-10.6.6-15.8z";

function Flammable() {
  return (
    <g>
      <path d="M30 2 L58 30 L30 58 L2 30 Z" fill="var(--color-flare)" />
      <path d="M30 7 L53 30 L30 53 L7 30 Z" fill="#fff" />
      <path d={FLAME} fill={INK} transform="translate(0 -2)" />
      <rect x="20" y="41" width="20" height="3" fill={INK} />
    </g>
  );
}

function Goggles() {
  return (
    <g {...line}>
      <path d="M14 30 C14 12 46 12 46 30 V38 C46 52 14 52 14 38 Z" />
      <path d="M11 29 H49 V37 Q49 41 45 41 H35 L30 37 L25 41 H15 Q11 41 11 37 Z" fill="#fff" />
      <path d="M24 49 Q30 52 36 49" />
    </g>
  );
}

function Gloves() {
  const glove =
    "M8 56 V28 Q8 25 11 25 Q14 25 14 28 V16 Q14 13 17 13 Q20 13 20 16 V12 Q20 9 23 9 Q26 9 26 12 V15 Q26 12 29 12 Q32 12 32 15 V36 L37 30 Q40 27 42 30 Q43 32 41 35 L32 48 V56 Z";
  return (
    <g {...line}>
      <path d={glove} transform="translate(14 0) rotate(8 30 30)" fill="#fff" />
      <path d={glove} transform="translate(2 4) rotate(-6 30 30)" fill="#fff" />
    </g>
  );
}

function Respirator() {
  return (
    <g {...line}>
      <path d="M14 28 C14 8 46 8 46 28 V40 C46 54 14 54 14 40 Z" />
      <path d="M17 24 H43" />
      <path d="M21 36 Q30 30 39 36 L37 48 Q30 52 23 48 Z" fill="#fff" />
      <circle cx="15" cy="44" r="7" fill="#fff" />
      <circle cx="45" cy="44" r="7" fill="#fff" />
      <circle cx="30" cy="42" r="3" />
    </g>
  );
}

function NoFlame() {
  return (
    <g>
      <path d={FLAME} fill={INK} transform="translate(0 -1)" />
      <circle cx="30" cy="30" r="26" fill="none" stroke={INK} strokeWidth="5" />
      <path d="M12 12 L48 48" stroke={INK} strokeWidth="5" />
    </g>
  );
}

const icons: Record<Pictogram, () => React.ReactElement> = {
  flame: Flammable,
  goggles: Goggles,
  gloves: Gloves,
  respirator: Respirator,
  "no-flame": NoFlame,
};

export const pictogramName: Record<Pictogram, string> = {
  flame: "Flammable",
  goggles: "Wear eye protection",
  gloves: "Wear gloves",
  respirator: "Wear a respirator",
  "no-flame": "No open flames",
};

/** A row of pictograms centred in `width`, each `size` units square. */
export function PictogramRow({
  items,
  x,
  y,
  width,
  size = 60,
}: {
  items: Pictogram[];
  x: number;
  y: number;
  width: number;
  size?: number;
}) {
  const gap = (width - items.length * size) / (items.length + 1);
  return (
    <g>
      {items.map((p, i) => {
        const Icon = icons[p];
        return (
          <g key={p} transform={`translate(${x + gap + i * (size + gap)} ${y}) scale(${size / 60})`}>
            <Icon />
          </g>
        );
      })}
    </g>
  );
}

/** Single pictogram as standalone HTML-embeddable SVG, for the product page key. */
export function PictogramIcon({ name, className }: { name: Pictogram; className?: string }) {
  const Icon = icons[name];
  return (
    <svg viewBox="0 0 60 60" className={className} aria-hidden="true">
      <Icon />
    </svg>
  );
}
