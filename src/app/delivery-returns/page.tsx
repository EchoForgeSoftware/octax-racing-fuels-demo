import Link from "next/link";
import { Breadcrumbs } from "@/components/Breadcrumbs";
import { BusinessDetails } from "@/components/BusinessDetails";
import { buildMetadata } from "@/lib/metadata";
import { LEGAL } from "@/lib/site";

export const metadata = buildMetadata({ path: "/delivery-returns/", title: "Delivery, Cancellations & Returns",
  description: "OCTA delivery charges, dangerous-goods handling, cancellation requests and returns support." });

export default function DeliveryReturnsPage() {
  return <>
    <Breadcrumbs trail={[{ name: "Home", path: "/" }, { name: "Delivery & returns", path: "/delivery-returns/" }]} />
    <article className="mx-auto max-w-3xl px-4 py-12 sm:px-6">
      <p className="kicker text-flare">Order support · version {LEGAL.version}</p>
      <h1 className="mt-3 font-display text-[clamp(2.2rem,7vw,4rem)]">Delivery & returns</h1>
      <div className="mt-8 space-y-8 text-ink-soft">
        <section><h2 className="font-display text-xl text-ink">Delivery charges</h2><p className="mt-2">Standard courier is R200 per pack for 5L, 25L and 500ml packs. Delivery is free on a line of at least 10 of the same 5L or 25L product, or at least 12 of the same 500ml product. Each 210L drum carries a R200 courier charge. Other sizes require a delivery quote. Checkout shows the applicable total; confirm any quoted delivery charge before paying.</p></section>
        <section><h2 className="font-display text-xl text-ink">Delivery arrangements</h2><p className="mt-2">We confirm availability, delivery coverage and estimated dispatch or delivery dates for your order. Dangerous-goods transport requirements may limit routes and affect timing. Provide an accurate delivery address and a contact number. Tell us promptly about delays, non-delivery, leaks, damage or an incorrect product.</p></section>
        <section><h2 className="font-display text-xl text-ink">Cancelling an order</h2><p className="mt-2">Contact support with the order reference as soon as you want to cancel or correct an order. Tell us whether payment has been made and whether the goods have been delivered. Statutory cancellation and cooling-off rights, their time limits and any lawful exceptions apply to the particular transaction. We will explain the applicable process and any legally permitted charges before arranging a cancellation or return.</p></section>
        <section><h2 className="font-display text-xl text-ink">Faulty, damaged or incorrect goods</h2><p className="mt-2">Keep the order reference, container label and batch information, and describe the problem. Photographs can help if they can be taken safely. Do not use a product you believe is unsafe or incorrectly supplied. Where the law entitles you to a repair, replacement, refund or other remedy, this policy does not remove that entitlement.</p></section>
        <section><h2 className="font-display text-xl text-ink">Returning fuels safely</h2><p className="mt-2">Contact us before sending anything back. Fuels and additives may need an approved dangerous-goods carrier and suitable packaging. Do not put leaking or flammable goods into ordinary post or hand them to an unapproved courier. An opened container does not automatically remove your statutory rights; tell us its condition so we can assess the request and arrange safe handling.</p></section>
        <section><h2 className="font-display text-xl text-ink">Refunds and complaints</h2><p className="mt-2">We assess requests under the applicable consumer law and communicate the outcome, refund method and timing. We do not ask for your banking password or OTP to process a refund. If an issue is unresolved, your right to approach a competent regulator or other dispute-resolution body remains available.</p></section>
        <p>Read our <Link href="/terms/" className="underline">terms of sale</Link> and <Link href="/privacy/" className="underline">privacy notice</Link>, or use the <Link href="/contact/" className="underline">contact page</Link>.</p>
        <BusinessDetails />
      </div>
    </article>
  </>;
}
