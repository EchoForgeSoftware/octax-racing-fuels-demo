import Link from "next/link";
import { Breadcrumbs } from "@/components/Breadcrumbs";
import { BusinessDetails } from "@/components/BusinessDetails";
import { buildMetadata } from "@/lib/metadata";
import { LEGAL } from "@/lib/site";
import { DeliveryPolicy } from "@/components/DeliveryPolicy";

export const metadata = buildMetadata({ path: "/delivery-returns/", title: "Delivery, Cancellations & Returns",
  description: "OCTA local delivery and courier charges, exchanges for incorrectly supplied stock, returns and limitation of liability." });

const h2 = "font-display text-xl text-ink";

export default function DeliveryReturnsPage() {
  return <>
    <Breadcrumbs trail={[{ name: "Home", path: "/" }, { name: "Delivery & returns", path: "/delivery-returns/" }]} />
    <article className="mx-auto max-w-3xl px-4 py-12 sm:px-6">
      <p className="kicker text-flare">ZRG-X (PTY) LTD, trading as OCTA Performance · version {LEGAL.version}</p>
      <h1 className="mt-3 font-display text-[clamp(2.2rem,7vw,4rem)]">Delivery & returns</h1>
      <div className="mt-8 space-y-8 text-ink-soft">
        <section>
          <h2 className={h2}>Delivery</h2>
          <DeliveryPolicy />
          <p className="mt-2">Free courier applies when you order:</p>
          <ul className="mt-1 list-inside list-disc space-y-1">
            <li>10 or more units of the same 5 L or 25 L product, or</li>
            <li>12 or more units of the same 500 ml product.</li>
          </ul>
          <p className="mt-2">Delivery times are typically 24–48 hours after dispatch, subject to the courier service.</p>
          <p className="mt-2">We are not responsible for delays caused by the courier, weather, road conditions, or incorrect delivery details provided by the customer.</p>
        </section>
        <section>
          <h2 className={h2}>Returns & exchanges</h2>
          <h3 className="mt-4 font-bold text-ink">Incorrectly supplied stock</h3>
          <p className="mt-1">If we accidentally supply the wrong product, please keep the original invoice and contact us within 7 days of delivery.</p>
          <p className="mt-2">We will arrange an exchange for the correct item at no extra cost. The return of the incorrect product will be for our account.</p>
          <h3 className="mt-4 font-bold text-ink">No returns for change of mind</h3>
          <p className="mt-1">Because these are specialised performance fuels and additives, we do not accept returns for change of mind, ordering the wrong product, or if the product does not meet your expectations after use.</p>
        </section>
        <section>
          <h2 className={h2}>Limitation of liability</h2>
          <p className="mt-2">All products are sold strictly subject to the warnings, instructions and conditions printed on the product label and packaging.</p>
          <p className="mt-2">OCTA Performance accepts no liability for any loss, damage, engine failure, injury or other consequence arising from the use, handling, storage, mixing or application of these products. This includes, but is not limited to:</p>
          <ul className="mt-1 list-inside list-disc space-y-1">
            <li>Incorrect application or dosing</li>
            <li>Contaminated fuel systems</li>
            <li>Failure to follow the instructions on the label</li>
            <li>Any other misuse or improper handling</li>
          </ul>
          <p className="mt-2">By purchasing any product from OCTA Performance, the customer acknowledges that they have read and understood the product label and accept full responsibility for the correct, safe and appropriate use of the product.</p>
          <p className="mt-2 text-sm">Nothing in this policy excludes rights or liability that cannot lawfully be excluded under South African law, including the Consumer Protection Act.</p>
        </section>
        <p>Read our <Link href="/terms/" className="underline">terms of sale</Link> and <Link href="/privacy/" className="underline">privacy notice</Link>, or use the <Link href="/contact/" className="underline">contact page</Link>.</p>
        <BusinessDetails />
      </div>
    </article>
  </>;
}
