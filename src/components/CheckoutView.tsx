"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useRef, useState, type FormEvent } from "react";
import { useCart } from "./CartContext";
import { formatPrice } from "@/lib/format";
import { ProcessingOverlay } from "./ProcessingOverlay";
import { Icon } from "./Icon";
import { OrderTotals } from "./OrderTotals";
import { cartCourier, courierNote, localTown } from "@/lib/courier";
import { CustomerInfoForm, type Contact } from "./CustomerInfoForm";
import { emptyProfile, profileErrors, type CustomerProfile } from "@/lib/backoffice/customerForm";
import { recordDemoWebsiteOrder } from "@/lib/backoffice/local";
import { usePricing } from "./PricingContext";
import { todaySA } from "@/lib/backoffice/calc";
import { buildOrder, newOrderRef, persistOrder, readOrder, saveOrder, type CustomerDetails, type PlacedOrder } from "@/lib/order";
import { useAuth } from "./AuthContext";
import { normaliseVat, vatError } from "@/lib/vat";
import { BankDetails } from "./BankDetails";
import { hasBankDetails, LEGAL } from "@/lib/site";
import { orderingEnabled, createOzowPayment, ozowEnabled } from "@/lib/payments";
import { BotCheck, useBotCheck } from "./BotCheck";

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
  accept_terms: "Please read and agree to the terms before placing your order.",
};

