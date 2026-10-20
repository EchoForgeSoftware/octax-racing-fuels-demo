"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { Icon } from "./Icon";
import { BankDetails } from "./BankDetails";
import { formatPrice } from "@/lib/format";
import { readOrder, type PlacedOrder } from "@/lib/order";
import { SITE, hasBankDetails } from "@/lib/site";
import { useAuth } from "./AuthContext";

export function OrderConfirmation() {
  // Read on the client after mount so the static HTML stays stable.
  const [order, setOrder] = useState<PlacedOrder | null>(null);
  const { user, enabled } = useAuth();

  useEffect(() => {
    setOrder(readOrder());
  }, []);

  if (!order || order.paymentMethod === "ozow") {
    return (
      <div className="mx-auto max-w-xl border-2 border-ink bg-panel p-8 text-center">
        <h1 className="font-display text-3xl">{order?.paymentMethod === "ozow" ? "Check your Ozow payment" : "No order to display"}</h1>
        <p className="mt-4 text-ink-soft">{order?.paymentMethod === "ozow" ? "Your order uses Ozow. Check its verified payment status before making another payment." : "Your order details aren’t available in this browser tab. Check your account for saved orders. Please confirm your order reference and total before paying."}</p>
        <Link href={order?.paymentMethod === "ozow" ? "/checkout/ozow/" : "/account/"} className="mt-6 inline-block border-2 border-ink bg-flare px-6 py-3 font-display uppercase text-paper">{order?.paymentMethod === "ozow" ? "Check payment status" : "My account"}</Link>
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-xl border-2 border-ink bg-panel p-8 shadow-[10px_10px_0_0_var(--color-lime)] sm:p-10">
      <div className="text-center">
        <div className="animate-pop mx-auto grid h-14 w-14 place-items-center bg-lime text-ink shadow-[5px_5px_0_0_var(--color-ink)]">
          <Icon name="check" size={28} strokeWidth={3} />
        </div>
        <h1 className="mt-5 font-display text-[clamp(2rem,7vw,3.5rem)] leading-none">Order received</h1>
        <p className="mt-4 text-ink-soft">
          Thanks{order?.name ? `, ${order.name.split(" ")[0]}` : ""}. Pay by EFT using the details
          below and your order reference. We confirm dispatch arrangements once
          payment and delivery availability have been checked.
        </p>
      </div>

      {order && (
        <div className="mt-7 grid gap-px border-2 border-ink bg-ink sm:grid-cols-2">
          <div className="min-w-0 bg-paper p-4">
            <p className="kicker text-muted">Order reference</p>
            <p className="num mt-1 break-all font-display text-xl sm:text-2xl">{order.ref}</p>
          </div>
          <div className="bg-paper p-4">
            <p className="kicker text-muted">Amount to pay</p>
            <p className="num mt-1 font-display text-2xl text-flare">{formatPrice(order.total)}</p>
            <p className="num mt-0.5 text-xs text-muted">
              {formatPrice(order.subtotal)} + {order.courier > 0 ? `${formatPrice(order.courier)} ${order.delivery?.method === "local" ? "local delivery" : "courier"}` : order.delivery?.method === "collect" ? "collect (free)" : "free delivery"}
            </p>
          </div>
        </div>
      )}

      {order?.delivery?.method === "collect" && (
        <section className="mt-7 border-2 border-ink bg-lime p-4">
          <h2 className="font-display text-xl">Collect your order</h2>
          {order.collection?.address ? (
            <p className="mt-2 whitespace-pre-line text-sm">{order.collection.address}{order.collection.hours ? `\n${order.collection.hours}` : ""}</p>
          ) : <p className="mt-2 text-sm">We&apos;ll contact you with the collection address and time.</p>}
          <p className="mt-2 text-xs">Bring your order reference. Collection is once your payment has reflected.</p>
        </section>
      )}

      <section className="mt-7">
        <h2 className="font-display text-xl">Pay by EFT</h2>
        {hasBankDetails ? (
          <>
            <div className="mt-3">
              <BankDetails reference={order?.ref} />
            </div>
            <ol className="mt-4 space-y-2 text-sm text-ink-soft">
              <li>1. Use <strong className="text-ink">{order?.ref ?? "your order reference"}</strong> as the payment reference.</li>
              <li>
                2. Email your proof of payment to{" "}
                <a href={`mailto:${SITE.email}${order ? `?subject=Proof of payment ${order.ref}` : ""}`} className="font-bold text-ink underline hover:text-flare">
                  {SITE.email}
                </a>.
              </li>
              <li>3. We dispatch once the payment reflects in our account.</li>
            </ol>
          </>
        ) : (
          <p className="mt-3 border-2 border-dashed border-ink bg-paper-2 p-4 text-sm text-ink-soft">
            We will send our bank details to {order?.email || "you"} with your order
            reference. Your order is dispatched once payment reflects.
          </p>
        )}
      </section>

      {order && order.items.length > 0 && (
        <section className="mt-7">
          <h2 className="kicker text-muted">Your order</h2>
          <ul className="num mt-3 divide-y divide-line border-2 border-ink text-sm">
            {order.items.map((i) => (
              <li key={i.sku} className="flex justify-between gap-3 px-4 py-2.5">
                <span className="min-w-0">
                  <span className="font-mono font-bold">{i.qty}&times;</span> {i.name}{" "}
                  <span className="font-mono text-xs uppercase text-muted">{i.size}</span>
                </span>
                <span className="whitespace-nowrap font-bold">{formatPrice(i.price * i.qty)}</span>
              </li>
            ))}
          </ul>
        </section>
      )}

      {enabled && !user && (
        <p className="mt-7 border-2 border-dashed border-ink bg-paper-2 p-4 text-sm text-ink-soft">
          <Link href="/account/register/" className="font-bold text-ink underline hover:text-flare">Create an account</Link>{" "}
          with {order?.email || "your email"} to save your details and reorder in one click next time.
        </p>
      )}

      <div className="mt-8 flex flex-wrap justify-center gap-3">
        <Link href="/shop/" className="border-2 border-ink bg-flare px-6 py-3.5 font-display uppercase text-paper transition-colors hover:bg-ink">
          Continue shopping
        </Link>
        <Link href="/" className="border-2 border-ink px-6 py-3.5 font-display uppercase text-ink transition-colors hover:bg-ink hover:text-lime">
          Back to home
        </Link>
      </div>
    </div>
  );
}
