"use client";

import Link from "next/link";
import { useCart } from "./CartContext";
import { formatPrice } from "@/lib/format";
import { getProduct } from "@/lib/products";
import { ProductArt } from "./ProductArt";
import { Icon } from "./Icon";

export function CartView() {
  const { items, count, setQty, remove, subtotal, ready } = useCart();

  if (!ready) {
    return <p className="font-mono text-sm uppercase tracking-wider text-muted">Loading your cart&hellip;</p>;
  }

  if (items.length === 0) {
    return (
      <div className="border-2 border-ink bg-panel p-8 text-center sm:p-12">
        <div
          className="mx-auto h-3 w-24"
          style={{ backgroundImage: "repeating-linear-gradient(-45deg, var(--color-ink) 0 6px, transparent 6px 12px)" }}
          aria-hidden="true"
        />
        <h2 className="mt-6 font-display text-[clamp(1.6rem,5vw,2.5rem)]">Your cart is empty</h2>
        <p className="mx-auto mt-3 max-w-sm text-ink-soft">
          Browse the catalogue and add fuels or additives to get started.
        </p>
        <Link
          href="/shop/"
          className="mt-7 inline-block border-2 border-ink bg-flare px-7 py-3.5 font-display uppercase text-paper transition-colors hover:bg-ink"
        >
          Shop products
        </Link>
      </div>
    );
  }

  return (
    <div className="grid gap-8 lg:grid-cols-[1.6fr_1fr] lg:items-start">
      <ul className="divide-y-2 divide-ink border-2 border-ink bg-panel" aria-label="Items in your cart">
        {items.map((i) => {
          const product = getProduct(i.slug);
          return (
            <li key={i.sku} className="grid grid-cols-[4.5rem_1fr] gap-x-4 gap-y-3 p-4 sm:grid-cols-[5.5rem_1fr_auto] sm:items-center">
              <Link href={`/shop/${i.slug}/`} tabIndex={-1} aria-hidden="true" className="row-span-2 block self-start border-2 border-ink sm:row-span-1">
                {product && <ProductArt product={product} className="block aspect-square w-full" />}
              </Link>

              <div className="min-w-0">
                <Link href={`/shop/${i.slug}/`} className="font-display text-base uppercase leading-tight hover:text-flare">
                  {i.name}
                </Link>
                <p className="num mt-1.5 font-mono text-xs uppercase tracking-wider text-muted">
                  {i.size} &middot; {formatPrice(i.price)} each
                </p>
              </div>

              <div className="flex flex-wrap items-center justify-between gap-3 sm:col-start-3 sm:row-start-1 sm:justify-end">
                <div className="flex items-center border-2 border-ink">
                  <button
                    type="button"
                    aria-label={`Decrease ${i.name} quantity`}
                    className="grid h-10 w-10 place-items-center transition-colors hover:bg-lime"
                    onClick={() => setQty(i.sku, i.qty - 1)}
                  >
                    <Icon name="minus" size={14} />
                  </button>
                  <span className="num grid h-10 w-10 place-items-center border-x-2 border-ink font-mono text-sm font-bold" aria-label={`Quantity ${i.qty}`}>
                    {i.qty}
                  </span>
                  <button
                    type="button"
                    aria-label={`Increase ${i.name} quantity`}
                    className="grid h-10 w-10 place-items-center transition-colors hover:bg-lime"
                    onClick={() => setQty(i.sku, i.qty + 1)}
                  >
                    <Icon name="plus" size={14} />
                  </button>
                </div>

                <div className="num font-display text-lg sm:w-24 sm:text-right">
                  {formatPrice(i.price * i.qty)}
                </div>

                <button
                  type="button"
                  onClick={() => remove(i.sku)}
                  aria-label={`Remove ${i.name} from cart`}
                  className="grid h-10 w-10 place-items-center border-2 border-transparent text-muted transition-colors hover:border-ink hover:text-flare"
                >
                  <Icon name="close" size={16} />
                </button>
              </div>
            </li>
          );
        })}
      </ul>

      <aside className="border-2 border-ink bg-panel p-6 shadow-[8px_8px_0_0_var(--color-ink)] lg:sticky lg:top-24">
        <h2 className="font-display text-2xl">Order summary</h2>
        <dl className="num mt-5 space-y-2.5 text-sm">
          <div className="flex justify-between">
            <dt className="font-mono text-xs uppercase tracking-wider text-muted">
              Subtotal ({count} item{count === 1 ? "" : "s"})
            </dt>
            <dd className="font-bold">{formatPrice(subtotal)}</dd>
          </div>
          <div className="flex justify-between">
            <dt className="font-mono text-xs uppercase tracking-wider text-muted">Delivery</dt>
            <dd className="text-muted">Calculated at checkout</dd>
          </div>
        </dl>
        <div className="mt-5 flex items-end justify-between border-t-2 border-ink pt-4">
          <span className="kicker">Total</span>
          <span className="num font-display text-3xl text-flare">{formatPrice(subtotal)}</span>
        </div>
        <Link
          href="/checkout/"
          className="mt-6 flex items-center justify-center gap-2 border-2 border-ink bg-flare px-5 py-3.5 font-display uppercase text-paper transition-colors hover:bg-ink"
        >
          Proceed to checkout
          <Icon name="arrow" size={16} />
        </Link>
        <Link
          href="/shop/"
          className="mt-4 block text-center font-mono text-xs uppercase tracking-wider text-muted hover:text-ink"
        >
          Continue shopping
        </Link>
      </aside>
    </div>
  );
}
