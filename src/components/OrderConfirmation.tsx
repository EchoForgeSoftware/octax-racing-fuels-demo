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
    <div className="mx-auto max-w-xl border-2 border-ink bg-panel p-8 text-center sm:p-10">
      <div className="mx-auto grid h-14 w-14 place-items-center bg-lime">
        <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="var(--color-ink)" strokeWidth="2.5" aria-hidden="true">
          <path d="M20 6 9 17l-5-5" strokeLinecap="round" strokeLinejoin="round" />
        </svg>
      </div>
      <h1 className="mt-5 font-display text-3xl font-bold">Order confirmed</h1>
      <p className="mt-3 text-muted">
        Thanks for your order. Your reference is{" "}
        <span className="font-medium text-ink">{ref ?? "…"}</span>. We would normally
        email a confirmation and dispatch within 24 to 48 hours.
      </p>
      <div className="mt-6 border border-dashed border-ink bg-paper-2 p-4 text-sm text-muted">
        This is a demo order. No payment was taken and nothing will be shipped.
      </div>
      <div className="mt-7 flex flex-wrap justify-center gap-3">
        <Link href="/shop/" className="bg-flare px-6 py-3 font-semibold text-paper transition-colors hover:bg-ink">
          Continue shopping
        </Link>
        <Link href="/" className="border-2 border-ink px-6 py-3 font-semibold text-ink transition-colors hover:border-flare">
          Back to home
        </Link>
      </div>
    </div>
  );
}
