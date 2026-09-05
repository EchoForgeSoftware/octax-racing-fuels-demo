"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { useCart } from "./CartContext";

export function CartToast() {
  const { lastAdded } = useCart();
  const [visible, setVisible] = useState(false);
  const [msg, setMsg] = useState<{ name: string; qty: number } | null>(null);

  useEffect(() => {
    if (!lastAdded) return;
    setMsg({ name: lastAdded.name, qty: lastAdded.qty });
    setVisible(true);
    const t = setTimeout(() => setVisible(false), 2800);
    return () => clearTimeout(t);
  }, [lastAdded]);

  return (
    <div
      aria-live="polite"
      className={`fixed bottom-5 left-5 z-50 w-[min(20rem,calc(100vw-2.5rem))] border-2 border-ink bg-ink text-paper shadow-[6px_6px_0_0_var(--color-lime)] transition-all duration-300 ease-[cubic-bezier(0.22,1,0.36,1)] ${
        visible ? "translate-y-0 opacity-100" : "pointer-events-none translate-y-6 opacity-0"
      }`}
    >
      {msg && (
        <div className="flex items-start gap-3 p-4">
          <span className="grid h-8 w-8 shrink-0 place-items-center bg-lime">
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="var(--color-ink)" strokeWidth="3" aria-hidden="true">
              <path d="M20 6 9 17l-5-5" strokeLinecap="round" strokeLinejoin="round" />
            </svg>
          </span>
          <div className="min-w-0 flex-1">
            <p className="kicker text-lime">Added to cart</p>
            <p className="mt-1 truncate text-sm font-bold">
              {msg.qty} &times; {msg.name}
            </p>
            <Link href="/cart/" className="mt-2 inline-block font-mono text-xs uppercase tracking-wider text-paper/70 underline hover:text-lime">
              View cart &rarr;
            </Link>
          </div>
        </div>
      )}
    </div>
  );
}
