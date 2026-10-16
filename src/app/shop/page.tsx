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
    "Browse the OCTA Performance range: OCTA-X ethanol 96%, OCTA-M methanol and OCTA-BOOST octane booster, with pack sizes and prices.",
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
          <h1 className="mt-3 font-display text-[clamp(2.4rem,8vw,5rem)]">Shop OCTA</h1>
          <p className="mt-4 max-w-2xl text-ink-soft">
            Ethanol, methanol, octane boosters and diesel improver for performance use.
            Prices include VAT. Courier is R200 per pack, free on 10 or more of the same
            5L or 25L product or 12 or more of the same 500ml product.
          </p>
        </header>

        <Suspense fallback={<p className="font-mono text-sm text-muted">Loading products&hellip;</p>}>
          <ShopGrid />
        </Suspense>
      </div>
    </>
  );
}
