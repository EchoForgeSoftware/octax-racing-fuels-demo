"use client";

import type { Product } from "@/lib/products";
import { fromPrice } from "@/lib/products";
import { formatPrice } from "@/lib/format";
import { usePricing } from "./PricingContext";

/** "From" price on product cards, following back-office prices and the signed-in customer's own prices. */
export function LivePrice({ product }: { product: Product }) {
  const pricing = usePricing();
  const prices = product.variants.flatMap((v) => {
    const p = pricing.price(v.sku, v.price);
    return p === null ? [] : [p];
  });
  const price = prices.length ? Math.min(...prices) : fromPrice(product);
  return (
    <>
      <span className="kicker text-muted">{pricing.client ? "Your price from" : "From"}</span>
      <div className="num font-display text-2xl">{formatPrice(price)}</div>
    </>
  );
}

/** Product description edited in the back office, falling back to the built-in text. */
export function LiveDescription({ slug, fallback }: { slug: string; fallback: string }) {
  const text = usePricing().text(slug);
  return <>{text?.description || fallback}</>;
}

/** Purity of the current stock, when set in the back-office costing. */
export function LivePurity({ slug }: { slug: string }) {
  const purity = usePricing().purity(slug);
  if (purity === null) return null;
  return <p className="mt-3 inline-block border-2 border-ink bg-lime px-2 py-1 font-mono text-xs font-bold uppercase tracking-wider">Current stock purity: {purity}%</p>;
}
