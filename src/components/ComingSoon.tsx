"use client";

import Link from "next/link";
import { comingSoon } from "@/lib/products";
import { usePricing } from "./PricingContext";
import { formatPrice } from "@/lib/format";

const GROUP_LABEL = { fuel: "Race fuel", track: "Track prep", merch: "Merch", detailing: "Detailing" } as const;

/**
 * Announced products. Each card stays "coming soon" until the back office
 * gives it a price and switches it live; then it shows the price and a quote link.
 */
export function ComingSoon() {
  const pricing = usePricing();
  // Products added in the back office (e.g. hoodies), one card per product with all its sizes.
  const newIn = [...new Map(pricing.extras.map((i) => [i.productName, pricing.extras.filter((x) => x.productName === i.productName)])).values()];
  return (
    <>
    {newIn.length > 0 && (
      <section className="mt-20" aria-labelledby="new-in">
        <div className="flex flex-wrap items-end justify-between gap-4 border-b-2 border-ink pb-4">
          <div>
            <p className="kicker text-flare">Just landed</p>
            <h2 id="new-in" className="mt-2 font-display text-[clamp(1.8rem,5vw,3rem)]">New in</h2>
          </div>
          <Link href="/contact/" className="kicker border-b-2 border-ink pb-1 hover:text-flare">Order these &rarr;</Link>
        </div>
        <ul className="mt-6 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {newIn.map((items) => {
            const first = items[0];
            const prices = items.map((i) => i.retail).filter((v): v is number => v !== null);
            return (
              <li key={first.productName} className="flex flex-col border-2 border-ink bg-panel p-5">
                <p className="font-mono text-[0.68rem] font-bold uppercase tracking-wider text-muted">{first.category === "merch" ? "Merch" : first.category === "detailing" ? "Detailing" : "OCTA"}</p>
                <h3 className="mt-1 font-display text-2xl leading-none">{first.productName}</h3>
                {first.short && <p className="mt-3 text-sm text-ink-soft">{first.short}</p>}
                <ul className="mt-3 flex flex-wrap gap-1.5" aria-label="Sizes">
                  {items.map((i) => <li key={i.sku} className="border border-ink px-2 py-0.5 font-mono text-[0.68rem] uppercase">{i.size}</li>)}
                </ul>
                <p className="num mt-auto pt-4 font-display text-xl">{prices.length ? `${prices.length < items.length || new Set(prices).size > 1 ? "From " : ""}${formatPrice(Math.min(...prices))}` : "Price on request"}</p>
                <Link href="/contact/" className="mt-3 flex items-center justify-center border-2 border-ink bg-ink px-4 py-2.5 font-display text-sm uppercase text-paper hover:bg-lime hover:text-ink">Order now</Link>
              </li>
            );
          })}
        </ul>
      </section>
    )}
    <section className="mt-20" aria-labelledby="coming-soon">
      <div className="flex flex-wrap items-end justify-between gap-4 border-b-2 border-ink pb-4">
        <div>
          <p className="kicker text-flare">On the way</p>
          <h2 id="coming-soon" className="mt-2 font-display text-[clamp(1.8rem,5vw,3rem)]">Coming soon</h2>
        </div>
        <Link href="/contact/" className="kicker border-b-2 border-ink pb-1 hover:text-flare">Ask about these &rarr;</Link>
      </div>
      <ul className="mt-6 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {comingSoon.map((u) => {
          const live = u.variants
            .map((v) => ({ v, item: pricing.item(v.sku) }))
            .filter(({ item }) => item && item.active && !item.comingSoon && item.retail !== null);
          const from = live.length ? Math.min(...live.map(({ item }) => item!.retail!)) : null;
          return (
            <li key={u.key} className="relative flex flex-col border-2 border-ink bg-panel p-5">
              <span
                className="absolute inset-x-0 top-0 h-2"
                style={{ backgroundImage: "repeating-linear-gradient(-45deg, var(--color-ink) 0 6px, var(--color-lime) 6px 12px)" }}
                aria-hidden="true"
              />
              <div className="mt-2 flex items-start justify-between gap-3">
                <div>
                  <p className="font-mono text-[0.68rem] font-bold uppercase tracking-wider text-muted">{GROUP_LABEL[u.group]}</p>
                  <h3 className="mt-1 font-display text-2xl leading-none">{u.name}</h3>
                  <p className="mt-1 font-display text-sm uppercase text-flare">{u.line}</p>
                </div>
                <span className={`shrink-0 px-2 py-1 font-mono text-[0.62rem] font-bold uppercase tracking-wider ${from === null ? "bg-ink text-lime" : "bg-lime text-ink"}`}>
                  {from === null ? "Coming soon" : "Now available"}
                </span>
              </div>
              <p className="mt-3 text-sm text-ink-soft">{u.description}</p>
              <ul className="mt-3 flex flex-wrap gap-1.5" aria-label="Sizes">
                {u.variants.map((v) => (
                  <li key={v.sku} className="border border-ink px-2 py-0.5 font-mono text-[0.68rem] uppercase">{v.size}</li>
                ))}
              </ul>
              <p className="num mt-auto pt-4 text-sm font-bold">
                {from === null ? u.priceNote : `From ${formatPrice(from)} · quotation on request`}
              </p>
            </li>
          );
        })}
      </ul>
    </section>
    </>
  );
}
