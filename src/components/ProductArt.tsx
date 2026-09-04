import type { Product } from "@/lib/products";

const categoryColor: Record<string, string> = {
  "race-fuels": "#ff6a1a",
  methanol: "#35d6e0",
  ethanol: "#b6ff3c",
  additives: "#a78bfa",
};

// The badge value shown on the can: octane, ethanol % or purity from the first spec.
function badge(product: Product): string {
  const s = product.specs[0];
  if (!s) return "";
  return s.value.replace(/\s*\(.*\)\s*/, "").replace(/[^0-9A-Za-z.%]+/g, " ").trim();
}

export function ProductArt({
  product,
  className,
}: {
  product: Product;
  className?: string;
}) {
  const color = categoryColor[product.category] ?? "#ff6a1a";
  const label = badge(product);

  return (
    <svg
      viewBox="0 0 400 400"
      className={className}
      role="img"
      aria-label={`${product.name} product illustration`}
    >
      <defs>
        <linearGradient id={`bg-${product.slug}`} x1="0" y1="0" x2="1" y2="1">
          <stop offset="0" stopColor="#17171d" />
          <stop offset="1" stopColor="#0c0c10" />
        </linearGradient>
      </defs>
      <rect width="400" height="400" rx="16" fill={`url(#bg-${product.slug})`} />
      <g opacity="0.12" stroke={color} strokeWidth="1">
        {Array.from({ length: 9 }).map((_, i) => (
          <line key={i} x1={i * 50} y1="0" x2={i * 50} y2="400" />
        ))}
      </g>

      {/* jerrycan body */}
      <g transform="translate(120 88)">
        <rect x="0" y="24" width="160" height="200" rx="18" fill="#202028" stroke="#33333d" strokeWidth="2" />
        {/* cap */}
        <rect x="54" y="0" width="52" height="34" rx="8" fill={color} />
        <rect x="66" y="-14" width="28" height="18" rx="5" fill={color} opacity="0.7" />
        {/* handle */}
        <path d="M20 24 q60 -34 120 0" fill="none" stroke="#33333d" strokeWidth="10" strokeLinecap="round" />
        {/* label panel */}
        <rect x="18" y="70" width="124" height="118" rx="10" fill="#0d0d11" stroke={color} strokeWidth="1.5" />
        <rect x="18" y="70" width="124" height="26" rx="10" fill={color} />
        <text x="80" y="88" textAnchor="middle" fontSize="12" fontWeight="700" fill="#0a0a0b" fontFamily="system-ui">
          OCTAX
        </text>
        <text x="80" y="146" textAnchor="middle" fontSize="34" fontWeight="800" fill={color} fontFamily="system-ui">
          {label}
        </text>
        <text x="80" y="172" textAnchor="middle" fontSize="10" fill="#a6a6b0" fontFamily="system-ui">
          {product.specs[0]?.label ?? ""}
        </text>
      </g>
    </svg>
  );
}
