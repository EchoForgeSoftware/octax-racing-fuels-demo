"use client";

import { useState } from "react";
import { useCart } from "./CartContext";
import { formatPrice } from "@/lib/format";
import type { Product } from "@/lib/products";

export function AddToCart({ product }: { product: Product }) {
  const { add } = useCart();
  const [variantIndex, setVariantIndex] = useState(0);
  const [qty, setQty] = useState(1);
  const [added, setAdded] = useState(false);

  const variant = product.variants[variantIndex];
  const outOfStock = variant.stock <= 0;

  function handleAdd() {
    if (outOfStock) return;
    add(
      { sku: variant.sku, slug: product.slug, name: product.name, size: variant.size, price: variant.price },
      qty,
    );
    setAdded(true);
    window.setTimeout(() => setAdded(false), 2000);
  }

  return (
    <div className="border-2 border-ink bg-panel p-5">
      <div className="flex items-end justify-between border-b-2 border-ink pb-4">
        <div>
          <span className="kicker text-muted">Price</span>
          <div className="font-display text-4xl">{formatPrice(variant.price)}</div>
        </div>
        <span className="flex items-center gap-1.5 font-mono text-xs font-bold uppercase tracking-wider">
          <span className={`h-2 w-2 ${variant.stock > 0 ? "bg-lime" : "bg-flare"}`} />
          {variant.stock > 0 ? `${variant.stock} in stock` : "Sold out"}
        </span>
      </div>

      <fieldset className="mt-5">
        <legend className="kicker text-muted">Size</legend>
        <div className="mt-2 flex flex-wrap gap-2">
          {product.variants.map((v, i) => (
            <button
              key={v.sku}
              type="button"
              onClick={() => setVariantIndex(i)}
              className={`border-2 border-ink px-4 py-2 font-mono text-sm font-bold uppercase transition-colors ${
                i === variantIndex ? "bg-ink text-lime" : "hover:bg-lime"
              }`}
            >
              {v.size}
            </button>
          ))}
        </div>
      </fieldset>

      <div className="mt-5 flex items-center gap-3">
        <span className="kicker text-muted">Qty</span>
        <div className="flex items-center border-2 border-ink">
          <button type="button" aria-label="Decrease quantity" className="px-3 py-2 hover:bg-lime" onClick={() => setQty((q) => Math.max(1, q - 1))}>&minus;</button>
          <input
            type="number"
            min={1}
            aria-label="Quantity"
            value={qty}
            onChange={(e) => setQty(Math.max(1, parseInt(e.target.value, 10) || 1))}
            className="w-12 border-x-2 border-ink bg-transparent py-2 text-center font-mono text-sm outline-none"
          />
          <button type="button" aria-label="Increase quantity" className="px-3 py-2 hover:bg-lime" onClick={() => setQty((q) => q + 1)}>+</button>
        </div>
      </div>

      <button
        type="button"
        onClick={handleAdd}
        disabled={outOfStock}
        className="mt-6 w-full border-2 border-ink bg-flare px-5 py-3.5 font-display uppercase text-paper transition-colors hover:bg-ink disabled:cursor-not-allowed disabled:bg-line disabled:text-muted"
      >
        {outOfStock ? "Sold out" : added ? "Added ✓" : "Add to cart"}
      </button>
      <p className="mt-3 text-center font-mono text-xs text-muted">Demo checkout, no payment is taken.</p>
    </div>
  );
}
