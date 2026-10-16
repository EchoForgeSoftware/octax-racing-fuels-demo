"use client";

import Link from "next/link";
import { useCallback, useEffect, useRef, useState } from "react";
import { useCart } from "./CartContext";
import { Icon } from "./Icon";
import { formatPrice } from "@/lib/format";
import { readOrder, saveOrder, type PlacedOrder } from "@/lib/order";
import { getOzowStatus, type PaymentStatus } from "@/lib/payments";

export function OzowReturn() {
  const [order, setOrder] = useState<PlacedOrder | null>(null);
  const [loaded, setLoaded] = useState(false);
  const [status, setStatus] = useState<PaymentStatus>("pending");
  const [testMode, setTestMode] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [checking, setChecking] = useState(false);
  const [stopped, setStopped] = useState(false);
  const { items, ready, clear } = useCart();
  const cleared = useRef(false);
  const mounted = useRef(true);

  useEffect(() => {
    mounted.current = true;
    setOrder(readOrder()); setLoaded(true);
    return () => { mounted.current = false; };
  }, []);

  const check = useCallback(async (paymentOrder: PlacedOrder) => {
    setChecking(true);
    try {
      const result = await getOzowStatus(paymentOrder);
      if (!mounted.current) return null;
      setStatus(result.status); setTestMode(result.testMode); setError(null);
      return result.status;
    } catch (cause) {
      if (mounted.current) setError(cause instanceof Error ? cause.message : "We couldn't check your payment. Please try again.");
      return null;
    } finally { if (mounted.current) setChecking(false); }
  }, []);

  useEffect(() => {
    if (!order || order.paymentMethod !== "ozow" || !order.checkoutToken) return;
    let cancelled = false;
    let timer: ReturnType<typeof setTimeout>;
    let attempts = 0;
    const poll = async () => {
      const result = await check(order);
      if (cancelled) return;
      if (result === "pending" && ++attempts < 12) timer = setTimeout(poll, 3000);
      else setStopped(true);
    };
    void poll();
    return () => { cancelled = true; clearTimeout(timer); };
  }, [order, check]);

  useEffect(() => {
    if (!ready || status !== "paid" || !order || cleared.current) return;
    cleared.current = true;
    if (readOrder()?.ref === order.ref) saveOrder({ ...order, checkoutFingerprint: undefined });
    if (testMode) return;
    // Keep any cart changes made in another tab while payment was in progress.
    const signature = (lines: { sku: string; qty: number }[]) => JSON.stringify(lines.map(({ sku, qty }) => ({ sku, qty })).sort((a, b) => a.sku.localeCompare(b.sku)));
    if (signature(items) === signature(order.items)) clear();
  }, [ready, status, testMode, order, items, clear]);

  if (!loaded) return <p role="status" className="text-center text-muted">Loading your payment reference…</p>;
  if (!order || order.paymentMethod !== "ozow" || !order.checkoutToken) return (
    <div className="mx-auto max-w-xl border-2 border-ink bg-panel p-8 text-center">
      <h1 className="font-display text-3xl">Payment reference unavailable</h1>
      <p className="mt-4 text-ink-soft">Return using the same browser tab you used for checkout, or check your account for the order. Please confirm the payment status before paying again.</p>
      <Link href="/account/" className="mt-6 inline-block border-2 border-ink bg-lime px-6 py-3 font-display uppercase">My account</Link>
    </div>
  );

  const paid = status === "paid";
  const failed = status === "failed";
  return (
    <div className="mx-auto max-w-xl border-2 border-ink bg-panel p-8 shadow-[10px_10px_0_0_var(--color-lime)] sm:p-10">
      <div className="mx-auto grid h-14 w-14 place-items-center bg-lime"><Icon name={paid ? "check" : failed ? "close" : "arrow"} size={26} /></div>
      <h1 className="mt-6 text-center font-display text-3xl leading-tight">{paid ? (testMode ? "Test payment confirmed" : "Payment confirmed") : failed ? "Payment not completed" : "Checking your payment"}</h1>
      <p role="status" className="mt-4 text-center text-ink-soft">
        {paid ? (testMode ? "This was a staging payment. No live order will be dispatched from this test." : "Ozow has confirmed your payment. You can view your saved order in My account.")
          : failed ? "Ozow reported that payment was not completed. Your cart has been kept. Check with your bank before trying again."
          : "We’re waiting for Ozow’s verified confirmation. Please don’t pay again while the result is pending."}
      </p>
      <dl className="mt-7 divide-y divide-line border-2 border-ink px-4">
        <div className="py-4"><dt className="kicker text-muted">Order reference</dt><dd className="mt-1 break-all font-display text-xl">{order.ref}</dd></div>
        <div className="flex items-center justify-between gap-3 py-4"><dt className="kicker text-muted">Order total</dt><dd className="font-display text-2xl text-flare">{formatPrice(order.total)}</dd></div>
      </dl>
      {error && <p role="alert" className="mt-5 border-2 border-flare p-3 text-sm">{error}</p>}
      {!paid && stopped && <button type="button" disabled={checking} onClick={() => void check(order)} className="mt-5 w-full border-2 border-ink bg-lime px-5 py-3 font-display uppercase disabled:opacity-60">{checking ? "Checking…" : "Check payment status"}</button>}
      <div className="mt-7 flex flex-wrap justify-center gap-3">
        <Link href="/account/" className="border-2 border-ink px-5 py-3 font-display uppercase hover:bg-lime">My account</Link>
        <Link href={paid ? "/shop/" : "/cart/"} className="border-2 border-ink bg-ink px-5 py-3 font-display uppercase text-paper hover:text-lime">{paid ? "Continue shopping" : "Back to cart"}</Link>
      </div>
    </div>
  );
}
