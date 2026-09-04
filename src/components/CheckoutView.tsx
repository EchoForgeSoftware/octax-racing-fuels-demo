"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState, type FormEvent } from "react";
import { useCart } from "./CartContext";
import { formatPrice } from "@/lib/format";

const inputClass =
  "mt-1 w-full border-2 border-ink bg-paper-2 px-3 py-2.5 text-sm outline-none focus:border-flare";

type Errors = Record<string, string>;

export function CheckoutView() {
  const { items, subtotal, clear, ready } = useCart();
  const router = useRouter();
  const [errors, setErrors] = useState<Errors>({});
  const [placing, setPlacing] = useState(false);

  if (!ready) return <p className="text-muted">Loading&hellip;</p>;

  if (items.length === 0) {
    return (
      <div className="border-2 border-ink bg-panel p-10 text-center">
        <p className="font-display text-xl font-semibold">Nothing to check out</p>
        <p className="mt-2 text-muted">Your cart is empty.</p>
        <Link
          href="/shop/"
          className="mt-6 inline-block bg-flare px-6 py-3 font-semibold text-paper transition-colors hover:bg-ink"
        >
          Shop products
        </Link>
      </div>
    );
  }

  function onSubmit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const data = new FormData(e.currentTarget);
    const required = ["fullname", "email", "phone", "address", "city", "postcode"];
    const next: Errors = {};
    for (const key of required) {
      if (!(data.get(key) as string)?.trim()) next[key] = "Required";
    }
    const email = (data.get("email") as string)?.trim();
    if (email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email))
      next.email = "Enter a valid email";
    setErrors(next);
    if (Object.keys(next).length > 0) return;

    setPlacing(true);
    // Simulated order: no payment, no network call. Clear cart and confirm.
    clear();
    router.push("/checkout/success/");
  }

  const delivery = 0;

  return (
    <form onSubmit={onSubmit} noValidate className="grid gap-8 lg:grid-cols-[1.5fr_1fr]">
      <div className="space-y-8">
        <fieldset className="border-2 border-ink bg-panel p-6">
          <legend className="px-2 font-display text-lg font-semibold">
            Delivery details
          </legend>
          <div className="grid gap-4 sm:grid-cols-2">
            <Field name="fullname" label="Full name" autoComplete="name" error={errors.fullname} />
            <Field name="email" label="Email" type="email" autoComplete="email" error={errors.email} />
            <Field name="phone" label="Phone" type="tel" autoComplete="tel" error={errors.phone} />
            <Field name="company" label="Team / company (optional)" autoComplete="organization" />
            <div className="sm:col-span-2">
              <Field name="address" label="Delivery address" autoComplete="address-line1" error={errors.address} />
            </div>
            <Field name="city" label="City / town" autoComplete="address-level2" error={errors.city} />
            <Field name="postcode" label="Postal code" autoComplete="postal-code" error={errors.postcode} />
          </div>
        </fieldset>

        <fieldset className="border-2 border-ink bg-panel p-6">
          <legend className="px-2 font-display text-lg font-semibold">Payment</legend>
          <div className="border border-dashed border-ink bg-paper-2 p-5 text-sm text-muted">
            This is a demo checkout. No card fields are shown and no payment is taken.
            On the live site, a secure payment provider is integrated here at
            production handoff.
          </div>
        </fieldset>
      </div>

      <aside className="h-fit border-2 border-ink bg-panel p-6">
        <h2 className="font-display text-lg font-semibold">Order summary</h2>
        <ul className="mt-4 space-y-3 text-sm">
          {items.map((i) => (
            <li key={i.sku} className="flex justify-between gap-3">
              <span className="min-w-0 text-muted">
                {i.qty} &times; {i.name}{" "}
                <span className="text-muted">({i.size})</span>
              </span>
              <span className="whitespace-nowrap font-medium">
                {formatPrice(i.price * i.qty)}
              </span>
            </li>
          ))}
        </ul>
        <dl className="mt-4 space-y-2 border-t-2 border-ink pt-4 text-sm">
          <div className="flex justify-between">
            <dt className="text-muted">Subtotal</dt>
            <dd className="font-medium">{formatPrice(subtotal)}</dd>
          </div>
          <div className="flex justify-between">
            <dt className="text-muted">Delivery (demo)</dt>
            <dd className="font-medium">{formatPrice(delivery)}</dd>
          </div>
        </dl>
        <div className="mt-4 flex justify-between border-t-2 border-ink pt-4">
          <span className="font-semibold">Total</span>
          <span className="font-display text-xl font-bold text-flare">
            {formatPrice(subtotal + delivery)}
          </span>
        </div>
        <button
          type="submit"
          disabled={placing}
          className="mt-6 w-full bg-flare px-5 py-3 font-semibold text-paper transition-colors hover:bg-ink disabled:opacity-50"
        >
          {placing ? "Placing order…" : "Place order (demo)"}
        </button>
        <Link href="/cart/" className="mt-3 block text-center text-sm text-muted hover:text-ink">
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
  error,
}: {
  name: string;
  label: string;
  type?: string;
  autoComplete?: string;
  error?: string;
}) {
  return (
    <div>
      <label htmlFor={name} className="text-sm font-medium">
        {label}
      </label>
      <input
        id={name}
        name={name}
        type={type}
        autoComplete={autoComplete}
        aria-invalid={!!error}
        aria-describedby={error ? `${name}-err` : undefined}
        className={inputClass}
      />
      {error && (
        <p id={`${name}-err`} className="mt-1 text-xs text-flare">
          {error}
        </p>
      )}
    </div>
  );
}
