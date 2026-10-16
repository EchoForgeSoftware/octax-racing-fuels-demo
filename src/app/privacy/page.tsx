import Link from "next/link";
import type { Metadata } from "next";
import { Breadcrumbs } from "@/components/Breadcrumbs";
import { JsonLd } from "@/components/JsonLd";
import { buildMetadata } from "@/lib/metadata";
import { breadcrumbSchema } from "@/lib/schema";
import { SITE, LEGAL } from "@/lib/site";
import { BusinessDetails } from "@/components/BusinessDetails";

export const metadata: Metadata = buildMetadata({
  path: "/privacy/",
  title: "Privacy Policy",
  description:
    "How OCTA Performance collects, uses and protects the personal information you provide when ordering OCTA products online.",
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
          {SITE.legalName}, trading as OCTA Performance, is responsible for the
          customer information described here. This notice explains the site&apos;s
          handling of personal information. Version {LEGAL.version}.
        </p>

        <div className="mt-10 space-y-8 text-muted">
          <BusinessDetails />
          <section>
            <h2 className="font-display text-xl text-ink">What we collect</h2>
            <p className="mt-2">
              When you place an order or contact us, we collect the details you
              provide: your name, email address, phone number and delivery address.
              Your cart is stored locally in your browser and is not sent to us until
              you check out.
            </p>
            <p className="mt-2">Account registration adds your email and account details; checkout records the products, delivery details (including any company name and VAT number you add for a tax invoice), payment reference and outcome, and the version and time of your terms acknowledgement. Hosting and security systems may process technical request data such as network addresses and access logs. A contact form opens a draft in your own email app; you choose whether to send it.</p>
          </section>

          <section>
            <h2 className="font-display text-xl text-ink">How we use it</h2>
            <p className="mt-2">
              We use your information to process and deliver orders, to respond to
              enquiries, and to meet the record-keeping and transport requirements that
              apply to fuels and dangerous goods. We do not sell your personal
              information.
            </p>
            <p className="mt-2">We process the information needed to respond to your request, administer your account, perform an order, protect the service and meet applicable legal duties. Providing delivery and contact details is necessary to fulfil an order; optional company details can be left blank. We do not enrol you in marketing from a purchase or account registration.</p>
          </section>

          <section>
            <h2 className="font-display text-xl text-ink">Reseller applications</h2>
            <p className="mt-2">If you apply to become a reseller, we collect your contact details, business name/type and location, any company registration and VAT numbers and public shop links you provide, product interests, expected volume and descriptions of your business and handling arrangements. We use this to assess the business, verify relevant information, contact you and record our decision. Applying does not subscribe you to marketing or appoint you as an agent.</p>
            <p className="mt-2">When the application service is enabled, applications are stored privately in Supabase and sent to our review inbox through Resend. Applicants cannot read other applications. We may request supporting business information during review; do not submit identity documents, bank details or passwords through this form. Application data follows the business retention schedule and the rights described below.</p>
          </section>

          <section>
            <h2 className="font-display text-xl text-ink">Cookies and local storage</h2>
            <p className="mt-2">
              This site uses your browser&apos;s local storage to remember the contents
              of your cart between visits. It does not use advertising or tracking
              cookies.
            </p>
            <p className="mt-2">
              If you create an account, Supabase manages your sign-in and password
              reset emails. Your sign-in session is remembered in this browser.
              Saved delivery details and orders are stored in our Supabase project;
              your account can only read its own profile and orders. The latest
              order confirmation is also kept in this tab&apos;s session storage.
            </p>
            <p className="mt-2">
              If you choose Ozow, we send the order amount and payment reference
              to Ozow so it can process payment. Banking details are entered on
              the payment provider&apos;s page. We store the payment reference and
              verified outcome with your order. A temporary token in this tab
              lets you check that order&apos;s payment status. Payment requests are
              also rate limited using a hashed network identifier.
            </p>
            <p className="mt-2">When enabled, Cloudflare Turnstile processes security signals to distinguish legitimate requests from automated abuse on account, payment and reseller forms. Its token is validated by the relevant service. We do not use this security check to enrol you in advertising.</p>
          </section>

          <section>
            <h2 className="font-display text-xl text-ink">Service providers and transfers</h2>
            <p className="mt-2">Our hosting, account/database and payment providers process information needed to operate the service. Delivery providers receive the details needed for delivery; professional advisers or authorities may receive information where required or permitted by law. Supabase manages accounts and order storage, and Ozow handles its hosted payment flow. A selected hosting provider and its processing locations must be confirmed before launch.</p>
            <p className="mt-2">Some providers may process information outside South Africa. Before enabling those services for live customers, we must confirm the applicable processing agreements and lawful safeguards for those transfers. We restrict access to customer data and do not publish customer addresses or order histories in search results.</p>
          </section>

          <section>
            <h2 className="font-display text-xl text-ink">Retention and your rights</h2>
            <p className="mt-2">
              We keep order records only as long as needed for the order and for legal
              and tax obligations, disputes and security needs. The business must
              maintain and apply a retention schedule; a request to delete an
              account may not remove records that must legally be retained.
              You can request access or correction, ask for deletion where
              applicable, or object to processing as permitted by law. We may
              need to verify your identity proportionately before acting.
            </p>
            <p className="mt-2">You can edit saved delivery details in your account, sign out on shared devices, and clear the site&apos;s browser storage. Clearing browser storage removes the local cart/session; it does not itself delete server records. Where processing relies on consent, you may withdraw that consent without affecting earlier lawful processing.</p>
          </section>

          <section>
            <h2 className="font-display text-xl text-ink">Contact</h2>
            <p className="mt-2">
              Use the published privacy contact above, or the{" "}
              <Link href="/contact/" className="text-flare hover:underline">
                contact page
              </Link>
              .
            </p>
            <p className="mt-2">You may also lodge a complaint with South Africa&apos;s <a href="https://inforegulator.org.za/complaints/" rel="noopener noreferrer" className="underline">Information Regulator</a>. We will investigate suspected compromises and make notifications where the law requires them. Changes to this notice will be published here with a revised version.</p>
          </section>
        </div>
      </div>
    </>
  );
}
