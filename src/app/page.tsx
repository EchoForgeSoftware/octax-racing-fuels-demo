import Link from "next/link";
import type { Metadata } from "next";
import { Hero } from "@/components/Hero";
import { Reveal } from "@/components/Reveal";
import { ProductCard } from "@/components/ProductCard";
import { categories, featuredProducts, productsInCategory } from "@/lib/products";
import { buildMetadata } from "@/lib/metadata";

export const metadata: Metadata = {
  ...buildMetadata({
    path: "/",
    title: "Race Fuels, Methanol, Ethanol & Additives",
    description:
      "Octax Racing Fuels supplies high-octane race fuels, methanol, ethanol and performance additives for motorsport, with consistent quality and online ordering.",
  }),
  // Root segment: the layout title template does not apply here, so set it in full.
  title: {
    absolute: "Octax Racing Fuels | Race Fuels, Methanol, Ethanol & Additives",
  },
};

const valueProps = [
  {
    title: "Batch-tested consistency",
    body: "Every blend is tested so octane, ethanol percentage and purity are repeatable, which keeps your tune honest event to event.",
  },
  {
    title: "The right fuel for the class",
    body: "From 102 unleaded to 118 leaded drag fuel, methanol and E85, we stock fuels matched to naturally aspirated, boosted and alcohol setups.",
  },
  {
    title: "Delivered to the paddock",
    body: "Order online and have fuel and additives dispatched to your workshop or track within a 24 to 48 hour window.",
  },
];

export default function HomePage() {
  const featured = featuredProducts();

  return (
    <>
      <Hero />

      {/* Categories */}
      <section className="mx-auto max-w-6xl px-4 py-20">
        <Reveal>
          <div className="flex flex-wrap items-end justify-between gap-4">
            <div>
              <h2 className="font-display text-3xl font-bold">Shop by category</h2>
              <p className="mt-2 max-w-xl text-muted">
                Four ranges covering competition fuels and the additives that keep
                them running clean.
              </p>
            </div>
            <Link href="/shop/" className="text-sm font-medium text-brand hover:underline">
              View all products
            </Link>
          </div>
        </Reveal>

        <div className="mt-8 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          {categories.map((c, i) => {
            const count = productsInCategory(c.slug).length;
            return (
              <Reveal key={c.slug} delay={i * 0.05}>
                <Link
                  href={`/shop/?category=${c.slug}`}
                  className="flex h-full flex-col rounded-xl border border-border bg-surface p-5 transition-colors hover:border-brand"
                >
                  <h3 className="font-display text-lg font-semibold">{c.name}</h3>
                  <p className="mt-2 flex-1 text-sm text-muted">{c.blurb}</p>
                  <span className="mt-4 text-xs font-medium text-brand">
                    {count} product{count === 1 ? "" : "s"} &rarr;
                  </span>
                </Link>
              </Reveal>
            );
          })}
        </div>
      </section>

      {/* Featured */}
      <section className="border-y border-border bg-surface/40">
        <div className="mx-auto max-w-6xl px-4 py-20">
          <Reveal>
            <h2 className="font-display text-3xl font-bold">Featured fuels</h2>
            <p className="mt-2 max-w-xl text-muted">
              Popular picks across race fuel, methanol and E85.
            </p>
          </Reveal>
          <div className="mt-8 grid gap-5 sm:grid-cols-2 lg:grid-cols-4">
            {featured.map((p, i) => (
              <Reveal key={p.slug} delay={i * 0.05}>
                <ProductCard product={p} />
              </Reveal>
            ))}
          </div>
        </div>
      </section>

      {/* Value props */}
      <section className="mx-auto max-w-6xl px-4 py-20">
        <div className="grid gap-6 md:grid-cols-3">
          {valueProps.map((v, i) => (
            <Reveal key={v.title} delay={i * 0.06}>
              <div className="rounded-xl border border-border bg-surface p-6">
                <div className="mb-4 grid h-10 w-10 place-items-center rounded-lg bg-brand/10 font-display text-lg font-bold text-brand">
                  {i + 1}
                </div>
                <h3 className="font-display text-lg font-semibold">{v.title}</h3>
                <p className="mt-2 text-sm text-muted">{v.body}</p>
              </div>
            </Reveal>
          ))}
        </div>
      </section>

      {/* CTA */}
      <section className="mx-auto max-w-6xl px-4 pb-24">
        <Reveal>
          <div className="relative overflow-hidden rounded-2xl border border-border bg-surface p-10 text-center">
            <div className="bg-grid absolute inset-0 opacity-40" aria-hidden="true" />
            <div className="relative">
              <h2 className="font-display text-3xl font-bold">
                Not sure which fuel your build needs?
              </h2>
              <p className="mx-auto mt-3 max-w-xl text-muted">
                Read the fuel selection guide, or get in touch and we will point you
                to the right blend for your engine and class.
              </p>
              <div className="mt-7 flex flex-wrap justify-center gap-3">
                <Link href="/information/" className="rounded-lg bg-brand px-6 py-3 font-semibold text-black transition-colors hover:bg-brand-strong">
                  Fuel selection guide
                </Link>
                <Link href="/contact/" className="rounded-lg border border-border px-6 py-3 font-semibold text-fg transition-colors hover:border-brand">
                  Contact us
                </Link>
              </div>
            </div>
          </div>
        </Reveal>
      </section>
    </>
  );
}
