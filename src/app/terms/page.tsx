import Link from "next/link";
import type { Metadata } from "next";
import { Breadcrumbs } from "@/components/Breadcrumbs";
import { JsonLd } from "@/components/JsonLd";
import { buildMetadata } from "@/lib/metadata";
import { breadcrumbSchema } from "@/lib/schema";
import { BusinessDetails } from "@/components/BusinessDetails";
import { LEGAL } from "@/lib/site";

export const metadata: Metadata = buildMetadata({
  path: "/terms/",
  title: "Terms of Service",
  description:
    "The terms that apply to ordering OCTA-X, OCTA-M and OCTA-BOOST from OCTA Performance, including pricing, delivery and safe handling.",
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
          These terms cover orders for OCTA fuels and additives. Read them with our{" "}
          <Link href="/delivery-returns/" className="underline">delivery and returns policy</Link>{" "}
          and the product handling information before ordering. Version {LEGAL.version}.
        </p>

        <div className="mt-10 space-y-8 text-muted">
          <BusinessDetails />
          <section>
            <h2 className="font-display text-xl text-ink">Orders and pricing</h2>
            <p className="mt-2">
              Prices are shown in South African Rand, including VAT; courier is
              shown separately. Review the products, quantities, delivery details
              and total at checkout, and use the cart to correct errors before
              submitting. An order is a
              request to buy; it is accepted once we confirm it. We may decline or
              cancel an order, for example where stock or delivery restrictions apply.
            </p>
          </section>

          <section>
            <h2 className="font-display text-xl text-ink">Payments and confirmation</h2>
            <p className="mt-2">When available, choose Ozow&apos;s hosted payment page or manual EFT to the published bank account. Use the order reference for manual transfers. A return from a payment page is not proof of payment; we verify the payment result. Payment and order references are displayed in your browser, and signed-in customers can view saved orders in their account. Please keep a copy. Contact us if a payment or order needs correction.</p>
          </section>

          <section>
            <h2 className="font-display text-xl text-ink">Safe handling and eligibility</h2>
            <p className="mt-2">
              OCTA-X, OCTA-M and OCTA-BOOST are flammable and methanol is toxic. By
              ordering you confirm you are able to receive, store and handle these
              products safely and lawfully. See the{" "}
              <Link href="/information/" className="text-flare hover:underline">
                information page
              </Link>{" "}
              for handling guidance.
            </p>
          </section>

          <section>
            <h2 className="font-display text-xl text-ink">Delivery</h2>
            <p className="mt-2">
              Fuels are dispatched as dangerous goods under the transport rules that
              apply to your area. Delivery times are estimates and may be affected by
              those requirements.
            </p>
          </section>

          <section>
            <h2 className="font-display text-xl text-ink">Returns</h2>
            <p className="mt-2">
              Your rights concerning faulty, unsafe, damaged or incorrectly
              supplied products are preserved. Cancellation, cooling-off and
              refund rights apply where the law provides them, including any
              lawful exceptions for the specific transaction. See the{" "}
              <Link href="/delivery-returns/" className="underline">delivery and returns policy</Link>{" "}
              and contact us before transporting or returning dangerous goods.
            </p>
          </section>

          <section>
            <h2 className="font-display text-xl text-ink">Liability</h2>
            <p className="mt-2">
              Products must be used in line with their intended application, the
              product label and safety guidance. Confirm suitability for your
              equipment before use. Nothing in these terms removes a consumer
              right or excludes liability that cannot lawfully be excluded under
              applicable South African law. Safety instructions do not replace
              our obligations as the supplier.
            </p>
          </section>
          <section>
            <h2 className="font-display text-xl text-ink">Questions and complaints</h2>
            <p className="mt-2">Use the published <Link href="/contact/" className="underline">support contact</Link> with your order reference and a description of the issue. We will assess it and explain the next steps. These terms do not prevent you from approaching a competent regulator, tribunal or court, or exercising statutory remedies.</p>
          </section>
        </div>
      </div>
    </>
  );
}
