import Link from "next/link";
import type { Metadata } from "next";
import { buildMetadata } from "@/lib/metadata";

export const metadata: Metadata = buildMetadata({
  path: "/checkout/error/",
  title: "Payment Failed",
  description: "The payment could not be completed. Your cart has been kept so you can try again.",
});

export default function CheckoutErrorPage() {
  return (
    <div className="mx-auto max-w-7xl px-4 py-20 sm:px-6">
      <div className="mx-auto max-w-xl border-2 border-ink bg-panel p-8 text-center shadow-[10px_10px_0_0_var(--color-flare)] sm:p-10">
        <div className="animate-pop mx-auto grid h-14 w-14 place-items-center bg-flare">
          <svg width="26" height="26" viewBox="0 0 24 24" fill="none" stroke="var(--color-paper)" strokeWidth="3" aria-hidden="true">
            <path d="M6 6l12 12M6 18L18 6" strokeLinecap="round" />
          </svg>
        </div>
        <h1 className="mt-5 font-display text-[clamp(2rem,7vw,3.5rem)] leading-none">Payment declined</h1>
        <p className="mt-4 text-ink-soft">
          The payment could not be completed. No money has been taken. Your cart has been
          kept, so you can check your details and try again.
        </p>
        <div className="mt-6 border-2 border-ink bg-ink p-4 text-left">
          <p className="kicker text-lime">Common causes</p>
          <ul className="mt-3 space-y-2 text-sm text-paper/80">
            <li className="flex gap-2"><span className="mt-2 h-1.5 w-1.5 shrink-0 bg-flare" />Card details entered incorrectly</li>
            <li className="flex gap-2"><span className="mt-2 h-1.5 w-1.5 shrink-0 bg-flare" />Insufficient funds or a bank hold</li>
            <li className="flex gap-2"><span className="mt-2 h-1.5 w-1.5 shrink-0 bg-flare" />The bank flagged the transaction for review</li>
          </ul>
        </div>
        <div className="mt-7 flex flex-wrap justify-center gap-3">
          <Link href="/checkout/" className="border-2 border-ink bg-flare px-6 py-3.5 font-display uppercase text-paper transition-colors hover:bg-ink">
            Try again
          </Link>
          <Link href="/cart/" className="border-2 border-ink px-6 py-3.5 font-display uppercase text-ink transition-colors hover:bg-ink hover:text-lime">
            Back to cart
          </Link>
        </div>
        <p className="mt-6 font-mono text-xs uppercase tracking-wider text-muted">
          Still stuck?{" "}
          <Link href="/contact/" className="text-flare underline">Contact support</Link>
        </p>
      </div>
    </div>
  );
}
