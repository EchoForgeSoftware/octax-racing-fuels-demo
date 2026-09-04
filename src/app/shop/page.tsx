import { Suspense } from "react";
import type { Metadata } from "next";
import { Breadcrumbs } from "@/components/Breadcrumbs";
import { ShopGrid } from "@/components/ShopGrid";
import { JsonLd } from "@/components/JsonLd";
import { buildMetadata } from "@/lib/metadata";
import { breadcrumbSchema } from "@/lib/schema";

export const metadata: Metadata = buildMetadata({
  path: "/shop/",
  title: "Shop",
  description:
    "Browse the full Octax Racing Fuels catalogue: leaded and unleaded race fuels, methanol, ethanol, E85 and performance additives with sizes, prices and stock.",
});

const trail = [
  { name: "Home", path: "/" },
  { name: "Shop", path: "/shop/" },
];

export default function ShopPage() {
  return (
    <>
      <JsonLd data={breadcrumbSchema(trail)} />
      <Breadcrumbs trail={trail} />

      <div className="mx-auto max-w-6xl px-4 py-8">
        <header className="mb-8">
          <h1 className="font-display text-4xl font-bold">Shop racing fuels</h1>
          <p className="mt-3 max-w-2xl text-muted">
            Competition fuels, methanol, ethanol and additives. All products, prices
            and stock shown here are sample data for this demo.
          </p>
        </header>

        <Suspense fallback={<p className="text-muted">Loading products&hellip;</p>}>
          <ShopGrid />
        </Suspense>
      </div>
    </>
  );
}
