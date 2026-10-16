"use client";

import { useId } from "react";
import type { Product, Variant } from "@/lib/products";
import { categoryColor, onCategory, packKind, volumeLabel } from "@/lib/pack";
import { Drum, JerryCan, Jug, PACK_SIZE } from "./Containers";

const INK = "var(--color-ink)";
const LIME = "var(--color-lime)";
const packWord = { can: "jerry can", drum: "steel drum", jug: "jug" } as const;

type Props = {
  product: Product;
  /** Which size to show; defaults to the first (main) variant. */
  variant?: Variant;
  /** "card" is 4:3 for grids, "square" for the product page and cart. */
  frame?: "card" | "square";
  className?: string;
  /** Hide from assistive tech when a neighbouring label already names it. */
  decorative?: boolean;
};

/** The product's container standing on its livery backdrop. */
export function ProductShot({ product, variant, frame = "card", className, decorative }: Props) {
  // useId keeps clip-path ids unique when the same product renders twice on a page.
  const uid = useId().replace(/:/g, "");
  const v = variant ?? product.variants[0];
  const kind = packKind(v.size);
  const volume = volumeLabel(v.size);
  const color = categoryColor[product.category];
  const onColor = onCategory(product.category);
  const mark = product.label.mark;

  const W = 400;
  const H = frame === "card" ? 300 : 400;
  const bandY = H - 34;
  const floorY = bandY - 10;

  // Fit the container into the stage, standing on the floor line.
  const size = PACK_SIZE[kind];
  const maxH = floorY - (frame === "card" ? 22 : 36);
  const maxW = kind === "jug" ? 200 : 230;
  const s = Math.min(maxH / size.h, maxW / size.w);
  const pw = size.w * s;
  const px = W * 0.58 - pw / 2;
  const py = floorY - size.h * s;

  return (
    <svg
      viewBox={`0 0 ${W} ${H}`}
      className={className}
      role={decorative ? undefined : "img"}
      aria-hidden={decorative || undefined}
      aria-label={decorative ? undefined : `${product.name}, ${volume} ${packWord[kind]}`}
    >
      <rect width={W} height={H} fill="var(--color-paper)" />
      {/* Diagonal colour slab */}
      <path d={`M0 0 H${W} V${H * 0.56} L0 ${H * 0.78} Z`} fill={color} />
      {/* Oversized outlined product mark (X, M, BOOST) behind the container */}
      <text
        x="-10"
        y={mark.length > 1 ? H * 0.5 : H * 0.62}
        style={{ fontFamily: "var(--font-display), sans-serif" }}
        fontSize={mark.length > 1 ? 120 : H * 0.7}
        fill="none"
        stroke={onColor}
        strokeWidth="2"
        opacity="0.45"
      >
        {mark}
      </text>

      {/* Floor shadow */}
      <path
        d={`M${px + 4} ${floorY} H${px + pw + 26} L${px + pw + 8} ${floorY - 9} H${px + 14} Z`}
        fill={INK}
        opacity="0.16"
      />

      <g transform={`translate(${px} ${py}) scale(${s})`}>
        {kind === "can" && <JerryCan product={product} volume={volume} uid={uid} />}
        {kind === "drum" && <Drum product={product} volume={volume} uid={uid} />}
        {kind === "jug" && <Jug product={product} volume={volume} uid={uid} />}
      </g>

      {/* Hazard band floor */}
      <rect x="0" y={bandY} width={W} height="22" fill={INK} />
      {Array.from({ length: 24 }).map((_, i) => (
        <rect key={i} x={i * 24 - 4} y={bandY} width="9" height="22" transform={`skewX(-28)`} fill={LIME} style={{ transformOrigin: `0 ${bandY}px` }} />
      ))}
    </svg>
  );
}
