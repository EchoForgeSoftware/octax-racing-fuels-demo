"use client";

import Link from "next/link";
import { useCart } from "./CartContext";
import { formatPrice } from "@/lib/format";

export function CartView() {
  const { items, setQty, remove, subtotal, ready } = useCart();

  if (!ready) {
    return <p className="text-muted">Loading your cart&hellip;</p>;
  }

  if (items.length === 0) {
    return (
      <div className="border-2 border-ink bg-panel p-10 text-center">
        <p className="font-display text-xl font-semibold">Your cart is empty</p>
        <p className="mx-auto mt-2 max-w-sm text-muted">
          Browse the catalogue and add fuels or additives to get started.
        </p>
        <Link
          href="/shop/"
          className="mt-6 inline-block bg-flare px-6 py-3 font-semibold text-paper transition-colors hover:bg-ink"
        >
          Shop products
        </Link>
      </div>
    );
  }

  return (
    <div className="grid gap-8 lg:grid-cols-[1.6fr_1fr]">
      <ul className="divide-y-2 divide-ink border-2 border-ink bg-panel">
        {items.map((i) => (
          <li key={i.sku} className="flex flex-wrap items-center gap-4 p-4">
            <div className="min-w-0 flex-1">
              <Link href={`/shop/${i.slug}/`} className="font-medium hover:text-flare">
                {i.name}
              </Link>
              <p className="text-sm text-muted">
                {i.size} &middot; {formatPrice(i.price)} each
              </p>
            </div>

            <div className="flex items-center border-2 border-ink">
              <button
                type="button"
                aria-label={`Decrease ${i.name} quantity`}
                className="px-3 py-2 text-muted hover:text-ink"
                onClick={() => setQty(i.sku, i.qty - 1)}
              >
                &minus;
              </button>
              <span className="w-8 text-center text-sm">{i.qty}</span>
              <button
                type="button"
                aria-label={`Increase ${i.name} quantity`}
                className="px-3 py-2 text-muted hover:text-ink"
                onClick={() => setQty(i.sku, i.qty + 1)}
              >
                +
              </button>
            </div>

            <div className="w-24 text-right font-medium">
              {formatPrice(i.price * i.qty)}
            </div>

            <button
              type="button"
              onClick={() => remove(i.sku)}
              className="text-sm text-muted hover:text-flare"
            >
              Remove
            </button>
          </li>
        ))}
      </ul>

      <aside className="h-fit border-2 border-ink bg-panel p-6">
        <h2 className="font-display text-lg font-semibold">Order summary</h2>
        <dl className="mt-4 space-y-2 text-sm">
          <div className="flex justify-between">
            <dt className="text-muted">Subtotal</dt>
            <dd className="font-medium">{formatPrice(subtotal)}</dd>
          </div>
          <div className="flex justify-between">
            <dt className="text-muted">Delivery</dt>
            <dd className="text-muted">Calculated at checkout</dd>
          </div>
        </dl>
        <div className="mt-4 flex justify-between border-t-2 border-ink pt-4">
          <span className="font-semibold">Total</span>
          <span className="font-display text-xl font-bold text-flare">
            {formatPrice(subtotal)}
          </span>
        </div>
        <Link
          href="/checkout/"
          className="mt-6 block bg-flare px-5 py-3 text-center font-semibold text-paper transition-colors hover:bg-ink"
        >
          Proceed to checkout
        </Link>
        <Link
          href="/shop/"
          className="mt-3 block text-center text-sm text-muted hover:text-ink"
        >
          Continue shopping
        </Link>
      </aside>
    </div>
  );
}
