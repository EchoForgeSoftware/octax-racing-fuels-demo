import Link from "next/link";
import type { Metadata } from "next";
import { Breadcrumbs } from "@/components/Breadcrumbs";
import { JsonLd } from "@/components/JsonLd";
import { buildMetadata } from "@/lib/metadata";
import { breadcrumbSchema } from "@/lib/schema";
import { SITE } from "@/lib/site";

export const metadata: Metadata = buildMetadata({
  path: "/privacy/",
  title: "Privacy Policy",
  description:
    "How Octax Racing Fuels collects, uses and protects the personal information you provide when ordering fuels and additives online.",
});

const trail = [
  { name: "Home", path: "/" },
  { name: "Privacy Policy", path: "/privacy/" },
];

export default function PrivacyPage() {
  return (
    <>
      <JsonLd data={breadcrumbSchema(trail)} />
      <Breadcrumbs trail={trail} />

      <div className="mx-auto max-w-3xl px-4 py-12 sm:px-6">
        <p className="kicker text-flare">Legal</p>
        <h1 className="mt-3 font-display text-[clamp(2.2rem,7vw,4rem)]">Privacy policy</h1>
        <p className="mt-4 text-ink-soft">
          This policy explains what personal information Octax Racing Fuels collects
          and how it is used. It is a demonstration template and should be reviewed by
          the business before the site goes live.
        </p>

        <div className="mt-10 space-y-8 text-muted">
          <section>
            <h2 className="font-display text-xl font-bold text-ink">What we collect</h2>
            <p className="mt-2">
              When you place an order or contact us, we collect the details you
              provide: your name, email address, phone number and delivery address.
              Your cart is stored locally in your browser and is not sent to us until
              you check out.
            </p>
          </section>

          <section>
            <h2 className="font-display text-xl font-bold text-ink">How we use it</h2>
            <p className="mt-2">
              We use your information to process and deliver orders, to respond to
              enquiries, and to meet the record-keeping and transport requirements that
              apply to fuels and dangerous goods. We do not sell your personal
              information.
            </p>
          </section>

          <section>
            <h2 className="font-display text-xl font-bold text-ink">Cookies and local storage</h2>
            <p className="mt-2">
              This site uses your browser&apos;s local storage to remember the contents
              of your cart between visits. It does not use advertising or tracking
              cookies.
            </p>
          </section>

          <section>
            <h2 className="font-display text-xl font-bold text-ink">Retention and your rights</h2>
            <p className="mt-2">
              We keep order records only as long as needed for the order and for legal
              and tax obligations. You can ask us to access, correct or delete the
              personal information we hold about you.
            </p>
          </section>

          <section>
            <h2 className="font-display text-xl font-bold text-ink">Contact</h2>
            <p className="mt-2">
              For any privacy question, email{" "}
              <a href={`mailto:${SITE.email}`} className="text-flare hover:underline">
                {SITE.email}
              </a>{" "}
              or use the{" "}
              <Link href="/contact/" className="text-flare hover:underline">
                contact page
              </Link>
              .
            </p>
          </section>
        </div>
      </div>
    </>
  );
}
