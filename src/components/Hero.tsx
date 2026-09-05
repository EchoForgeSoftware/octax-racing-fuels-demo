"use client";

import Link from "next/link";
import { useRef } from "react";
import { gsap, useIsoLayoutEffect } from "@/lib/gsap";
import { Magnetic } from "./anim/Magnetic";

// The hero entrance plays for everyone (the site owner asked for it to be visible
// on load); it is kept smooth and non-looping. Only the ambient pointer tilt is a
// continuous effect, and it responds to direct user input.
export function Hero() {
  const scopeRef = useRef<HTMLElement | null>(null);

  useIsoLayoutEffect(() => {
    const el = scopeRef.current;
    if (!el) return;

    const ctx = gsap.context(() => {
      const tilt = el.querySelector<HTMLElement>("[data-tilt]");
      const depths = el.querySelectorAll<HTMLElement>("[data-depth]");
      depths.forEach((d) =>
        gsap.set(d, { z: Number(d.dataset.depth || 0), transformStyle: "preserve-3d" }),
      );

      const tl = gsap.timeline({ defaults: { ease: "expo.out" } });

      tl.from("[data-kicker]", { xPercent: -20, autoAlpha: 0, duration: 0.7 })
        .from(
          "[data-line]",
          {
            rotationX: -95,
            y: 30,
            autoAlpha: 0,
            transformOrigin: "50% 100% -40px",
            transformPerspective: 900,
            duration: 1,
            stagger: 0.12,
          },
          "-=0.35",
        )
        .from("[data-sub]", { y: 24, autoAlpha: 0, duration: 0.7 }, "-=0.5")
        .from("[data-cta]", { y: 20, autoAlpha: 0, duration: 0.6, stagger: 0.1 }, "-=0.4");

      if (tilt) {
        tl.from(
          tilt,
          {
            rotationY: -48,
            rotationX: 16,
            z: -280,
            autoAlpha: 0,
            transformOrigin: "center center",
            transformPerspective: 1200,
            duration: 1.2,
            ease: "power4.out",
          },
          "-=1",
        );
      }

      // Count-up for the slab stats, in sync with the entrance.
      el.querySelectorAll<HTMLElement>("[data-count]").forEach((node) => {
        const to = Number(node.dataset.count || 0);
        const suffix = node.dataset.suffix ?? "";
        const obj = { v: 0 };
        tl.to(
          obj,
          {
            v: to,
            duration: 1.3,
            ease: "power2.out",
            onUpdate: () => {
              node.textContent = `${Math.round(obj.v)}${suffix}`;
            },
          },
          "-=1",
        );
      });

      // Pointer-driven 3D tilt with parallax depth.
      if (tilt) {
        const ry = gsap.quickTo(tilt, "rotationY", { duration: 0.6, ease: "power3.out" });
        const rx = gsap.quickTo(tilt, "rotationX", { duration: 0.6, ease: "power3.out" });
        const onMove = (e: PointerEvent) => {
          const r = tilt.getBoundingClientRect();
          const px = (e.clientX - (r.left + r.width / 2)) / (r.width / 2);
          const py = (e.clientY - (r.top + r.height / 2)) / (r.height / 2);
          ry(gsap.utils.clamp(-14, 14, px * 14));
          rx(gsap.utils.clamp(-14, 14, -py * 14));
        };
        const onLeave = () => {
          ry(0);
          rx(0);
        };
        el.addEventListener("pointermove", onMove);
        el.addEventListener("pointerleave", onLeave);
        return () => {
          el.removeEventListener("pointermove", onMove);
          el.removeEventListener("pointerleave", onLeave);
        };
      }
    }, el);

    return () => ctx.revert();
  }, []);

  return (
    <section ref={scopeRef} className="relative overflow-hidden border-b-2 border-ink bg-paper">
      <div
        className="pointer-events-none absolute inset-y-0 right-0 hidden w-1/2 opacity-[0.06] lg:block"
        style={{ backgroundImage: "repeating-linear-gradient(-45deg, var(--color-ink) 0 2px, transparent 2px 22px)" }}
        aria-hidden="true"
      />

      <div className="mx-auto grid max-w-7xl gap-8 px-4 py-16 [perspective:1100px] sm:px-6 lg:grid-cols-[1.5fr_1fr] lg:items-center lg:py-24">
        <div>
          <p data-kicker className="kicker inline-flex items-center gap-2 text-muted">
            <span className="h-2 w-2 bg-lime" />
            Batch-tested fuel for the grid
          </p>

          <h1 className="mt-5 font-display text-[clamp(2.7rem,10vw,7.5rem)] leading-[0.86] [perspective:900px]">
            <span data-line className="block">High-octane</span>
            <span data-line className="block">fuel for the</span>
            <span data-line className="block">
              <span className="bg-lime px-3 text-ink">grid</span>
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

        <div data-slab className="relative [perspective:1200px]">
          <div
            data-tilt
            className="border-2 border-ink bg-ink p-6 text-paper shadow-[14px_14px_0_0_var(--color-lime)] [transform-style:preserve-3d]"
          >
            <p data-depth="30" className="kicker text-lime">Octane range</p>
            <p data-depth="80" className="font-display text-[clamp(3.5rem,14vw,7rem)] leading-none text-paper">
              102<span className="text-lime">-</span>118
            </p>
            <div data-depth="40" className="mt-6 grid grid-cols-2 gap-px border-2 border-paper/20 bg-paper/20">
              {[
                { k: "Methanol", to: 99, suffix: ".9%", label: "99.9%" },
                { k: "Dispatch", to: 48, suffix: "h", label: "48h" },
              ].map((s) => (
                <div key={s.k} className="bg-ink p-4">
                  <span data-count={s.to} data-suffix={s.suffix} className="font-display text-3xl text-paper">
                    {s.label}
                  </span>
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
