"use client";

import Link from "next/link";
import { useRef } from "react";
import { gsap, useIsoLayoutEffect } from "@/lib/gsap";
import { Magnetic } from "./anim/Magnetic";
import { ProductShot } from "./pack/ProductShot";
import { getProduct } from "@/lib/products";

// The hero entrance plays for everyone (the site owner asked for it to be visible
// on load); it is kept smooth and non-looping. Only the ambient pointer tilt is a
// continuous effect, and it responds to direct user input.
const hero = getProduct("octa-x-ethanol");

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
            OCTA Performance
          </p>

          {/* Brand line from the labels. Sized so "addiction" (~7em with its padding) fits the column. */}
          <h1 className="mt-5 font-display text-[clamp(2.4rem,12vw,6.5rem)] leading-[0.86] [perspective:900px] lg:text-[clamp(4.4rem,7.4vw,6.2rem)]">
            <span data-line className="block">Fuel the</span>
            <span data-line className="block">
              <span className="bg-lime px-3 text-ink">addiction</span>
            </span>
          </h1>

          <p data-sub className="mt-7 max-w-xl text-lg text-ink-soft">
            OCTA-X ethanol 95%, OCTA-M methanol and OCTA-BOOST octane booster for
            performance use. Every pack carries a batch number for traceability. Order
            online, delivered to your workshop.
          </p>

          <div className="mt-9 flex flex-wrap items-center gap-4">
            <div data-cta>
              <Magnetic>
                <Link href="/shop/" className="inline-block border-2 border-ink bg-flare px-7 py-3.5 font-display uppercase text-paper transition-colors hover:bg-ink">
                  Shop OCTA
                </Link>
              </Magnetic>
            </div>
            <Link data-cta href="/information/" className="kicker border-b-2 border-ink pb-1 text-ink transition-colors hover:text-flare">
              Product guide &rarr;
            </Link>
          </div>
        </div>

        <div data-slab className="relative [perspective:1200px]">
          <div
            data-tilt
            className="border-2 border-ink bg-ink text-paper shadow-[14px_14px_0_0_var(--color-lime)] [transform-style:preserve-3d]"
          >
            <div data-depth="60">
              {hero && <ProductShot product={hero} frame="square" className="block aspect-square w-full" />}
            </div>
            <div data-depth="30" className="grid grid-cols-2 gap-px border-t-2 border-ink bg-paper/20">
              {[
                { k: "Ethanol", to: 95, suffix: "%", label: "95%" },
                { k: "Litre can", to: 20, suffix: "L", label: "20L" },
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
