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
      {
        sku: variant.sku,
        slug: product.slug,
        name: product.name,
        size: variant.size,
        price: variant.price,
      },
      qty,
    );
    setAdded(true);
    window.setTimeout(() => setAdded(false), 2000);
  }

  return (
    <div className="rounded-xl border border-border bg-surface p-5">
      <div className="flex items-end justify-between">
        <div>
          <span className="text-xs text-muted">Price</span>
          <div className="font-display text-2xl font-bold text-brand">
            {formatPrice(variant.price)}
          </div>
        </div>
        <span
          className={`text-sm font-medium ${
            variant.stock > 0 ? "text-acid" : "text-muted"
          }`}
        >
          {variant.stock > 0 ? `${variant.stock} in stock` : "Out of stock"}
        </span>
      </div>

      <fieldset className="mt-5">
        <legend className="text-sm font-medium">Size</legend>
        <div className="mt-2 flex flex-wrap gap-2">
          {product.variants.map((v, i) => (
            <button
              key={v.sku}
              type="button"
              onClick={() => setVariantIndex(i)}
              className={`rounded-lg border px-3 py-2 text-sm font-medium transition-colors ${
                i === variantIndex
                  ? "border-brand bg-brand/10 text-brand"
                  : "border-border text-muted hover:text-fg"
              }`}
            >
              {v.size}
            </button>
          ))}
        </div>
      </fieldset>

      <div className="mt-5 flex items-center gap-3">
        <label htmlFor="qty" className="text-sm font-medium">
          Qty
        </label>
        <div className="flex items-center rounded-lg border border-border">
          <button
            type="button"
            aria-label="Decrease quantity"
            className="px-3 py-2 text-muted hover:text-fg"
            onClick={() => setQty((q) => Math.max(1, q - 1))}
          >
            &minus;
          </button>
          <input
            id="qty"
            type="number"
            min={1}
            value={qty}
            onChange={(e) =>
              setQty(Math.max(1, parseInt(e.target.value, 10) || 1))
            }
            className="w-12 bg-transparent text-center text-sm outline-none"
          />
          <button
            type="button"
            aria-label="Increase quantity"
            className="px-3 py-2 text-muted hover:text-fg"
            onClick={() => setQty((q) => q + 1)}
          >
            +
          </button>
        </div>
      </div>

      <button
        type="button"
        onClick={handleAdd}
        disabled={outOfStock}
        className="mt-6 w-full rounded-lg bg-brand px-5 py-3 font-semibold text-black transition-colors hover:bg-brand-strong disabled:cursor-not-allowed disabled:opacity-40"
      >
        {outOfStock ? "Out of stock" : added ? "Added to cart" : "Add to cart"}
      </button>
      <p className="mt-3 text-center text-xs text-muted">
        Demo checkout, no payment is taken.
      </p>
    </div>
  );
}
