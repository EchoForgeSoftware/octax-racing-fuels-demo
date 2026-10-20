"use client";

import Link from "next/link";
import { useState } from "react";
import { usePricing } from "./PricingContext";
import { useCart } from "./CartContext";
import { formatPrice } from "@/lib/format";
import { packProduct } from "@/lib/packDesign";
import { ProductShot } from "./pack/ProductShot";
import type { CatalogueItem } from "@/lib/backoffice/types";

/**
 * Products without their own page: "New in" (added in the back office, or
 * coming-soon items made live there) can be added to the cart. Items still
 * marked coming soon are not shown on the website.
 */
export function ComingSoon() {
  const pricing = usePricing();
  // One card per product with all its sizes (e.g. a hoodie in S, M, L, XL).
  const newIn = [...new Map(pricing.extras.map((i) => [i.productName, pricing.extras.filter((x) => x.productName === i.productName)])).values()];
  return (
    <>
      {newIn.length > 0 && (
        <section className="mt-20" aria-labelledby="new-in" id="new-in-section">
          <div className="flex flex-wrap items-end justify-between gap-4 border-b-2 border-ink pb-4">
            <div>
              <p className="kicker text-flare">Just landed</p>
              <h2 id="new-in" className="mt-2 font-display text-[clamp(1.8rem,5vw,3rem)]">New in</h2>
            </div>
          </div>
          <ul className="mt-6 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {newIn.map((items) => <NewInCard key={items[0].productName} items={items} />)}
          </ul>
        </section>
      )}
    </>
  );
}

/** A product added in the back office (all its sizes): pick a size and add it to the cart. */
function NewInCard({ items }: { items: CatalogueItem[] }) {
  const pricing = usePricing();
  const { add } = useCart();
  const [sku, setSku] = useState(items.find((i) => !i.soldOut && pricing.price(i.sku, null) !== null)?.sku ?? items[0].sku);
  const [added, setAdded] = useState(false);
  const first = items[0];
  const chosen = items.find((i) => i.sku === sku) ?? first;
  const price = pricing.price(chosen.sku, null);
  const pictured = items.find((i) => i.pack);
  const allOut = items.every((i) => i.soldOut);
  return (
    <li className="flex flex-col border-2 border-ink bg-panel p-5">
      {pictured?.pack && <ProductShot product={packProduct(pictured, pictured.pack)} className="-mx-5 -mt-5 mb-4 block h-auto w-[calc(100%+2.5rem)] max-w-none border-b-2 border-ink" />}
      <p className="font-mono text-[0.68rem] font-bold uppercase tracking-wider text-muted">{first.category === "merch" ? "Merch" : first.category === "detailing" ? "Detailing" : "OCTA"}</p>
      <h3 className="mt-1 font-display text-2xl leading-none">{first.productName}</h3>
      {first.short && <p className="mt-3 text-sm text-ink-soft">{first.short}</p>}
      <div className="mt-3 flex flex-wrap gap-1.5" role="group" aria-label="Size">
        {items.map((i) => (
          <button key={i.sku} type="button" aria-pressed={i.sku === chosen.sku} onClick={() => { setSku(i.sku); setAdded(false); }}
            className={`border-2 border-ink px-2.5 py-1 font-mono text-[0.7rem] font-bold uppercase ${i.sku === chosen.sku ? "bg-ink text-lime" : "hover:bg-lime"} ${i.soldOut ? "line-through opacity-60" : ""}`}>
            {i.size}
          </button>
        ))}
      </div>
      <p className="num mt-auto pt-4 font-display text-xl">{price !== null ? formatPrice(price) : "Price on request"}</p>
      {chosen.soldOut ? (
        <Link href="/contact/" className="mt-3 flex items-center justify-center border-2 border-ink px-4 py-2.5 font-display text-sm uppercase hover:bg-lime">
          {allOut ? "Out of stock · ask when it's back" : "This size is out of stock"}
        </Link>
      ) : price !== null ? (
        <button type="button" onClick={() => { add({ sku: chosen.sku, slug: "", name: first.productName, size: chosen.size, price }, 1); setAdded(true); }}
          className="mt-3 flex items-center justify-center border-2 border-ink bg-ink px-4 py-2.5 font-display text-sm uppercase text-paper hover:bg-lime hover:text-ink">
          {added ? "Added to cart ✓" : "Add to cart"}
        </button>
      ) : (
        <Link href="/contact/" className="mt-3 flex items-center justify-center border-2 border-ink bg-ink px-4 py-2.5 font-display text-sm uppercase text-paper hover:bg-lime hover:text-ink">Ask for a price</Link>
      )}
    </li>
  );
}
