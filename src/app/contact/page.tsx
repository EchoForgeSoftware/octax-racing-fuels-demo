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

      <div className="mx-auto max-w-7xl px-4 py-12 sm:px-6">
        <header className="max-w-2xl">
          <p className="kicker text-flare">Get in touch</p>
          <h1 className="mt-3 font-display text-[clamp(2.4rem,8vw,5rem)]">Contact us</h1>
          <p className="mt-4 text-ink-soft">
            Tell us about your engine, class and the fuel you are running now, and we will
            recommend the right blend. For orders and delivery, include your location.
          </p>
        </header>

        <div className="mt-10 grid gap-8 lg:grid-cols-[1.4fr_1fr]">
          <div className="border-2 border-ink bg-panel p-6 sm:p-8">
            <ContactForm />
          </div>

          <aside className="space-y-6">
            <div className="border-2 border-ink bg-ink p-6 text-paper">
              <h2 className="kicker text-lime">Reach us directly</h2>
              <dl className="mt-4 space-y-4 text-sm">
                <div>
                  <dt className="font-mono text-xs uppercase tracking-wider text-paper/50">Email</dt>
                  <dd className="mt-1"><a href={`mailto:${SITE.email}`} className="text-lime hover:underline">{SITE.email}</a></dd>
                </div>
                <div>
                  <dt className="font-mono text-xs uppercase tracking-wider text-paper/50">Phone</dt>
                  <dd className="mt-1"><a href={`tel:${SITE.phoneHref}`} className="text-lime hover:underline">{SITE.phoneDisplay}</a></dd>
                </div>
              </dl>
            </div>

            <div className="border-2 border-ink p-6 text-sm text-muted">
              Contact details and location are placeholders in this demo. Real details are
              added when the site goes to production.
            </div>
          </aside>
        </div>
      </div>
    </>
  );
}
