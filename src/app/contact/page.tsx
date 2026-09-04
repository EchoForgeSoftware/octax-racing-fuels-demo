import type { Metadata } from "next";
import { Breadcrumbs } from "@/components/Breadcrumbs";
import { ContactForm } from "@/components/ContactForm";
import { JsonLd } from "@/components/JsonLd";
import { buildMetadata } from "@/lib/metadata";
import { breadcrumbSchema } from "@/lib/schema";
import { SITE } from "@/lib/site";

export const metadata: Metadata = buildMetadata({
  path: "/contact/",
  title: "Contact",
  description:
    "Get in touch with Octax Racing Fuels for fuel selection advice, orders, delivery and bulk or trade enquiries.",
});

const trail = [
  { name: "Home", path: "/" },
  { name: "Contact", path: "/contact/" },
];

export default function ContactPage() {
  return (
    <>
      <JsonLd data={breadcrumbSchema(trail)} />
      <Breadcrumbs trail={trail} />

      <div className="mx-auto max-w-6xl px-4 py-8">
        <header className="max-w-2xl">
          <h1 className="font-display text-4xl font-bold">Contact us</h1>
          <p className="mt-3 text-muted">
            Tell us about your engine, class and the fuel you are running now, and we
            will recommend the right blend. For orders and delivery, include your
            location.
          </p>
        </header>

        <div className="mt-10 grid gap-10 lg:grid-cols-[1.4fr_1fr]">
          <div className="rounded-2xl border border-border bg-surface p-6 sm:p-8">
            <ContactForm />
          </div>

          <aside className="space-y-6">
            <div className="rounded-xl border border-border bg-surface p-6">
              <h2 className="font-display text-lg font-semibold">Reach us directly</h2>
              <dl className="mt-4 space-y-3 text-sm">
                <div>
                  <dt className="text-muted">Email</dt>
                  <dd>
                    <a href={`mailto:${SITE.email}`} className="text-brand hover:underline">
                      {SITE.email}
                    </a>
                  </dd>
                </div>
                <div>
                  <dt className="text-muted">Phone</dt>
                  <dd>
                    <a href={`tel:${SITE.phoneHref}`} className="text-brand hover:underline">
                      {SITE.phoneDisplay}
                    </a>
                  </dd>
                </div>
              </dl>
            </div>

            <div className="rounded-xl border border-border bg-surface p-6 text-sm text-muted">
              Contact details and location are placeholders in this demo. Real details
              are added when the site goes to production.
            </div>
          </aside>
        </div>
      </div>
    </>
  );
}
