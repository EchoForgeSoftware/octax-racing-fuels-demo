"use client";

import Link from "next/link";
import { useEffect, useMemo, useRef, useState, type FormEvent } from "react";
import { useAuth } from "../AuthContext";
import { useCart } from "../CartContext";
import { Icon } from "../Icon";
import { formatPrice } from "@/lib/format";
import { getSupabase, type OrderRow } from "@/lib/supabase";
import { products } from "@/lib/products";
import { customerHistorySummary, fetchCustomerOrders, historyDate, paymentLabel, paymentMethod } from "@/lib/customerHistory";
import { PaymentHistory } from "./PaymentHistory";
import { YourPrices } from "./YourPrices";
import { demoOrders } from "@/lib/customerDemo";
import { vatError } from "@/lib/vat";

const STATUS: Record<string, string> = {
  awaiting_payment: "Awaiting payment",
  paid: "Paid",
  dispatched: "Dispatched",
  cancelled: "Cancelled",
};

const inputClass =
  "mt-1.5 w-full border-2 border-ink bg-paper-2 px-3 py-2.5 text-base outline-none transition-colors focus:bg-panel";

/** Current catalogue entry for a past order line, so reorders use today's price. */
function current(sku: string) {
  for (const p of products) {
    const v = p.variants.find((x) => x.sku === sku);
    if (v && v.price !== null) return { product: p, variant: v, price: v.price };
  }
  return null;
}

