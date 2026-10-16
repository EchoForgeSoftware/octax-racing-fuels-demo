"use client";

import Link from "next/link";
import { useState } from "react";
import { useCart } from "./CartContext";
import { formatPrice } from "@/lib/format";
import type { Product } from "@/lib/products";
import { Icon } from "./Icon";
import { courierFor, courierNote, freeDeliveryHint } from "@/lib/courier";

// No stock is held on hand, so quantity is only capped at a sane order size.
const MAX_QTY = 99;

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
  // Sizes without a listed price are sold on quotation, not through the cart.
  const quote = variant.price === null;
  // The price shown follows the quantity, so the customer sees the line total as they change it.
  const total = (variant.price ?? 0) * qty;
  const courier = courierFor(variant.size, qty);
  const hint = freeDeliveryHint(variant.size, qty);

  function handleAdd() {
    if (variant.price === null) return;
    add(
      { sku: variant.sku, slug: product.slug, name: product.name, size: variant.size, price: variant.price },
      qty,
    );
    setAdded(true);
    window.setTimeout(() => setAdded(false), 2000);
  }

  return (
    <div className="border-2 border-ink bg-panel p-5">
      <div className="border-b-2 border-ink pb-4">
        <span className="kicker text-muted">{!quote && qty > 1 ? `Price for ${qty}` : "Price"}</span>
        {quote ? (
          <>
            <div className="font-display text-3xl">On request</div>
            <span className="mt-1 block font-mono text-[0.68rem] uppercase tracking-wider text-muted">Subject to quotation</span>
          </>
        ) : (
          <>
            <div className="num font-display text-4xl" aria-live="polite">{formatPrice(total)}</div>
            <span className="num mt-1 block font-mono text-[0.68rem] uppercase tracking-wider text-muted">
              {qty > 1 && <>{formatPrice(variant.price ?? 0)} each · </>}Incl. VAT
            </span>
            <div className="num mt-4 flex flex-wrap items-baseline justify-between gap-x-4 gap-y-1 border-t border-line pt-3 text-sm">
              <span className={courier.kind === "free" ? "font-bold text-ink" : "text-ink-soft"}>
                {courierNote(variant.size, qty)}
              </span>
              {hint && <span className="font-mono text-[0.68rem] uppercase tracking-wider text-flare">{hint}</span>}
            </div>
            {courier.kind !== "quote" && (
              <div className="num mt-1 flex items-baseline justify-between gap-4 text-sm">
                <span className="text-ink-soft">Total incl. courier</span>
                <span className="font-bold">{formatPrice(total + (courier.kind === "fee" ? courier.fee : 0))}</span>
              </div>
            )}
          </>
        )}
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

      {quote ? (
        <>
          <p className="mt-5 text-sm text-ink-soft">
            The {variant.size} size is priced on quotation. Send us your quantity and
            delivery area and we will come back with a price.
          </p>
          <Link
            href="/contact/"
            className="mt-6 flex w-full items-center justify-center gap-2 border-2 border-ink bg-ink px-5 py-3.5 font-display uppercase text-paper transition-colors hover:bg-lime hover:text-ink"
          >
            Request a quote
            <Icon name="arrow" size={16} />
          </Link>
        </>
      ) : (
        <>
          <div className="mt-5 flex items-center gap-3">
            <span className="kicker text-muted">Qty</span>
            <div className="flex items-center border-2 border-ink">
              <button type="button" aria-label="Decrease quantity" disabled={qty <= 1} className="grid h-11 w-11 place-items-center transition-colors hover:bg-lime disabled:text-line disabled:hover:bg-transparent" onClick={() => setQty((q) => Math.max(1, q - 1))}>
                <Icon name="minus" size={14} />
              </button>
              <input
                type="number"
                min={1}
                max={MAX_QTY}
                aria-label="Quantity"
                value={qty}
                onChange={(e) => setQty(Math.min(MAX_QTY, Math.max(1, parseInt(e.target.value, 10) || 1)))}
                className="num h-11 w-14 border-x-2 border-ink bg-transparent text-center font-mono text-sm font-bold outline-none [appearance:textfield] focus-visible:bg-lime/40 [&::-webkit-inner-spin-button]:appearance-none [&::-webkit-outer-spin-button]:appearance-none"
              />
              <button type="button" aria-label="Increase quantity" disabled={qty >= MAX_QTY} className="grid h-11 w-11 place-items-center transition-colors hover:bg-lime disabled:text-line disabled:hover:bg-transparent" onClick={() => setQty((q) => Math.min(MAX_QTY, q + 1))}>
                <Icon name="plus" size={14} />
              </button>
            </div>
          </div>

          <button
            type="button"
            onClick={handleAdd}
            className="mt-6 flex w-full items-center justify-center gap-2 border-2 border-ink bg-flare px-5 py-3.5 font-display uppercase text-paper transition-colors hover:bg-ink"
          >
            {added ? (
              <>
                Added to cart <Icon name="check" size={18} />
              </>
            ) : (
              <>
                Add to cart <span className="num opacity-80">· {formatPrice(total)}</span>
              </>
            )}
          </button>
        </>
      )}
    </div>
  );
}
