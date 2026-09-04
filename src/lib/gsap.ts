"use client";

import { useLayoutEffect, useEffect, useRef, type RefObject } from "react";
import { gsap } from "gsap";
import { ScrollTrigger } from "gsap/ScrollTrigger";

if (typeof window !== "undefined") {
  gsap.registerPlugin(ScrollTrigger);
}

// Avoid the SSR useLayoutEffect warning while still running before paint on the client.
export const useIsoLayoutEffect =
  typeof window !== "undefined" ? useLayoutEffect : useEffect;

/**
 * Run GSAP work scoped to a container ref. Animations are declared inside a
 * matchMedia block gated on prefers-reduced-motion: no-preference, so reduced
 * motion users (and no-JS) keep the visible resting state.
 */
export function useGsap(
  setup: (ctx: { gsap: typeof gsap; scope: HTMLElement }) => void,
  deps: unknown[] = [],
): RefObject<HTMLDivElement | null> {
  const scope = useRef<HTMLDivElement | null>(null);

  useIsoLayoutEffect(() => {
    const el = scope.current;
    if (!el) return;
    const mm = gsap.matchMedia();
    mm.add("(prefers-reduced-motion: no-preference)", () => {
      const ctx = gsap.context(() => setup({ gsap, scope: el }), el);
      return () => ctx.revert();
    });
    return () => mm.revert();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, deps);

  return scope;
}

export { gsap, ScrollTrigger };