export function AccountView() {
  const { enabled, ready, user, profile, signOut, saveProfile, demo } = useAuth();
  const { add } = useCart();
  const [orders, setOrders] = useState<OrderRow[] | null>(null);
  const [ordersOwner, setOrdersOwner] = useState<string | undefined>(undefined);
  const [saved, setSaved] = useState<string | null>(null);
  const [ordersError, setOrdersError] = useState<string | null>(null);
  const [accountError, setAccountError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [tab, setTab] = useState<"orders" | "payments" | "delivery">("orders");
  const [hasMore, setHasMore] = useState(false);
  const [loadingMore, setLoadingMore] = useState(false);
  const [olderError, setOlderError] = useState<string | null>(null);
  const [refresh, setRefresh] = useState(0);
  const requestVersion = useRef(0);
  const moreBusy = useRef(false);
  const userId = user?.id;

  useEffect(() => {
    const sb = getSupabase();
    const version = ++requestVersion.current;
    setOrders(null);
    setOrdersOwner(userId);
    setOrdersError(null);
    setSaved(null);
    setHasMore(false);
    setLoadingMore(false);
    setOlderError(null);
    moreBusy.current = false;
    if (demo && userId) { setOrders(demoOrders(userId)); return; }
    if (!sb || !userId) return;
    void (async () => {
      try {
      const result = await fetchCustomerOrders(sb, userId);
      if (requestVersion.current !== version) return;
      setOrders(result.orders);
      setHasMore(result.hasMore);
      } catch {
        if (requestVersion.current === version) setOrdersError("We couldn't load your history. Check your connection and refresh it.");
      }
    })();
    return () => { requestVersion.current++; };
  }, [userId, refresh, demo]);
  useEffect(() => setTab("orders"), [userId]);

  // "Your usual": the products this customer has ordered most, by quantity.
  const visibleOrders = ordersOwner === userId ? orders : null;
  const summary = customerHistorySummary(visibleOrders ?? []);
  async function loadOlder() {
    const sb = getSupabase();
    if (!sb || !userId || !visibleOrders?.length || !hasMore || moreBusy.current) return;
    const version = requestVersion.current;
    moreBusy.current = true; setLoadingMore(true); setOlderError(null);
    try {
      const result = await fetchCustomerOrders(sb, userId, visibleOrders[visibleOrders.length - 1].id);
      if (requestVersion.current !== version) return;
      setOrders(previous => [...(previous ?? []), ...result.orders]);
      setHasMore(result.hasMore);
    } catch { if (requestVersion.current === version) setOlderError("We couldn't load older history. Your loaded orders have been kept; please try again."); }
    finally { if (requestVersion.current === version) { moreBusy.current = false; setLoadingMore(false); } }
  }
  const usual = useMemo(() => {
    const totals = new Map<string, number>();
    for (const o of visibleOrders ?? []) {
      if (o.status === "cancelled" || o.payment_environment === "staging") continue;
      for (const i of o.items) totals.set(i.sku, (totals.get(i.sku) ?? 0) + i.qty);
    }
    return [...totals.entries()]
      .sort((a, b) => b[1] - a[1])
      .slice(0, 3)
      .flatMap(([sku, qty]) => {
        const c = current(sku);
        return c ? [{ ...c, qty }] : [];
      });
  }, [visibleOrders]);

  function reorder(order: OrderRow) {
    for (const i of order.items) {
      const c = current(i.sku);
      if (c) add({ sku: i.sku, slug: c.product.slug, name: c.product.name, size: c.variant.size, price: c.price }, i.qty);
    }
  }

  async function onSave(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    if (saving) return;
    setSaving(true);
    const d = new FormData(e.currentTarget);
    const get = (k: string) => String(d.get(k) ?? "").trim() || null;
    const vatProblem = vatError(get("vat_number") ?? "");
    if (vatProblem) {
      setSaved(vatProblem);
      setSaving(false);
      return;
    }
    const { error } = await saveProfile({
      full_name: get("full_name"),
      phone: get("phone"),
      company: get("company"),
      vat_number: get("vat_number")?.replace(/[\s-]/g, "") || null,
      address: get("address"),
      city: get("city"),
      postcode: get("postcode"),
    });
    setSaved(error ?? (demo ? "Sample details saved in this browser tab. No customer record was changed." : "Saved. Checkout will fill these in for you."));
    setSaving(false);
  }

  if (!enabled) {
    return (
      <div className="border-2 border-ink bg-panel p-8">
        <h2 className="font-display text-2xl">Your customer area is being connected</h2>
        <p className="mt-3 max-w-xl text-ink-soft">
          Sign-in, ordered items and recorded payment history will be available once customer accounts are connected. You can browse the sign-in and registration pages now.
        </p>
        <div className="mt-6 flex flex-wrap gap-3"><Link href="/account/login/" className="border-2 border-ink bg-flare px-6 py-3.5 font-display uppercase text-paper hover:bg-ink">Customer sign in</Link><Link href="/account/register/" className="border-2 border-ink px-6 py-3.5 font-display uppercase hover:bg-lime">Create account</Link></div>
      </div>
    );
  }

  if (!ready) return <p className="font-mono text-sm uppercase tracking-wider text-muted">Loading your account…</p>;

  if (!user) {
    return (
      <div className="border-2 border-ink bg-panel p-8">
        <h2 className="font-display text-2xl">Sign in to your customer area</h2>
        <p className="mt-3 text-ink-soft">See your ordered items, payment confirmations, saved delivery details and quick reorders.</p>
        <div className="mt-6 flex flex-wrap gap-3">
          <Link href="/account/login/" className="border-2 border-ink bg-flare px-6 py-3.5 font-display uppercase text-paper hover:bg-ink">Sign in</Link>
          <Link href="/account/register/" className="border-2 border-ink px-6 py-3.5 font-display uppercase hover:bg-ink hover:text-lime">Create account</Link>
        </div>
      </div>
    );
  }

  const name = profile?.full_name || user.email;

  return (
    <div className="space-y-10">
      <div className="flex flex-wrap items-end justify-between gap-4">
        <p className="text-lg text-ink-soft">
          Signed in as <strong className="text-ink">{name}</strong>
          {profile?.full_name && <span className="text-muted"> ({user.email})</span>}
        </p>
        <button type="button" onClick={async () => { const { error } = await signOut(); setAccountError(error); }} className="kicker border-b-2 border-ink pb-1 hover:text-flare">
          Sign out
        </button>
      </div>
      {accountError && <p role="alert" className="text-flare">{accountError}</p>}
      <YourPrices />

      <div className="grid gap-4 sm:grid-cols-3">
        {[["Orders loaded", String(summary.orders)], ["Confirmed payments", formatPrice(summary.paid)], ["Awaiting payment", String(summary.awaiting)]].map(([label,value]) => <div key={label} className="border-2 border-ink bg-panel p-5"><p className="kicker text-muted">{label}</p><p className="num mt-3 font-display text-3xl">{visibleOrders === null ? "—" : value}</p></div>)}
      </div>
      <div className="flex flex-wrap items-center justify-between gap-4 border-y-2 border-ink py-4">
        <nav aria-label="Customer sections" className="flex flex-wrap gap-2">{([{key:"orders",label:"Orders & items"},{key:"payments",label:"Payments"},{key:"delivery",label:"Delivery details"}] as const).map(item => <button key={item.key} type="button" aria-pressed={tab === item.key} onClick={() => setTab(item.key)} className={`border-2 border-ink px-4 py-3 font-display text-sm uppercase ${tab === item.key ? "bg-ink text-lime" : "bg-panel hover:bg-lime"}`}>{item.label}</button>)}</nav>
        <button type="button" onClick={() => setRefresh(value => value + 1)} className="kicker underline underline-offset-4 hover:text-flare">Refresh history</button>
      </div>
      {tab !== "delivery" && <p className="text-xs text-muted">Totals cover the orders loaded below and exclude test payments. {hasMore ? "Load older orders to include more history." : "Orders placed as a guest are not automatically linked to your account."}</p>}

      {tab === "orders" && usual.length > 0 && (
        <section>
          <h2 className="font-display text-2xl">Your usual</h2>
          <ul className="mt-4 grid gap-3 sm:grid-cols-3">
            {usual.map((u) => (
              <li key={u.variant.sku} className="flex flex-col justify-between gap-3 border-2 border-ink bg-panel p-4">
                <div>
                  <p className="font-display uppercase leading-tight">{u.product.name}</p>
                  <p className="num mt-1 font-mono text-xs uppercase tracking-wider text-muted">
                    {u.variant.size} · {formatPrice(u.price)} · ordered {u.qty}×
                  </p>
                </div>
                <button
                  type="button"
                  onClick={() => add({ sku: u.variant.sku, slug: u.product.slug, name: u.product.name, size: u.variant.size, price: u.price }, 1)}
                  className="flex items-center justify-center gap-2 border-2 border-ink px-4 py-2.5 font-display text-sm uppercase hover:bg-lime"
                >
                  Add to cart <Icon name="plus" size={14} />
                </button>
              </li>
            ))}
          </ul>
        </section>
      )}

      <div className={tab === "delivery" ? "max-w-xl" : ""}>
        <section hidden={tab !== "orders"}>
          <h2 className="font-display text-2xl">Order history</h2>
          {ordersError ? (
            <p role="alert" className="mt-4 border-2 border-flare p-4 text-sm">{ordersError}</p>
          ) : visibleOrders === null ? (
            <p className="mt-4 font-mono text-sm uppercase tracking-wider text-muted">Loading orders…</p>
          ) : visibleOrders.length === 0 ? (
            <p className="mt-4 border-2 border-dashed border-ink p-5 text-ink-soft">
              No orders yet. Orders you place while signed in appear here.
            </p>
          ) : (
            <ul className="mt-4 space-y-4">
              {visibleOrders.map((o) => (
                <li key={o.id} className="border-2 border-ink bg-panel">
                  <div className="flex flex-wrap items-baseline justify-between gap-2 border-b-2 border-ink px-4 py-3">
                    <span className="num font-display text-lg">{o.ref}</span>
                    {o.payment_environment === "staging" && <span className="bg-lime px-2 py-1 font-mono text-xs text-ink">TEST ORDER</span>}
                    <span className="font-mono text-xs uppercase tracking-wider text-muted">
                      {historyDate(o.created_at)}
                      {" · "}
                      <span className={o.status === "awaiting_payment" ? "text-flare" : "text-ink"}>{STATUS[o.status] ?? o.status}</span>
                    </span>
                  </div>
                  <div className="flex flex-wrap items-center justify-between gap-2 border-b border-line bg-paper-2 px-4 py-3 text-xs"><span className="font-mono uppercase">{paymentMethod(o)}</span><span>{paymentLabel(o)}</span></div>
                  <ul className="num divide-y divide-line px-4 text-sm">
                    {o.items.map((i) => (
                      <li key={i.sku} className="flex justify-between gap-3 py-2">
                        <span><span className="font-mono font-bold">{i.qty}×</span> {i.name} <span className="font-mono text-xs uppercase text-muted">{i.size}</span></span>
                        <span className="whitespace-nowrap">{formatPrice(i.price * i.qty)}</span>
                      </li>
                    ))}
                  </ul>
                  <div className="num flex flex-wrap items-center justify-between gap-3 border-t-2 border-ink px-4 py-3">
                    <span className="text-sm">
                      Total <strong>{formatPrice(o.total)}</strong>
                      <span className="text-muted"> incl. {o.courier > 0 ? `${formatPrice(o.courier)} courier` : "free delivery"}</span>
                    </span>
                    <button type="button" onClick={() => reorder(o)} className="flex items-center gap-2 border-2 border-ink px-4 py-2 font-display text-sm uppercase hover:bg-lime">
                      Order again <Icon name="arrow" size={14} />
                    </button>
                  </div>
                </li>
              ))}
            </ul>
          )}
        </section>

        {tab === "payments" && (ordersError ? <p role="alert" className="border-2 border-flare p-4 text-sm">{ordersError}</p> : visibleOrders === null ? <p className="font-mono text-sm uppercase text-muted">Loading payment history…</p> : <PaymentHistory orders={visibleOrders} demo={demo} />)}

        {tab !== "delivery" && visibleOrders !== null && <div className="mt-6 space-y-3">{olderError && <p role="alert" className="text-sm text-flare">{olderError}</p>}{hasMore ? <button type="button" disabled={loadingMore} onClick={loadOlder} className="border-2 border-ink bg-panel px-5 py-3 font-display uppercase hover:bg-lime disabled:opacity-50">{loadingMore ? "Loading…" : "Load older orders"}</button> : visibleOrders.length > 0 && <p className="text-xs text-muted">You’ve reached the start of this account’s order history.</p>}</div>}

        <section hidden={tab !== "delivery"}>
          <h2 className="font-display text-2xl">Delivery details</h2>
          <form key={profile?.id ?? "new"} onSubmit={onSave} className="mt-4 space-y-4 border-2 border-ink bg-panel p-5">
            {([
              ["full_name", "Full name", "name"],
              ["phone", "Phone", "tel"],
              ["company", "Company / team", "organization"],
              ["vat_number", "VAT number (optional)", "off"],
              ["address", "Delivery address", "address-line1"],
              ["city", "City / town", "address-level2"],
              ["postcode", "Postal code", "postal-code"],
            ] as const).map(([key, label, ac]) => (
              <div key={key}>
                <label htmlFor={`p-${key}`} className="kicker text-ink-soft">{label}</label>
                <input id={`p-${key}`} name={key} autoComplete={ac} maxLength={key === "address" ? 500 : 200} defaultValue={profile?.[key] ?? ""} className={inputClass} />
              </div>
            ))}
            {saved && <p role="status" className="text-sm text-ink-soft">{saved}</p>}
            <button type="submit" disabled={saving || !profile} className="w-full border-2 border-ink bg-ink px-5 py-3 font-display uppercase text-paper hover:bg-lime hover:text-ink disabled:opacity-60">
              {saving ? "Saving…" : "Save details"}
            </button>
          </form>
        </section>
      </div>
    </div>
  );
}
