import { notFound } from "next/navigation";
import Link from "next/link";
import type { Metadata } from "next";
import { Breadcrumbs } from "@/components/Breadcrumbs";
import { Reveal } from "@/components/anim/Reveal";
import { ProductCard } from "@/components/ProductCard";
import { ProductBuy } from "@/components/ProductBuy";
import { JsonLd } from "@/components/JsonLd";
import {
  products,
  getProduct,
  getCategory,
} from "@/lib/products";
import { LabelArtwork } from "@/components/brand/BrandLabel";
import { PictogramIcon, pictogramName } from "@/components/brand/Pictograms";
import { buildMetadata } from "@/lib/metadata";
import { breadcrumbSchema, productSchema } from "@/lib/schema";

type Params = { slug: string };

export function generateStaticParams(): Params[] {
  return products.map((p) => ({ slug: p.slug }));
}

export async function generateMetadata({
  params,
}: {
  params: Promise<Params>;
}): Promise<Metadata> {
  const { slug } = await params;
  const product = getProduct(slug);
  if (!product) return {};
  return buildMetadata({
    path: `/shop/${product.slug}/`,
    title: product.name,
    description: product.short,
  });
}

export default async function ProductPage({
  params,
}: {
  params: Promise<Params>;
}) {
  const { slug } = await params;
  const product = getProduct(slug);
  if (!product) notFound();

  const category = getCategory(product.category);
  const label = product.label;
  const related = products.filter((p) => p.slug !== product.slug);

  const trail = [
    { name: "Home", path: "/" },
    { name: "Shop", path: "/shop/" },
    { name: category?.name ?? "Products", path: `/shop/?category=${product.category}` },
    { name: product.name, path: `/shop/${product.slug}/` },
  ];

  return (
    <>
      <JsonLd data={[breadcrumbSchema(trail), productSchema(product)]} />
      <Breadcrumbs trail={trail} />

      <div className="mx-auto max-w-7xl px-4 py-12 sm:px-6">
        <ProductBuy product={product}>
          <Link
            href={`/shop/?category=${product.category}`}
            className="kicker text-flare hover:underline"
          >
            {category?.name}
          </Link>
          <h1 className="mt-3 font-display text-[clamp(2rem,6vw,3.5rem)] leading-[0.9]">
            {product.name}
          </h1>
          <p className="mt-5 text-ink-soft">{product.description}</p>
        </ProductBuy>

        {/* Specs + applications */}
        <Reveal className="mt-16 grid gap-10 lg:grid-cols-2">
          <section>
            <h2 className="font-display text-2xl">Specifications</h2>
            <dl className="mt-4 border-2 border-ink">
              {product.specs.map((s, i) => (
                <div key={s.label} className={`flex justify-between gap-4 px-4 py-3 text-sm ${i > 0 ? "border-t border-line" : ""}`}>
                  <dt className="font-mono uppercase tracking-wider text-muted">{s.label}</dt>
                  <dd className="text-right font-bold">{s.value}</dd>
                </div>
              ))}
            </dl>
          </section>

          <section>
            <h2 className="font-display text-2xl">Typical applications</h2>
            <ul className="mt-4 flex flex-wrap gap-2">
              {product.applications.map((a) => (
                <li key={a} className="border-2 border-ink px-3 py-1.5 font-mono text-xs uppercase tracking-wider text-ink-soft">
                  {a}
                </li>
              ))}
            </ul>
            <div className="mt-6 bg-ink p-5 text-sm text-paper/80">
              <span className="kicker text-lime">Handle with care</span>
              <p className="mt-2">
                {label.un
                  ? `${product.name} is a ${label.hazardClass?.toLowerCase()} flammable liquid (${label.un}). Wear eye protection, gloves and a respirator, keep it away from open flame, and store and transport it according to local regulations.`
                  : `Handle ${product.name} with eye protection and gloves, keep it out of reach of children, and store it sealed, away from heat.`}{" "}
                See the{" "}
                <Link href="/information/" className="text-lime hover:underline">information page</Link>{" "}
                for guidance.
              </p>
            </div>
          </section>
        </Reveal>

        {/* The full product label, readable, with its symbols explained */}
        <section className="mt-20 grid items-start gap-10 lg:grid-cols-[minmax(0,26rem)_1fr]">
          <div className="border-2 border-ink bg-panel p-3 shadow-[10px_10px_0_0_var(--color-lime)] sm:p-4">
            <LabelArtwork product={product} className="block h-auto w-full" />
          </div>

          <div>
            <h2 className="font-display text-[clamp(1.6rem,5vw,3rem)]">On the label</h2>
            <p className="mt-4 max-w-xl text-ink-soft">
              Every {product.name} pack carries this label. Write the manufacture date and
              batch number in the boxes with a marker so each pack can be traced.
            </p>

            {label.mix && (
              <div className="mt-8">
                <h3 className="kicker text-muted">{label.mix.lead}</h3>
                <dl className="mt-3 border-2 border-ink">
                  {label.mix.rows.map((r, i) => (
                    <div key={r.ratio} className={`flex items-baseline gap-4 px-4 py-3 ${i > 0 ? "border-t border-line" : ""}`}>
                      <dt className="num w-12 font-display text-2xl">{r.ratio}</dt>
                      <dd className="font-mono text-sm font-bold uppercase tracking-wider">{r.text}</dd>
                    </div>
                  ))}
                </dl>
              </div>
            )}

            <h3 className="kicker mt-8 text-muted">Safety symbols</h3>
            <ul className="mt-3 grid gap-3 sm:grid-cols-2">
              {label.pictograms.map((p) => (
                <li key={p} className="flex items-center gap-3 border-2 border-ink bg-panel p-3">
                  <PictogramIcon name={p} className="h-11 w-11 shrink-0" />
                  <span className="text-sm font-bold">{pictogramName[p]}</span>
                </li>
              ))}
            </ul>

            {label.un && (
              <dl className="mt-8 grid grid-cols-2 gap-px border-2 border-ink bg-ink">
                <div className="bg-paper p-4">
                  <dt className="kicker text-muted">UN number</dt>
                  <dd className="mt-1 font-display text-2xl">{label.un}</dd>
                </div>
                <div className="bg-paper p-4">
                  <dt className="kicker text-muted">Hazard class</dt>
                  <dd className="mt-1 font-display text-2xl">{label.hazardClass}</dd>
                </div>
              </dl>
            )}
          </div>
        </section>

        {related.length > 0 && (
          <section className="mt-20">
            <h2 className="font-display text-[clamp(1.6rem,5vw,3rem)]">More from OCTA</h2>
            <div className="mt-6 grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
              {related.map((p) => (
                <ProductCard key={p.slug} product={p} />
              ))}
            </div>
          </section>
        )}
      </div>
    </>
  );
}
