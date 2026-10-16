"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { Icon } from "./Icon";

export function OrderConfirmation() {
  // Generated on the client after mount so the static HTML stays stable.
  const [ref, setRef] = useState<string | null>(null);

  useEffect(() => {
    const n = Math.floor(100000 + Math.random() * 900000);
    setRef(`OX-${n}`);
  }, []);

  return (
    <div className="mx-auto max-w-xl border-2 border-ink bg-panel p-8 text-center shadow-[10px_10px_0_0_var(--color-lime)] sm:p-10">
      <div className="animate-pop mx-auto grid h-14 w-14 place-items-center bg-lime text-ink shadow-[5px_5px_0_0_var(--color-ink)]">
        <Icon name="check" size={28} strokeWidth={3} />
      </div>
      <h1 className="mt-5 font-display text-[clamp(2rem,7vw,3.5rem)] leading-none">Order received</h1>
      <p className="mt-4 text-ink-soft">
        Thanks for your order. We will contact you to confirm payment and delivery,
        and dispatch within 24 to 48 hours.
      </p>

      <div className="mt-6 border-2 border-ink bg-ink p-4 text-left">
        <p className="kicker text-lime">Order reference</p>
        <p className="num mt-1 font-display text-3xl text-paper" aria-live="polite">
          {ref ?? "OX-······"}
        </p>
      </div>

      <div className="mt-7 flex flex-wrap justify-center gap-3">
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
