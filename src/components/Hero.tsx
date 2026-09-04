"use client";

import Link from "next/link";
import { useGsap } from "@/lib/gsap";
import { Magnetic } from "./anim/Magnetic";
import { Counter } from "./anim/Counter";

export function Hero() {
  const scope = useGsap(({ gsap, scope }) => {
    const lines = scope.querySelectorAll<HTMLElement>("[data-line]");
    const tl = gsap.timeline({ defaults: { ease: "expo.out" } });
    tl.from(scope.querySelector("[data-kicker]"), { xPercent: -20, autoAlpha: 0, duration: 0.7 })
      .from(lines, { yPercent: 115, skewY: 4, duration: 1, stagger: 0.12 }, "-=0.4")
      .from(scope.querySelector("[data-sub]"), { y: 24, autoAlpha: 0, duration: 0.7 }, "-=0.5")
      .from(scope.querySelectorAll("[data-cta]"), { y: 20, autoAlpha: 0, duration: 0.6, stagger: 0.1 }, "-=0.4")
      .from(scope.querySelector("[data-slab]"), { scale: 0.7, rotate: -6, autoAlpha: 0, duration: 0.9, ease: "back.out(1.6)" }, "-=0.9");
  });

  return (
    <section ref={scope} className="relative overflow-hidden border-b-2 border-ink bg-paper">
      <div
        className="pointer-events-none absolute inset-y-0 right-0 hidden w-1/2 opacity-[0.06] lg:block"
        style={{ backgroundImage: "repeating-linear-gradient(-45deg, var(--color-ink) 0 2px, transparent 2px 22px)" }}
        aria-hidden="true"
      />

      <div className="mx-auto grid max-w-7xl gap-8 px-4 py-16 sm:px-6 lg:grid-cols-[1.5fr_1fr] lg:items-center lg:py-24">
        <div>
          <p data-kicker className="kicker inline-flex items-center gap-2 text-muted">
            <span className="h-2 w-2 bg-lime" />
            Batch-tested fuel for the grid
          </p>

          <h1 className="mt-5 font-display text-[clamp(2.7rem,10vw,7.5rem)] leading-[0.86]">
            <span className="block overflow-hidden"><span data-line className="block">High-octane</span></span>
            <span className="block overflow-hidden"><span data-line className="block">fuel for the</span></span>
            <span className="block overflow-hidden">
              <span data-line className="block">
                <span className="bg-lime px-3 text-ink">grid</span>
              </span>
            </span>
          </h1>

          <p data-sub className="mt-7 max-w-xl text-lg text-ink-soft">
            Race fuels, methanol, ethanol and additives built for consistent power,
            detonation resistance and repeatable tunes. Order online, dispatched to your
            workshop or the paddock.
          </p>

          <div className="mt-9 flex flex-wrap items-center gap-4">
            <div data-cta>
              <Magnetic>
                <Link href="/shop/" className="inline-block border-2 border-ink bg-flare px-7 py-3.5 font-display uppercase text-paper transition-colors hover:bg-ink">
                  Shop fuels
                </Link>
              </Magnetic>
            </div>
            <Link data-cta href="/information/" className="kicker border-b-2 border-ink pb-1 text-ink transition-colors hover:text-flare">
              How to choose &rarr;
            </Link>
          </div>
        </div>

        <div data-slab className="relative">
          <div className="border-2 border-ink bg-ink p-6 text-paper shadow-[10px_10px_0_0_var(--color-lime)]">
            <p className="kicker text-lime">Octane range</p>
            <p className="font-display text-[clamp(3.5rem,14vw,7rem)] leading-none text-paper">102<span className="text-lime">-</span>118</p>
            <div className="mt-6 grid grid-cols-2 gap-px border-2 border-paper/20 bg-paper/20">
              {[
                { k: "Methanol", v: 99, suffix: ".9%" },
                { k: "Dispatch", v: 48, suffix: "h" },
              ].map((s) => (
                <div key={s.k} className="bg-ink p-4">
                  <Counter to={s.v} suffix={s.suffix} className="font-display text-3xl text-paper" />
                  <p className="kicker mt-1 text-paper/50">{s.k}</p>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
