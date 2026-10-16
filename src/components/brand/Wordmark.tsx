// The OCTA wordmark, redrawn from the product labels: red rounded-square O,
// black C, T and notched A, with an optional lime product mark (X, M, BOOST)
// behind or after it, and PERFORMANCE spaced underneath.
//
// Drawn in a 0 0 300 104 box (more width when the mark is a word) so it can be
// dropped into the label SVGs and into an HTML <svg> for the site header.

const INK = "var(--color-ink)";
const RED = "var(--color-flare)";
export const LABEL_LIME = "oklch(0.86 0.13 122)";

export function Halftone({ x, y, cols = 6, rows = 12, step = 7, color = LABEL_LIME }: {
  x: number;
  y: number;
  cols?: number;
  rows?: number;
  step?: number;
  color?: string;
}) {
  // Dots shrink towards the right edge, like the label's halftone fade.
  const dots = [];
  for (let c = 0; c < cols; c++) {
    const r = (step * 0.34) * (1 - c / cols);
    for (let row = 0; row < rows; row++) {
      if ((c + row) % 2) continue;
      dots.push(<circle key={`${c}-${row}`} cx={x + c * step} cy={y + row * step} r={r} fill={color} />);
    }
  }
  return <g>{dots}</g>;
}

/** O, C, T, A letterforms. `cut` is the colour showing through the A's notch. */
export function OctaLetters({ cut = "var(--color-paper)", ink = INK }: { cut?: string; ink?: string }) {
  return (
    <g>
      <path
        fillRule="evenodd"
        fill={RED}
        d="M18 0 H54 Q72 0 72 18 V52 Q72 70 54 70 H18 Q0 70 0 52 V18 Q0 0 18 0 Z M24 18 Q18 18 18 24 V46 Q18 52 24 52 H48 Q54 52 54 46 V24 Q54 18 48 18 Z"
      />
      <path fill={ink} d="M142 0 H96 Q80 0 80 16 V54 Q80 70 96 70 H142 V52 H104 Q98 52 98 46 V24 Q98 18 104 18 H142 Z" />
      <path fill={ink} d="M148 0 H206 V18 H186 V70 H168 V18 H148 Z" />
      <path fill={ink} d="M208 70 L245 0 L282 70 Z" />
      <path fill={cut} d="M224 70 L245 30 L266 70 Z" />
      <path fill={ink} d="M235 70 L245 51 L255 70 Z" />
    </g>
  );
}

export function Performance({ y = 98, width = 270, fill = INK }: { y?: number; width?: number; fill?: string }) {
  return (
    <text
      x="2"
      y={y}
      textLength={width}
      lengthAdjust="spacing"
      style={{ fontFamily: "var(--font-sans), sans-serif", fontWeight: 800 }}
      fontSize="17"
      fill={fill}
    >
      PERFORMANCE
    </text>
  );
}

/** Wordmark with a product mark. Returns its own width so callers can centre it. */
export function wordmarkWidth(mark?: string): number {
  if (!mark) return 284;
  return mark.length > 1 ? 318 + mark.length * 52 : 360;
}

export function WordmarkWithMark({ mark, cut, ink = INK }: { mark?: string; cut?: string; ink?: string }) {
  const word = mark && mark.length > 1;
  return (
    <g>
      {mark && !word && (
        <>
          {/* Single-letter mark sits behind the A, oversized, with a halftone fade. */}
          <text
            x="226"
            y="104"
            style={{ fontFamily: "var(--font-display), sans-serif" }}
            fontSize="138"
            fill={LABEL_LIME}
          >
            {mark}
          </text>
          <Halftone x={318} y={38} cols={5} rows={10} step={7} />
        </>
      )}
      <OctaLetters cut={cut} ink={ink} />
      {word && (
        <>
          <rect x="288" y="27" width="22" height="16" fill={ink} />
          <text
            x="314"
            y="70"
            style={{ fontFamily: "var(--font-label), sans-serif", fontWeight: 800, fontStyle: "italic" }}
            fontSize="96"
            fill={LABEL_LIME}
          >
            {mark}
          </text>
        </>
      )}
      <Performance fill={ink} />
    </g>
  );
}

/** Site header/footer logo: OCTA over PERFORMANCE. `tone="light"` for dark backgrounds. */
export function OctaLogo({ className, tone = "dark" }: { className?: string; tone?: "dark" | "light" }) {
  const light = tone === "light";
  return (
    <svg viewBox="0 0 284 104" className={className} role="img" aria-label="OCTA Performance">
      <WordmarkWithMark
        cut={light ? "var(--color-ink)" : "var(--color-paper)"}
        ink={light ? "var(--color-paper)" : INK}
      />
    </svg>
  );
}
