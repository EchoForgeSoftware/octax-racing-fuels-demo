import { notFound } from "next/navigation";
import Link from "next/link";
import type { Metadata } from "next";
import { Breadcrumbs } from "@/components/Breadcrumbs";
import { Reveal } from "@/components/anim/Reveal";
import { ProductArt } from "@/components/ProductArt";
import { ProductCard } from "@/components/ProductCard";
import { AddToCart } from "@/components/AddToCart";
import { JsonLd } from "@/components/JsonLd";
import {
  products,
  getProduct,
  getCategory,
  productsInCategory,
} from "@/lib/products";
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
  const related = productsInCategory(product.category)
    .filter((p) => p.slug !== product.slug)
    .slice(0, 3);

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
        <div className="grid gap-10 lg:grid-cols-2">
          <div className="overflow-hidden border-2 border-ink shadow-[10px_10px_0_0_var(--color-ink)]">
            <ProductArt product={product} className="h-full w-full" />
          </div>

          <div>
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

            <div className="mt-6">
              <AddToCart product={product} />
            </div>
          </div>
        </div>

        {/* Specs + applications */}
        <Reveal className="mt-16 grid gap-10 lg:grid-cols-2">
          <section>
            <h2 className="font-display text-2xl">Specifications</h2>
            <dl className="mt-4 border-2 border-ink">
              {product.specs.map((s, i) => (
                <div key={s.label} className={`flex justify-between px-4 py-3 text-sm ${i > 0 ? "border-t border-line" : ""}`}>
                  <dt className="font-mono uppercase tracking-wider text-muted">{s.label}</dt>
                  <dd className="font-bold">{s.value}</dd>
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
            <div className="mt-6 border-l-0 bg-ink p-5 text-sm text-paper/80">
              <span className="kicker text-lime">Handle with care</span>
              <p className="mt-2">
                Race fuels, methanol and ethanol are flammable and some are toxic. Store
                and transport them safely and follow local regulations. See the{" "}
                <Link href="/information/" className="text-lime hover:underline">information page</Link>{" "}
                for guidance.
              </p>
            </div>
          </section>
        </Reveal>

        {related.length > 0 && (
          <section className="mt-20">
            <h2 className="font-display text-[clamp(1.6rem,5vw,3rem)]">More in {category?.name}</h2>
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
