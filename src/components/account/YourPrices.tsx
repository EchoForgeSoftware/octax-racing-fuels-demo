"use client";

import { products } from "@/lib/products";
import { formatPrice } from "@/lib/format";
import { usePricing } from "../PricingContext";
import { useCart } from "../CartContext";
import { Icon } from "../Icon";

/**
 * Prices agreed with this customer in the back office. They already apply in
 * the shop and cart; this list shows them in one place.
 */
export function YourPrices() {
  const pricing = usePricing();
  const { add } = useCart();
  if (!pricing.client) return null;
  const rows = products.flatMap((p) =>
    p.variants.flatMap((v) => {
      const own = pricing.price(v.sku, v.price);
      const list = pricing.listPrice(v.sku, v.price);
      return own === null ? [] : [{ product: p, variant: v, own, list, special: list !== null && own < list }];
    }),
  );
  if (!rows.some((r) => r.special)) return null;

  return (
    <section aria-labelledby="your-prices" className="border-2 border-ink bg-panel">
      <div className="flex flex-wrap items-end justify-between gap-3 border-b-2 border-ink bg-lime p-4">
        <div>
          <h2 id="your-prices" className="font-display text-2xl">Your prices</h2>
          <p className="text-sm">Agreed with OCTA for your account. They apply automatically in the shop and cart.</p>
        </div>
        <span className="font-mono text-[0.68rem] font-bold uppercase tracking-wider">Incl. VAT · excl. courier</span>
      </div>
      <ul className="divide-y divide-line">
        {rows.map((r) => (
          <li key={r.variant.sku} className="grid grid-cols-[1fr_auto] items-center gap-x-4 gap-y-2 p-4 sm:grid-cols-[1fr_8rem_8rem_auto]">
            <span>
              <strong className="font-display uppercase">{r.product.name}</strong>
              <span className="text-muted"> · {r.variant.size}</span>
            </span>
            <span className="num text-right text-sm text-muted sm:order-none">
              {r.special && r.list !== null ? <><s>{formatPrice(r.list)}</s><span className="sr-only"> website price</span></> : <span aria-hidden="true">&nbsp;</span>}
            </span>
            <span className="num font-display text-xl sm:text-right">{formatPrice(r.own)}</span>
            <button
              type="button"
              onClick={() => add({ sku: r.variant.sku, slug: r.product.slug, name: r.product.name, size: r.variant.size, price: r.own }, 1)}
              className="flex min-h-10 items-center justify-center gap-2 border-2 border-ink px-3 py-2 font-display text-xs uppercase hover:bg-lime"
              aria-label={`Add ${r.product.name} ${r.variant.size} to cart`}
            >
              Add <Icon name="plus" size={12} />
            </button>
          </li>
        ))}
      </ul>
    </section>
  );
}
