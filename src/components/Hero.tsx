"use client";

import Link from "next/link";
import { motion, type Variants } from "framer-motion";

const stagger: Variants = {
  hidden: {},
  show: { transition: { staggerChildren: 0.12, delayChildren: 0.1 } },
};

const item: Variants = {
  hidden: { opacity: 0, y: 28 },
  show: {
    opacity: 1,
    y: 0,
    transition: { duration: 0.6, ease: [0.22, 1, 0.36, 1] },
  },
};

export function Hero() {
  return (
    <section className="relative overflow-hidden border-b border-border bg-bg">
      <div className="bg-grid absolute inset-0 opacity-60" aria-hidden="true" />
      <div
        className="absolute -top-40 left-1/2 h-[520px] w-[520px] -translate-x-1/2 rounded-full blur-3xl"
        style={{
          background:
            "radial-gradient(closest-side, rgba(255,106,26,0.28), transparent)",
        }}
        aria-hidden="true"
      />

      <motion.div
        className="relative mx-auto max-w-6xl px-4 py-24 text-center sm:py-32"
        variants={stagger}
        initial="hidden"
        animate="show"
      >
        <motion.p
          variants={item}
          className="mx-auto mb-5 inline-flex items-center gap-2 rounded-full border border-border bg-surface px-4 py-1.5 text-xs font-medium text-muted"
        >
          <span className="h-1.5 w-1.5 rounded-full bg-acid" />
          Consistent, batch-tested fuels for the grid
        </motion.p>

        <motion.h1
          variants={item}
          className="mx-auto max-w-4xl font-display text-4xl font-extrabold leading-[1.05] sm:text-6xl"
        >
          High-octane fuel,
          <br />
          <span className="text-brand">engineered for the grid</span>
        </motion.h1>

        <motion.p
          variants={item}
          className="mx-auto mt-6 max-w-2xl text-lg text-muted"
        >
          Race fuels, methanol, ethanol and additives built for consistent power,
          detonation resistance and repeatable tunes. Order online, delivered to your
          door or the paddock.
        </motion.p>

        <motion.div
          variants={item}
          className="mt-9 flex flex-wrap items-center justify-center gap-3"
        >
          <Link
            href="/shop/"
            className="rounded-lg bg-brand px-6 py-3 font-semibold text-black transition-colors hover:bg-brand-strong"
          >
            Shop fuels
          </Link>
          <Link
            href="/information/"
            className="rounded-lg border border-border px-6 py-3 font-semibold text-fg transition-colors hover:border-brand"
          >
            How to choose a fuel
          </Link>
        </motion.div>

        <motion.dl
          variants={item}
          className="mx-auto mt-16 grid max-w-2xl grid-cols-3 gap-6 border-t border-border pt-8"
        >
          {[
            { k: "102-118", v: "Octane range" },
            { k: "99.9%", v: "Methanol purity" },
            { k: "24-48h", v: "Dispatch window" },
          ].map((s) => (
            <div key={s.v}>
              <dt className="font-display text-2xl font-bold text-brand">{s.k}</dt>
              <dd className="mt-1 text-xs text-muted">{s.v}</dd>
            </div>
          ))}
        </motion.dl>
      </motion.div>
    </section>
  );
}
