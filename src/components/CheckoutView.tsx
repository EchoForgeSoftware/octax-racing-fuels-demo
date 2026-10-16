"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useRef, useState, type FormEvent } from "react";
import { useCart } from "./CartContext";
import { formatPrice } from "@/lib/format";
import { ProcessingOverlay } from "./ProcessingOverlay";
import { Icon } from "./Icon";
import { OrderTotals } from "./OrderTotals";
import { courierNote } from "@/lib/courier";
import { buildOrder, saveOrder } from "@/lib/order";

const inputClass =
  "mt-1.5 w-full border-2 border-ink bg-paper-2 px-3 py-2.5 text-base outline-none transition-colors focus:bg-panel aria-[invalid=true]:border-flare aria-[invalid=true]:bg-flare/5";

type Errors = Record<string, string>;

// Order matters: the first missing field in this list receives focus.
const requiredMessages: Record<string, string> = {
  fullname: "Enter the name for the delivery.",
  email: "Enter an email for the order confirmation.",
  phone: "Enter a phone number for the driver.",
  address: "Enter the street address for delivery.",
  city: "Enter the city or town.",
  postcode: "Enter the postal code.",
};

export function CheckoutView() {
  const { items, subtotal, clear, ready } = useCart();
  const router = useRouter();
  const [errors, setErrors] = useState<Errors>({});
  const [processing, setProcessing] = useState(false);
  const formRef = useRef<HTMLFormElement | null>(null);

  const PROCESS_MS = 1800;

  if (!ready) return <p className="font-mono text-sm uppercase tracking-wider text-muted">Loading&hellip;</p>;

  if (items.length === 0) {
    return (
      <div className="border-2 border-ink bg-panel p-8 text-center sm:p-12">
        <h2 className="font-display text-[clamp(1.6rem,5vw,2.5rem)]">Nothing to check out</h2>
        <p className="mt-3 text-ink-soft">Your cart is empty. Add fuels or additives first.</p>
        <Link
          href="/shop/"
          className="mt-7 inline-block border-2 border-ink bg-flare px-7 py-3.5 font-display uppercase text-paper transition-colors hover:bg-ink"
        >
          Shop products
        </Link>
      </div>
    );
  }

  function validate(): boolean {
    const form = formRef.current;
    if (!form) return false;
    const data = new FormData(form);
    const next: Errors = {};
    for (const [key, message] of Object.entries(requiredMessages)) {
      if (!(data.get(key) as string)?.trim()) next[key] = message;
    }
    const email = (data.get("email") as string)?.trim();
    if (email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email))
      next.email = "Enter an email like name@example.com.";
    const phone = (data.get("phone") as string)?.trim();
    if (phone && phone.replace(/\D/g, "").length < 9)
      next.phone = "Enter a phone number with at least 9 digits.";
    setErrors(next);
    // Send keyboard and screen-reader users straight to the first problem.
    const first = Object.keys(requiredMessages).find((k) => next[k]);
    if (first) form.querySelector<HTMLInputElement>(`[name="${first}"]`)?.focus();
    return Object.keys(next).length === 0;
  }

  function onSubmit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    if (!validate()) return;
    setProcessing(true);
    // Save the order for the confirmation page (amount to pay, EFT reference).
    // Orders are not sent anywhere yet: connect an order email before launch.
    const data = new FormData(formRef.current ?? undefined);
    saveOrder(
      buildOrder(items, {
        name: String(data.get("fullname") ?? "").trim(),
        email: String(data.get("email") ?? "").trim(),
      }),
    );
    window.setTimeout(() => {
      clear();
      router.push("/checkout/success/");
    }, PROCESS_MS);
  }

  return (
    <form ref={formRef} onSubmit={onSubmit} noValidate className="grid gap-8 lg:grid-cols-[1.5fr_1fr] lg:items-start">
      {processing && <ProcessingOverlay durationMs={PROCESS_MS} />}
      <div className="space-y-8">
        <fieldset className="border-2 border-ink bg-panel p-6">
          <legend className="px-2 font-display text-2xl uppercase">
            Delivery details
          </legend>
          <p className="mb-5 font-mono text-xs uppercase tracking-wider text-muted">
            Fields marked <span className="text-flare">*</span> are required
          </p>
          <div className="grid gap-5 sm:grid-cols-2">
            <Field name="fullname" label="Full name" autoComplete="name" required error={errors.fullname} />
            <Field name="email" label="Email" type="email" autoComplete="email" required error={errors.email} />
            <Field name="phone" label="Phone" type="tel" autoComplete="tel" required error={errors.phone} />
            <Field name="company" label="Team / company" autoComplete="organization" />
            <div className="sm:col-span-2">
              <Field name="address" label="Delivery address" autoComplete="address-line1" required error={errors.address} />
            </div>
            <Field name="city" label="City / town" autoComplete="address-level2" required error={errors.city} />
            <Field name="postcode" label="Postal code" autoComplete="postal-code" inputMode="numeric" required error={errors.postcode} />
          </div>
        </fieldset>

        <fieldset className="border-2 border-ink bg-panel p-6">
          <legend className="px-2 font-display text-2xl uppercase">Payment</legend>
          <div className="flex gap-4 border-2 border-ink bg-paper-2 p-5 text-sm text-ink-soft">
            <span className="grid h-10 w-10 shrink-0 place-items-center bg-ink font-mono text-xs font-bold text-lime">EFT</span>
            <p>
              Pay by EFT (bank transfer). After you place your order you will get our
              bank details and your order reference. Your order is dispatched once the
              payment reflects.
            </p>
          </div>
        </fieldset>
      </div>

      <aside className="border-2 border-ink bg-panel p-6 shadow-[8px_8px_0_0_var(--color-ink)] lg:sticky lg:top-24">
        <h2 className="font-display text-2xl">Order summary</h2>
        <ul className="num mt-5 space-y-3 text-sm">
          {items.map((i) => (
            <li key={i.sku} className="flex justify-between gap-3">
              <span className="min-w-0 text-ink-soft">
                <span className="font-mono font-bold text-ink">{i.qty}&times;</span> {i.name}{" "}
                <span className="font-mono text-xs uppercase text-muted">{i.size}</span>
                <span className="mt-0.5 block font-mono text-[0.68rem] uppercase tracking-wider text-muted">
                  {courierNote(i.size, i.qty)}
                </span>
              </span>
              <span className="whitespace-nowrap font-bold">
                {formatPrice(i.price * i.qty)}
              </span>
            </li>
          ))}
        </ul>
        <div className="mt-5 border-t-2 border-ink">
          <OrderTotals items={items} subtotal={subtotal} />
        </div>
        <button
          type="submit"
          disabled={processing}
          className="mt-6 flex w-full items-center justify-center gap-2 border-2 border-ink bg-flare px-5 py-3.5 font-display uppercase text-paper transition-colors hover:bg-ink disabled:cursor-wait disabled:opacity-50"
        >
          Place order
          <Icon name="arrow" size={16} />
        </button>
        <Link href="/cart/" className="mt-4 block text-center font-mono text-xs uppercase tracking-wider text-muted hover:text-ink">
          Back to cart
        </Link>
      </aside>
    </form>
  );
}

function Field({
  name,
  label,
  type = "text",
  autoComplete,
  inputMode,
  required,
  error,
}: {
  name: string;
  label: string;
  type?: string;
  autoComplete?: string;
  inputMode?: "numeric" | "tel" | "email" | "text";
  required?: boolean;
  error?: string;
}) {
  return (
    <div>
      <label htmlFor={name} className="kicker text-ink-soft">
        {label}
        {required && <span className="ml-1 text-flare" aria-hidden="true">*</span>}
      </label>
      <input
        id={name}
        name={name}
        type={type}
        autoComplete={autoComplete}
        inputMode={inputMode}
        aria-required={required || undefined}
        aria-invalid={!!error}
        aria-describedby={error ? `${name}-err` : undefined}
        className={inputClass}
      />
      {error && (
        <p id={`${name}-err`} className="mt-1.5 font-mono text-xs text-flare">
          {error}
        </p>
      )}
    </div>
  );
}
