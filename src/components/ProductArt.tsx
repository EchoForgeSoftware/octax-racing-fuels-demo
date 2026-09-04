import type { Product } from "@/lib/products";

const PAPER = "#f2efe6";
const INK = "#191817";
const LIME = "#c6f24e";
const FLARE = "#e8451f";
const COBALT = "#3b5bdb";

const categoryColor: Record<string, string> = {
  "race-fuels": FLARE,
  methanol: COBALT,
  ethanol: LIME,
  additives: INK,
};

function badge(product: Product): string {
  const raw = product.specs[0]?.value ?? "";
  const num = raw.match(/\d+(\.\d+)?\s?%?/);
  const value = num ? num[0].replace(/\s/g, "") : raw.split(/[\s,(]/)[0];
  return value.slice(0, 7).toUpperCase();
}

function badgeFontSize(label: string): number {
  const n = label.length;
  if (n <= 3) return 150;
  if (n <= 4) return 118;
  if (n <= 5) return 92;
  return 66;
}

export function ProductArt({ product, className }: { product: Product; className?: string }) {
  const color = categoryColor[product.category] ?? FLARE;
  const onColor = color === LIME ? INK : PAPER;
  const label = badge(product);

  return (
    <svg viewBox="0 0 400 400" className={className} role="img" aria-label={`${product.name} livery panel`}>
      <rect width="400" height="400" fill={PAPER} />
      {/* diagonal color block */}
      <path d="M0 0 H400 V250 L0 330 Z" fill={color} />
      {/* hazard band */}
      <g clipPath="url(#band)">
        <rect x="0" y="330" width="400" height="34" fill={INK} />
      </g>
      <clipPath id="band"><rect x="0" y="330" width="400" height="34" /></clipPath>
      {Array.from({ length: 22 }).map((_, i) => (
        <rect key={i} x={i * 24 - 20} y="330" width="8" height="34" transform="skewX(-24)" fill={LIME} />
      ))}

      <text x="28" y="70" fontFamily="Arial, sans-serif" fontSize="18" fontWeight="700" letterSpacing="3" fill={onColor}>
        OCTAX
      </text>
      <text x="24" y="215" fontFamily="Arial Black, Arial, sans-serif" fontSize={badgeFontSize(label)} fontWeight="900" fill={onColor}>
        {label}
      </text>
      <text x="28" y="300" fontFamily="Arial, sans-serif" fontSize="16" fontWeight="700" letterSpacing="2" fill={INK}>
        {(product.specs[0]?.label ?? "").toUpperCase()}
      </text>
    </svg>
  );
}
