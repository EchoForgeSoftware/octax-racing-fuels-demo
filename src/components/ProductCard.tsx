"use client";

import Link from "next/link";
import type { Product } from "@/lib/products";
import { getCategory } from "@/lib/products";
import { LivePrice } from "./LivePrice";
import { volumeLabel } from "@/lib/pack";
import { ProductShot } from "./pack/ProductShot";
import { usePricing } from "./PricingContext";

export function ProductCard({ product }: { product: Product }) {
  const category = getCategory(product.category);
  // Pack sizes in place of a stock badge: no stock is held on hand.
  const sizes = product.variants.map((v) => volumeLabel(v.size)).join(" · ");
  const pricing = usePricing();
  const out = product.variants.filter((v) => pricing.soldOut(v.sku)).length;

  return (
    <Link
      href={`/shop/${product.slug}/`}
      className="group flex flex-col border-2 border-ink bg-panel transition-transform duration-300 ease-[cubic-bezier(0.22,1,0.36,1)] hover:-translate-x-1 hover:-translate-y-1 hover:shadow-[8px_8px_0_0_var(--color-ink)]"
    >
      <div className="relative overflow-hidden border-b-2 border-ink">
        <ProductShot product={product} className="block aspect-[4/3] w-full transition-transform duration-500 ease-[cubic-bezier(0.22,1,0.36,1)] group-hover:scale-[1.04]" />
        <span className="absolute left-0 top-0 bg-ink px-2.5 py-1 font-mono text-[0.62rem] font-bold uppercase tracking-wider text-lime">
          {category?.name}
        </span>
        {out > 0 && (
          <span className="absolute right-0 top-0 bg-flare px-2.5 py-1 font-mono text-[0.62rem] font-bold uppercase tracking-wider text-paper">
            {out === product.variants.length ? "Out of stock" : "Some sizes out of stock"}
          </span>
        )}
      </div>

      <div className="flex flex-1 flex-col p-4">
        <h3 className="font-display text-lg uppercase leading-none">{product.name}</h3>
        <p className="mb-4 mt-2 line-clamp-2 text-sm text-muted">{product.short}</p>
        <div className="mt-auto flex items-end justify-between gap-3 border-t-2 border-ink pt-3">
          <div>
            <LivePrice product={product} />
            <span className="font-mono text-[0.6rem] uppercase tracking-wider text-muted">Incl. VAT</span>
          </div>
          <span className="num text-right font-mono text-[0.68rem] font-bold uppercase tracking-wider">{sizes}</span>
        </div>
      </div>
    </Link>
  );
}
