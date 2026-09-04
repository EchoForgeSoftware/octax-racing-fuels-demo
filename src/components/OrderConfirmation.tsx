"use client";

import Link from "next/link";
import { useEffect, useState } from "react";

export function OrderConfirmation() {
  // Generated on the client after mount so the static HTML stays stable.
  const [ref, setRef] = useState<string | null>(null);

  useEffect(() => {
    const n = Math.floor(100000 + Math.random() * 900000);
    setRef(`OX-${n}`);
  }, []);

  return (
    <div className="mx-auto max-w-xl rounded-2xl border border-border bg-surface p-8 text-center sm:p-10">
      <div className="mx-auto grid h-14 w-14 place-items-center rounded-full bg-acid/10">
        <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="var(--color-acid)" strokeWidth="2.5" aria-hidden="true">
          <path d="M20 6 9 17l-5-5" strokeLinecap="round" strokeLinejoin="round" />
        </svg>
      </div>
      <h1 className="mt-5 font-display text-3xl font-bold">Order confirmed</h1>
      <p className="mt-3 text-muted">
        Thanks for your order. Your reference is{" "}
        <span className="font-medium text-fg">{ref ?? "…"}</span>. We would normally
        email a confirmation and dispatch within 24 to 48 hours.
      </p>
      <div className="mt-6 rounded-lg border border-dashed border-border bg-surface-2 p-4 text-sm text-muted">
        This is a demo order. No payment was taken and nothing will be shipped.
      </div>
      <div className="mt-7 flex flex-wrap justify-center gap-3">
        <Link href="/shop/" className="rounded-lg bg-brand px-6 py-3 font-semibold text-black transition-colors hover:bg-brand-strong">
          Continue shopping
        </Link>
        <Link href="/" className="rounded-lg border border-border px-6 py-3 font-semibold text-fg transition-colors hover:border-brand">
          Back to home
        </Link>
      </div>
    </div>
  );
}
