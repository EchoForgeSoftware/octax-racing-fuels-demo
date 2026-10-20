"use client";

import type { ReactNode } from "react";
import { getProduct, type Product } from "@/lib/products";
import { usePricing } from "./PricingContext";

/** A website product is shown while at least one of its sizes is switched on in the back office. */
export function useOnWebsite(): (product: Product | undefined) => boolean {
  const pricing = usePricing();
  return (product) => !!product && product.variants.some((v) => pricing.available(v.sku));
}

/** Renders its children only while the product is on the website (Products & pricing → Show on the website). */
export function IfOnWebsite({ slug, children }: { slug: string; children: ReactNode }) {
  const onWebsite = useOnWebsite();
  const product = getProduct(slug);
  if (product && !onWebsite(product)) return null;
  return <>{children}</>;
}
