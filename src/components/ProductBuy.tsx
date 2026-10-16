"use client";

import { useState, type ReactNode } from "react";
import type { Product } from "@/lib/products";
import { packKind } from "@/lib/pack";
import { AddToCart } from "./AddToCart";
import { ProductShot } from "./pack/ProductShot";

const packName = { can: "Jerry can", drum: "Steel drum", bottle: "Bottle" } as const;

// Product hero: the container shown follows the size picked in AddToCart.
export function ProductBuy({ product, children }: { product: Product; children: ReactNode }) {
  const [index, setIndex] = useState(0);
  const variant = product.variants[index];

  return (
    <div className="grid gap-10 lg:grid-cols-2">
      <div>
        <div className="overflow-hidden border-2 border-ink shadow-[10px_10px_0_0_var(--color-ink)]">
          <ProductShot
            key={variant.sku}
            product={product}
            variant={variant}
            frame="square"
            className="animate-pack-in block aspect-square w-full"
          />
        </div>

        {product.variants.length > 1 && (
          <div className="mt-5 flex gap-3" role="group" aria-label="Pack sizes">
            {product.variants.map((v, i) => (
              <button
                key={v.sku}
                type="button"
                aria-pressed={i === index}
                onClick={() => setIndex(i)}
                className={`group w-24 border-2 border-ink bg-panel text-left transition-colors ${
                  i === index ? "outline-3 outline-offset-2 outline-lime" : "opacity-70 hover:opacity-100"
                }`}
              >
                <ProductShot product={product} variant={v} frame="square" decorative className="block aspect-square w-full" />
                <span className="block border-t-2 border-ink px-2 py-1 font-mono text-[0.62rem] font-bold uppercase tracking-wider">
                  {v.size}
                  <span className="block font-normal text-muted">{packName[packKind(v.size)]}</span>
                </span>
              </button>
            ))}
          </div>
        )}
      </div>

      <div>
        {children}
        <div className="mt-6">
          <AddToCart product={product} variantIndex={index} onVariantChange={setIndex} />
        </div>
      </div>
    </div>
  );
}
