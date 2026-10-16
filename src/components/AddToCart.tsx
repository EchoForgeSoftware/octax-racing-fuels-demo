"use client";

import { useEffect, useState } from "react";
import { useCart } from "./CartContext";
import { formatPrice } from "@/lib/format";
import type { Product } from "@/lib/products";
import { Icon } from "./Icon";

export function AddToCart({
  product,
  variantIndex: controlledIndex,
  onVariantChange,
}: {
  product: Product;
  /** Pass both to share the selected size with something else on the page (the product shot). */
  variantIndex?: number;
  onVariantChange?: (index: number) => void;
}) {
  const { add } = useCart();
  const [ownIndex, setOwnIndex] = useState(0);
  const variantIndex = controlledIndex ?? ownIndex;
  const setVariantIndex = (i: number) => {
    setOwnIndex(i);
    onVariantChange?.(i);
  };
  const [qty, setQty] = useState(1);
  const [added, setAdded] = useState(false);

  const variant = product.variants[variantIndex];
  const outOfStock = variant.stock <= 0;
  const maxQty = Math.max(1, variant.stock);

  // Keep the quantity within what the selected size has in stock, however it was picked.
  useEffect(() => setQty((q) => Math.min(q, maxQty)), [maxQty]);

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
          <div className="num font-display text-4xl">{formatPrice(variant.price)}</div>
          <span className="mt-1 block font-mono text-[0.68rem] uppercase tracking-wider text-muted">Incl. VAT · excl. courier</span>
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
              aria-pressed={i === variantIndex}
              onClick={() => setVariantIndex(i)}
              className={`min-h-11 border-2 border-ink px-4 py-2 font-mono text-sm font-bold uppercase transition-colors ${
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
          <button type="button" aria-label="Decrease quantity" disabled={qty <= 1} className="grid h-11 w-11 place-items-center transition-colors hover:bg-lime disabled:text-line disabled:hover:bg-transparent" onClick={() => setQty((q) => Math.max(1, q - 1))}>
            <Icon name="minus" size={14} />
          </button>
          <input
            type="number"
            min={1}
            max={maxQty}
            aria-label="Quantity"
            value={qty}
            onChange={(e) => setQty(Math.min(maxQty, Math.max(1, parseInt(e.target.value, 10) || 1)))}
            className="num h-11 w-14 border-x-2 border-ink bg-transparent text-center font-mono text-sm font-bold outline-none [appearance:textfield] focus-visible:bg-lime/40 [&::-webkit-inner-spin-button]:appearance-none [&::-webkit-outer-spin-button]:appearance-none"
          />
          <button type="button" aria-label="Increase quantity" disabled={qty >= maxQty} className="grid h-11 w-11 place-items-center transition-colors hover:bg-lime disabled:text-line disabled:hover:bg-transparent" onClick={() => setQty((q) => Math.min(maxQty, q + 1))}>
            <Icon name="plus" size={14} />
          </button>
        </div>
      </div>

      <button
        type="button"
        onClick={handleAdd}
        disabled={outOfStock}
        className="mt-6 flex w-full items-center justify-center gap-2 border-2 border-ink bg-flare px-5 py-3.5 font-display uppercase text-paper transition-colors hover:bg-ink disabled:cursor-not-allowed disabled:bg-line disabled:text-muted"
      >
        {outOfStock ? "Sold out" : added ? (
          <>
            Added to cart <Icon name="check" size={18} />
          </>
        ) : (
          "Add to cart"
        )}
      </button>
      <p className="mt-3 text-center font-mono text-xs text-muted">Demo checkout, no payment is taken.</p>
    </div>
  );
}
