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

      <div className="mx-auto max-w-7xl px-4 py-12 sm:px-6">
        <header className="mb-10">
          <p className="kicker text-flare">Catalogue</p>
          <h1 className="mt-3 font-display text-[clamp(2.4rem,8vw,5rem)]">Shop racing fuels</h1>
          <p className="mt-4 max-w-2xl text-ink-soft">
            Competition fuels, methanol, ethanol and additives. All products, prices
            and stock shown here are sample data for this demo.
          </p>
        </header>

        <Suspense fallback={<p className="font-mono text-sm text-muted">Loading products&hellip;</p>}>
          <ShopGrid />
        </Suspense>
      </div>
    </>
  );
}
