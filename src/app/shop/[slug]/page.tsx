import { notFound } from "next/navigation";
import Link from "next/link";
import type { Metadata } from "next";
import { Breadcrumbs } from "@/components/Breadcrumbs";
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

      <div className="mx-auto max-w-6xl px-4 py-8">
        <div className="grid gap-10 lg:grid-cols-2">
          <div className="overflow-hidden rounded-2xl border border-border bg-surface">
            <ProductArt product={product} className="h-full w-full" />
          </div>

          <div>
            <Link
              href={`/shop/?category=${product.category}`}
              className="text-sm font-medium text-brand hover:underline"
            >
              {category?.name}
            </Link>
            <h1 className="mt-2 font-display text-3xl font-bold sm:text-4xl">
              {product.name}
            </h1>
            <p className="mt-4 text-muted">{product.description}</p>

            <div className="mt-6">
              <AddToCart product={product} />
            </div>
          </div>
        </div>

        {/* Specs + applications */}
        <div className="mt-14 grid gap-8 lg:grid-cols-2">
          <section>
            <h2 className="font-display text-xl font-bold">Specifications</h2>
            <dl className="mt-4 divide-y divide-border rounded-xl border border-border">
              {product.specs.map((s) => (
                <div key={s.label} className="flex justify-between px-4 py-3 text-sm">
                  <dt className="text-muted">{s.label}</dt>
                  <dd className="font-medium">{s.value}</dd>
                </div>
              ))}
            </dl>
          </section>

          <section>
            <h2 className="font-display text-xl font-bold">Typical applications</h2>
            <ul className="mt-4 flex flex-wrap gap-2">
              {product.applications.map((a) => (
                <li
                  key={a}
                  className="rounded-full border border-border bg-surface px-3 py-1.5 text-sm text-muted"
                >
                  {a}
                </li>
              ))}
            </ul>
            <div className="mt-6 rounded-xl border border-border bg-surface p-4 text-sm text-muted">
              Handling matters: race fuels, methanol and ethanol are flammable and some
              are toxic. Store and transport them safely and follow local regulations.
              See the{" "}
              <Link href="/information/" className="text-brand hover:underline">
                information page
              </Link>{" "}
              for guidance.
            </div>
          </section>
        </div>

        {related.length > 0 && (
          <section className="mt-16">
            <h2 className="font-display text-xl font-bold">More in {category?.name}</h2>
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
