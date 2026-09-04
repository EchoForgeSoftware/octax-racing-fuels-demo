import Link from "next/link";
import type { Metadata } from "next";
import { Breadcrumbs } from "@/components/Breadcrumbs";
import { JsonLd } from "@/components/JsonLd";
import { buildMetadata } from "@/lib/metadata";
import { breadcrumbSchema } from "@/lib/schema";

export const metadata: Metadata = buildMetadata({
  path: "/terms/",
  title: "Terms of Service",
  description:
    "The terms that apply to ordering race fuels, methanol, ethanol and additives from Octax Racing Fuels, including pricing, delivery and safe handling.",
});

const trail = [
  { name: "Home", path: "/" },
  { name: "Terms of Service", path: "/terms/" },
];

export default function TermsPage() {
  return (
    <>
      <JsonLd data={breadcrumbSchema(trail)} />
      <Breadcrumbs trail={trail} />

      <div className="mx-auto max-w-3xl px-4 py-12 sm:px-6">
        <p className="kicker text-flare">Legal</p>
        <h1 className="mt-3 font-display text-[clamp(2.2rem,7vw,4rem)]">Terms of service</h1>
        <p className="mt-4 text-ink-soft">
          These terms cover the sale of fuels and additives through this site. They are
          a demonstration template and should be reviewed by the business before the
          site goes live.
        </p>

        <div className="mt-10 space-y-8 text-muted">
          <section>
            <h2 className="font-display text-xl font-bold text-ink">Orders and pricing</h2>
            <p className="mt-2">
              Prices are shown in South African Rand and may change. An order is a
              request to buy; it is accepted once we confirm it. We may decline or
              cancel an order, for example where stock or delivery restrictions apply.
            </p>
          </section>

          <section>
            <h2 className="font-display text-xl font-bold text-ink">Safe handling and eligibility</h2>
            <p className="mt-2">
              Race fuels, methanol and ethanol are flammable and some are toxic. By
              ordering you confirm you are able to receive, store and handle these
              products safely and lawfully. See the{" "}
              <Link href="/information/" className="text-flare hover:underline">
                information page
              </Link>{" "}
              for handling guidance.
            </p>
          </section>

          <section>
            <h2 className="font-display text-xl font-bold text-ink">Delivery</h2>
            <p className="mt-2">
              Fuels are dispatched as dangerous goods under the transport rules that
              apply to your area. Delivery times are estimates and may be affected by
              those requirements.
            </p>
          </section>

          <section>
            <h2 className="font-display text-xl font-bold text-ink">Returns</h2>
            <p className="mt-2">
              For safety reasons, opened fuel and additive containers cannot be
              returned. Contact us about damaged or incorrect deliveries and we will put
              it right.
            </p>
          </section>

          <section>
            <h2 className="font-display text-xl font-bold text-ink">Liability</h2>
            <p className="mt-2">
              Products must be used in line with their intended application and all
              safety guidance. We are not liable for loss or damage caused by improper
              storage, handling or use.
            </p>
          </section>
        </div>
      </div>
    </>
  );
}
