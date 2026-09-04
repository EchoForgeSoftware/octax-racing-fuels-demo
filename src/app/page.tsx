import Link from "next/link";
import type { Metadata } from "next";
import { Hero } from "@/components/Hero";
import { Reveal } from "@/components/anim/Reveal";
import { Marquee } from "@/components/anim/Marquee";
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
  title: {
    absolute: "Octax Racing Fuels | Race Fuels, Methanol, Ethanol & Additives",
  },
};

const ticker = ["Ethanol E100", "Methanol 99.9%", "E85 blend", "RF110 leaded", "Octane boost", "RF118 drag", "Upper-cylinder lube"];

const props = [
  { n: "01", h: "Batch-tested", b: "Every blend is tested so octane, ethanol percentage and purity are repeatable. Your tune stays honest event to event." },
  { n: "02", h: "Class-matched", b: "From 102 unleaded to 118 leaded drag fuel, methanol and E85, stocked for naturally aspirated, boosted and alcohol setups." },
  { n: "03", h: "To the paddock", b: "Order online and have fuel and additives dispatched to your workshop or track inside a 24 to 48 hour window." },
];

export default function HomePage() {
  const featured = featuredProducts();

  return (
    <>
      <Hero />

      {/* Ticker */}
      <div className="border-b-2 border-ink bg-ink py-3">
        <Marquee duration={24}>
          {ticker.map((t) => (
            <span key={t} className="mx-6 inline-flex items-center gap-6 font-display text-xl uppercase text-paper">
              {t}
              <span className="h-2.5 w-2.5 rotate-45 bg-lime" />
            </span>
          ))}
        </Marquee>
      </div>

      {/* Categories as editorial rows */}
      <section className="mx-auto max-w-7xl px-4 py-20 sm:px-6">
        <Reveal className="flex flex-wrap items-end justify-between gap-4">
          <div>
            <p className="kicker text-flare">The range</p>
            <h2 className="mt-3 font-display text-[clamp(2rem,6vw,4rem)]">Shop by category</h2>
          </div>
          <Link href="/shop/" className="kicker border-b-2 border-ink pb-1 hover:text-flare">All products &rarr;</Link>
        </Reveal>

        <div className="mt-10 border-t-2 border-ink">
          {categories.map((c, i) => (
            <Reveal key={c.slug} self>
              <Link
                href={`/shop/?category=${c.slug}`}
                className="group grid grid-cols-[auto_1fr_auto] items-center gap-4 border-b-2 border-ink py-6 transition-colors hover:bg-ink hover:text-paper sm:gap-8 sm:py-8"
              >
                <span className="font-mono text-sm text-muted group-hover:text-lime">0{i + 1}</span>
                <div>
                  <h3 className="font-display text-[clamp(1.6rem,5vw,3.2rem)] leading-none">{c.name}</h3>
                  <p className="mt-2 max-w-lg text-sm text-muted group-hover:text-paper/70">{c.blurb}</p>
                </div>
                <span className="font-mono text-xs uppercase tracking-wider text-muted group-hover:text-lime">
                  {productsInCategory(c.slug).length} items<span className="ml-3 inline-block transition-transform group-hover:translate-x-1">&rarr;</span>
                </span>
              </Link>
            </Reveal>
          ))}
        </div>
      </section>

      {/* Featured */}
      <section className="border-y-2 border-ink bg-paper-2">
        <div className="mx-auto max-w-7xl px-4 py-20 sm:px-6">
          <Reveal className="mb-10">
            <p className="kicker text-flare">On the grid</p>
            <h2 className="mt-3 font-display text-[clamp(2rem,6vw,4rem)]">Featured fuels</h2>
          </Reveal>
          <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-4">
            {featured.map((p) => (
              <Reveal key={p.slug} self>
                <ProductCard product={p} />
              </Reveal>
            ))}
          </div>
        </div>
      </section>

      {/* Value props */}
      <section className="mx-auto max-w-7xl px-4 py-20 sm:px-6">
        <div className="grid gap-px border-2 border-ink bg-ink md:grid-cols-3">
          {props.map((p) => (
            <Reveal key={p.n} self className="bg-paper p-8">
              <span className="text-outline font-display text-6xl">{p.n}</span>
              <h3 className="mt-4 font-display text-2xl">{p.h}</h3>
              <p className="mt-3 text-sm text-muted">{p.b}</p>
            </Reveal>
          ))}
        </div>
      </section>

      {/* CTA band */}
      <section className="relative overflow-hidden border-y-2 border-ink bg-lime">
        <div className="mx-auto max-w-7xl px-4 py-20 text-center sm:px-6">
          <Reveal self>
            <h2 className="mx-auto max-w-3xl font-display text-[clamp(2rem,7vw,5rem)] text-ink">Not sure which fuel your build needs?</h2>
            <p className="mx-auto mt-5 max-w-xl text-ink-soft">
              Read the selection guide, or get in touch and we will point you to the right
              blend for your engine and class.
            </p>
            <div className="mt-9 flex flex-wrap justify-center gap-4">
              <Link href="/information/" className="border-2 border-ink bg-ink px-7 py-3.5 font-display uppercase text-paper transition-colors hover:bg-paper hover:text-ink">
                Selection guide
              </Link>
              <Link href="/contact/" className="border-2 border-ink px-7 py-3.5 font-display uppercase text-ink transition-colors hover:bg-ink hover:text-lime">
                Contact us
              </Link>
            </div>
          </Reveal>
        </div>
      </section>
    </>
  );
}