export function CheckoutView() {
  const bot = useBotCheck();
  const { items, subtotal, clear, ready } = useCart();
  const { user, profile, saveProfile, enabled, ready: authReady, demo } = useAuth();
  const { courierFee } = usePricing();
  const router = useRouter();
  const [errors, setErrors] = useState<Errors>({});
  const [processing, setProcessing] = useState(false);
  const [submitError, setSubmitError] = useState<string | null>(null);
  const [paymentMethod, setPaymentMethod] = useState<"ozow" | "eft">("ozow");
  // Typed delivery town; inside the local area we can arrange local delivery (cost confirmed with the customer).
  const [typedCity, setTypedCity] = useState<string | null>(null);
  // Order on a personal name or company details; companies are saved as customers straight away.
  const [orderAs, setOrderAs] = useState<"personal" | "company">(profile?.company ? "company" : "personal");
  // Permanent (account) customers fill in the Customer Information Form.
  const [openAccount, setOpenAccount] = useState(false);
  const [accountContact, setAccountContact] = useState<Contact>({ name: "", email: "", phone: "", company: "", vat: "" });
  const [accountProfile, setAccountProfile] = useState<CustomerProfile>(() => emptyProfile("company"));
  const [demoResult, setDemoResult] = useState<{ number: string; client: string; saved: boolean } | null>(null);
  const canSubmit = orderingEnabled && !demo && (paymentMethod === "eft" || ozowEnabled);
  const submitting = useRef(false);
  const pendingOrder = useRef<{ signature: string; order: PlacedOrder } | null>(null);
  const formRef = useRef<HTMLFormElement | null>(null);

  const PROCESS_MS = 1800;

  const city = typedCity ?? profile?.city ?? "";
  const local = localTown(city);
  if (demoResult) {
    return (
      <div role="status" className="border-2 border-ink bg-panel p-8 sm:p-12">
        <p className="kicker text-flare">Demo order</p>
        <h2 className="mt-2 font-display text-[clamp(1.6rem,5vw,2.5rem)]">Sample order {demoResult.number} created</h2>
        <p className="mt-3 text-ink-soft">
          No payment was taken. It is in the back office under Invoices as a website order, and on the dashboard as a pending order.{demoResult.saved ? ` ${demoResult.client} is saved under Clients.` : ""}
        </p>
        <div className="mt-6 flex flex-wrap gap-3">
          <Link href="/admin/invoices/" className="border-2 border-ink bg-ink px-5 py-3 font-display uppercase text-paper hover:bg-lime hover:text-ink">Open the back office</Link>
          <Link href="/shop/" className="border-2 border-ink px-5 py-3 font-display uppercase hover:bg-lime">Back to the shop</Link>
        </div>
      </div>
    );
  }
  if (!ready || !authReady || (user && !profile)) return <p className="font-mono text-sm uppercase tracking-wider text-muted">Loading&hellip;</p>;

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
    const vat = vatError(String(data.get("vat") ?? ""));
    if (vat) next.vat = vat;
    if (orderAs === "company" && !(data.get("company") as string)?.trim()) next.company = "Enter the company name for the invoice.";
    if (openAccount) {
      const problems = profileErrors(accountProfile, accountContact);
      if (problems.length) next.account = problems.join(" ");
    }
    setErrors(next);
    // Send keyboard and screen-reader users straight to the first problem, in form order.
    const order = ["fullname", "email", "phone", "company", "vat", "address", "city", "postcode"];
    const first = order.find((k) => next[k]);
    if (first) form.querySelector<HTMLInputElement>(`[name="${first}"]`)?.focus();
    return Object.keys(next).length === 0;
  }

  /** Demo only: the sample order goes into the back-office demo store; nothing is paid or sent. */
  function placeDemoOrder() {
    const data = new FormData(formRef.current ?? undefined);
    const get = (k: string) => String(data.get(k) ?? "").trim();
    if (data.get("accept_terms") !== "on") return setErrors({ accept_terms: requiredMessages.accept_terms });
    const result = recordDemoWebsiteOrder({
      ref: newOrderRef(), items: items.map((i) => ({ sku: i.sku, name: i.name, size: i.size, price: i.price, qty: i.qty })),
      courier: cartCourier(items, get("city"), courierFee).fee, paymentMethod, orderAs,
      customer: { name: get("fullname"), email: get("email"), phone: get("phone"), company: orderAs === "company" ? get("company") : "", vat: orderAs === "company" ? normaliseVat(get("vat")) : "", address: get("address"), city: get("city"), registration: get("registration") },
      saveCustomer: data.get("save_customer") === "on",
      profile: openAccount ? accountProfile : undefined,
    }, todaySA());
    clear();
    setDemoResult(result);
  }

  async function onSubmit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    if (demo && !submitting.current && validate()) return placeDemoOrder();
    if (!canSubmit || (paymentMethod === "ozow" && bot.pending) || submitting.current || !validate()) return;
    submitting.current = true;
    setSubmitError(null);
    setProcessing(true);
    const data = new FormData(formRef.current ?? undefined);
    const get = (k: string) => String(data.get(k) ?? "").trim();
    const customer: CustomerDetails = {
      name: get("fullname"),
      email: get("email"),
      phone: get("phone"),
      company: get("company"),
      vat: normaliseVat(get("vat")),
      address: get("address"),
      city: get("city"),
      postcode: get("postcode"),
    };
    // Keep the order for the confirmation page (amount to pay, EFT reference)
    // and store it in Supabase so it reaches the business and order history.
    const signature = JSON.stringify({ items, customer, userId: user?.id ?? null, paymentMethod, termsVersion: LEGAL.version });
    if (pendingOrder.current?.signature !== signature) {
      const checkoutFingerprint = [...new Uint8Array(await crypto.subtle.digest("SHA-256", new TextEncoder().encode(signature)))].map((byte) => byte.toString(16).padStart(2, "0")).join("");
      const previous = paymentMethod === "ozow" ? readOrder() : null;
      const reuse = previous?.paymentMethod === "ozow" && previous.checkoutToken && previous.checkoutFingerprint === checkoutFingerprint;
      pendingOrder.current = { signature, order: reuse ? previous : { ...buildOrder(items, customer), paymentMethod, termsVersion: LEGAL.version,
        ...(paymentMethod === "ozow" ? { checkoutFingerprint, checkoutToken: crypto.randomUUID().replaceAll("-", "") + crypto.randomUUID().replaceAll("-", "") } : {}) } };
    }
    const order = pendingOrder.current.order;
    if (paymentMethod === "ozow") {
      try {
        // Retain the reference before leaving the site, including for guests.
        if (!saveOrder(order)) throw new Error("Your browser couldn't keep your payment reference. Allow site storage and try again.");
        const payment = await createOzowPayment(order, customer, data.get("accept_terms") === "on", bot.token);
        if (!saveOrder(payment.order)) throw new Error("Your browser couldn't keep your payment reference. Please allow site storage before continuing.");
        if (user && data.get("save_details")) {
          await saveProfile({ full_name: customer.name, phone: customer.phone, company: customer.company || null,
            vat_number: customer.vat || null, address: customer.address, city: customer.city, postcode: customer.postcode });
        }
        window.location.assign(payment.redirectUrl);
      } catch (error) {
        bot.reset();
        setSubmitError(error instanceof Error ? error.message : "We couldn't start your payment. Your cart has been kept.");
        setProcessing(false);
        submitting.current = false;
      }
      return;
    }
    const started = Date.now();
    const result = await persistOrder(order, customer, user?.id ?? null, data.get("accept_terms") === "on");
    if (result.error) {
      setSubmitError(result.error);
      setProcessing(false);
      submitting.current = false;
      return;
    }
    saveOrder(order);
    if (user && data.get("save_details")) {
      await saveProfile({
        full_name: customer.name || null,
        phone: customer.phone || null,
        company: customer.company || null,
        vat_number: customer.vat || null,
        address: customer.address || null,
        city: customer.city || null,
        postcode: customer.postcode || null,
      });
    }
    // Let the overlay finish its progress bar before moving on.
    window.setTimeout(() => {
      clear();
      router.push("/checkout/success/");
    }, Math.max(0, PROCESS_MS - (Date.now() - started)));
  }

  return (
    // Re-key on the profile so saved details fill the form once they load.
    <form key={profile?.id ?? "guest"} ref={formRef} onSubmit={onSubmit} noValidate
      onInput={(e) => { const t = e.target as HTMLInputElement; if (t.name === "city") setTypedCity(t.value); }}
      className="grid gap-8 lg:grid-cols-[1.5fr_1fr] lg:items-start">
      {processing && <ProcessingOverlay durationMs={PROCESS_MS} ozow={paymentMethod === "ozow"} />}
      <div className="space-y-8">
        <fieldset className="border-2 border-ink bg-panel p-6">
          <legend className="px-2 font-display text-2xl uppercase">
            Delivery details
          </legend>
          <p className="mb-5 font-mono text-xs uppercase tracking-wider text-muted">
            Fields marked <span className="text-flare">*</span> are required
          </p>
          {!user && (
            <p className="mb-5 border-2 border-dashed border-ink bg-paper-2 p-3 text-sm text-ink-soft">
              Ordered before?{" "}
              <Link href="/account/login/?next=/checkout/" className="font-bold text-ink underline hover:text-flare">Sign in</Link>{" "}
              to fill in your details and keep this order in your history.
            </p>
          )}
          <div className="mb-5 flex border-2 border-ink" role="radiogroup" aria-label="Order as">
            {([["personal", "Personal name"], ["company", "Company details"]] as const).map(([v, label]) => (
              <button key={v} type="button" role="radio" aria-checked={orderAs === v} onClick={() => setOrderAs(v)}
                className={`min-h-11 flex-1 px-3 font-mono text-xs font-bold uppercase tracking-wider ${orderAs === v ? "bg-ink text-lime" : "hover:bg-lime"}`}>
                {label}
              </button>
            ))}
          </div>
          <div className="grid gap-5 sm:grid-cols-2">
            <Field name="fullname" label={orderAs === "company" ? "Contact person" : "Full name"} autoComplete="name" required error={errors.fullname} defaultValue={profile?.full_name} />
            <Field name="email" label="Email" type="email" autoComplete="email" required error={errors.email} defaultValue={user?.email} />
            <Field name="phone" label="Phone" type="tel" autoComplete="tel" required error={errors.phone} defaultValue={profile?.phone} />
            {orderAs === "company" && (
              <>
                <Field name="company" label="Company name" autoComplete="organization" required error={errors.company} defaultValue={profile?.company} />
                <Field name="registration" label="Company registration number" hint="Optional." />
                <Field
                  name="vat"
                  label="VAT number"
                  inputMode="numeric"
                  hint="Optional. For a tax invoice in your company's name."
                  error={errors.vat}
                  defaultValue={profile?.vat_number}
                />
              </>
            )}
            <div className="sm:col-span-2">
              <Field name="address" label="Delivery address" autoComplete="address-line1" required error={errors.address} defaultValue={profile?.address} />
            </div>
            <Field name="city" label="City / town" autoComplete="address-level2" required error={errors.city} defaultValue={profile?.city} />
            <Field name="postcode" label="Postal code" autoComplete="postal-code" inputMode="numeric" required error={errors.postcode} defaultValue={profile?.postcode} />
          </div>
          {user && (
            <label className="mt-5 flex items-center gap-3 text-sm">
              <input type="checkbox" name="save_details" defaultChecked className="h-5 w-5 accent-[var(--color-ink)]" />
              Save these details to my account
            </label>
          )}
          {orderAs === "personal" ? (
            <label className="mt-5 flex items-start gap-3 text-sm">
              <input type="checkbox" name="save_customer" className="mt-0.5 h-5 w-5 shrink-0 accent-[var(--color-ink)]" />
              <span>Save me as a customer <span className="block text-xs text-muted">So we have your details for your next order.</span></span>
            </label>
          ) : (
            <p className="mt-5 text-xs text-muted">Company orders are invoiced in the company&apos;s name and the company is saved as a customer.</p>
          )}
          <label className="mt-4 flex items-start gap-3 text-sm">
            <input type="checkbox" checked={openAccount} onChange={(e) => {
              setOpenAccount(e.target.checked);
              const f = formRef.current ? new FormData(formRef.current) : null;
              if (e.target.checked && f) {
                const g = (k: string) => String(f.get(k) ?? "").trim();
                setAccountContact({ name: g("fullname"), email: g("email"), phone: g("phone"), company: g("company"), vat: g("vat") });
                setAccountProfile((p) => ({ ...p, customerType: orderAs === "company" ? "company" : "individual", registeredName: g("company"), registrationNumber: g("registration"), mobile: g("phone"),
                  delivery: { ...p.delivery, street: g("address"), city: g("city"), postcode: g("postcode") } }));
              }
            }} className="mt-0.5 h-5 w-5 shrink-0 accent-[var(--color-ink)]" />
            <span>Open an account (permanent customer) <span className="block text-xs text-muted">Fill in the customer information form and list who may order on the account.</span></span>
          </label>
        </fieldset>

        {openAccount && (
          <fieldset className="border-2 border-ink bg-panel p-6">
            <legend className="px-2 font-display text-2xl uppercase">Customer information form</legend>
            {errors.account && <p role="alert" className="mb-4 border-2 border-flare p-3 text-sm">{errors.account}</p>}
            <CustomerInfoForm contact={accountContact} profile={accountProfile} onContact={setAccountContact} onProfile={setAccountProfile} today={todaySA()} />
          </fieldset>
        )}

        <fieldset className="border-2 border-ink bg-panel p-6">
          <legend className="px-2 font-display text-2xl uppercase">Payment</legend>
          <p className="mb-5 text-sm text-ink-soft">Choose how you’d like to pay.</p>
          <div className="grid gap-3 sm:grid-cols-2">
            {([{ value: "ozow", title: "Pay with Ozow", note: "Secure bank payment", badge: "ozow" },
              { value: "eft", title: "Manual EFT", note: "Transfer to our FNB account", badge: "EFT" }] as const).map((method) => (
              <label key={method.value} className={`relative flex cursor-pointer items-start gap-3 border-2 p-4 transition-colors ${paymentMethod === method.value ? "border-ink bg-lime" : "border-line bg-paper-2 hover:border-ink"}`}>
                <input type="radio" name="payment_method" value={method.value} checked={paymentMethod === method.value}
                  disabled={processing} onChange={() => { setPaymentMethod(method.value); setSubmitError(null); }}
                  className="mt-1 h-4 w-4 shrink-0 accent-[var(--color-ink)]" />
                <span className="min-w-0 flex-1">
                  <span className={`mb-3 inline-block bg-ink px-2 py-1 font-bold leading-none text-paper ${method.value === "ozow" ? "text-xl lowercase tracking-tight" : "font-mono text-xs"}`}>{method.badge}</span>
                  <span className="block font-display text-sm uppercase">{method.title}</span>
                  <span className="mt-1 block text-xs text-ink-soft">{method.note}</span>
                </span>
              </label>
            ))}
          </div>
          {paymentMethod === "ozow" ? (
            <div className="mt-5 border-2 border-ink bg-ink p-5 text-paper">
              <p className="font-display text-xl uppercase">Your bank. A secure checkout.</p>
              <ol className="mt-4 space-y-3 text-sm text-paper/80">
                <li className="flex gap-3"><span className="font-mono font-bold text-lime">01</span> Continue to Ozow’s secure payment page.</li>
                <li className="flex gap-3"><span className="font-mono font-bold text-lime">02</span> Choose your bank and follow the payment steps.</li>
                <li className="flex gap-3"><span className="font-mono font-bold text-lime">03</span> Return here to check your payment confirmation.</li>
              </ol>
              <p className="mt-5 border-t border-paper/20 pt-4 text-xs text-paper/60">Your banking details are entered on the payment provider’s page.</p>
              {!ozowEnabled && <p role="status" className="mt-4 bg-lime p-3 text-sm font-bold text-ink">Ozow is coming soon. Payments will open once our merchant account is connected.</p>}
            </div>
          ) : (
          <div className="mt-5 space-y-4">
          <div className="flex gap-4 border-2 border-ink bg-paper-2 p-5 text-sm text-ink-soft">
            <span className="grid h-10 w-10 shrink-0 place-items-center bg-ink font-mono text-xs font-bold text-lime">EFT</span>
            <p>
              Pay by EFT (bank transfer) into the account below. After you place your
              order you get your order reference and the exact amount to pay. Your order
              is dispatched once the payment reflects.
            </p>
          </div>
          {(!orderingEnabled || demo) && (
            <p role="status" className="mt-4 border-2 border-dashed border-ink p-4 text-sm text-ink-soft">
              Online ordering is being set up. You can browse the bank details below, but please wait until ordering opens before making a payment.
            </p>
          )}
          {hasBankDetails && (
            <div className="mt-4">
              <BankDetails />
            </div>
          )}
          </div>
          )}
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
                  {courierNote(i.size, i.qty, courierFee)}
                </span>
              </span>
              <span className="whitespace-nowrap font-bold">
                {formatPrice(i.price * i.qty)}
              </span>
            </li>
          ))}
        </ul>
        <div className="mt-5 border-t-2 border-ink">
          <OrderTotals items={items} subtotal={subtotal} city={city} />
        </div>
        {submitError && <p role="alert" className="mt-5 border-2 border-flare p-3 text-sm">{submitError}</p>}
        <div className="mt-5 border-t-2 border-ink pt-5 text-sm text-ink-soft">
          <label className="flex items-start gap-3">
            <input type="checkbox" name="accept_terms" disabled={processing} aria-required="true" aria-invalid={!!errors.accept_terms}
              aria-describedby={errors.accept_terms ? "accept_terms-err" : undefined} className="mt-1 h-5 w-5 shrink-0 accent-[var(--color-ink)]" />
            <span>I agree to the <Link href="/terms/" target="_blank" rel="noopener noreferrer" className="underline">terms of sale</Link> and have reviewed the <Link href="/delivery-returns/" target="_blank" rel="noopener noreferrer" className="underline">delivery and returns information</Link>.</span>
          </label>
          {errors.accept_terms && <p id="accept_terms-err" className="mt-2 text-xs text-flare">{errors.accept_terms}</p>}
          <p className="mt-3 text-xs">The <Link href="/privacy/" target="_blank" rel="noopener noreferrer" className="underline">privacy notice</Link> explains how your details are used to process this order. Review your details and total before continuing.</p>
        </div>
        {submitError && paymentMethod === "ozow" && pendingOrder.current && <Link href="/checkout/ozow/" className="mt-3 block text-sm underline">Check this payment’s status</Link>}
        {paymentMethod === "ozow" && <BotCheck key={bot.attempt} action="checkout" onToken={bot.setToken} />}
        <button
          type="submit"
          disabled={processing || (!demo && (!canSubmit || (paymentMethod === "ozow" && bot.pending)))}
          className="mt-6 flex w-full items-center justify-center gap-2 border-2 border-ink bg-flare px-5 py-3.5 font-display uppercase text-paper transition-colors hover:bg-ink disabled:cursor-wait disabled:opacity-50"
        >
          {demo ? "Place sample order (demo, no payment)" : paymentMethod === "ozow" ? (canSubmit ? "Pay with Ozow" : "Ozow coming soon") : (orderingEnabled ? "Place EFT order" : "Ordering opens soon")}
          <Icon name="arrow" size={16} />
        </button>
        <p className="mt-3 text-center text-xs text-muted">{paymentMethod === "ozow" ? "You’ll continue to Ozow to complete payment." : "Use your order reference when making the transfer."}</p>
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
  defaultValue,
  hint,
}: {
  name: string;
  label: string;
  type?: string;
  autoComplete?: string;
  inputMode?: "numeric" | "tel" | "email" | "text";
  required?: boolean;
  error?: string;
  defaultValue?: string | null;
  hint?: string;
}) {
  const describedBy = [hint && `${name}-hint`, error && `${name}-err`].filter(Boolean).join(" ") || undefined;
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
        defaultValue={defaultValue ?? undefined}
        aria-invalid={!!error}
        aria-describedby={describedBy}
        className={inputClass}
      />
      {hint && !error && (
        <p id={`${name}-hint`} className="mt-1.5 text-xs text-muted">
          {hint}
        </p>
      )}
      {error && (
        <p id={`${name}-err`} className="mt-1.5 font-mono text-xs text-flare">
          {error}
        </p>
      )}
    </div>
  );
}
