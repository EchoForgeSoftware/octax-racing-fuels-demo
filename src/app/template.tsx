"use client";

import type { ReactNode } from "react";
import { useGsap } from "@/lib/gsap";

// App Router remounts this on every navigation, so the enter animation replays
// per page. Reduced-motion users skip it (useGsap gates on no-preference) and see
// the resting state immediately.
export default function Template({ children }: { children: ReactNode }) {
  const scope = useGsap(({ gsap, scope }) => {
    const bar = scope.querySelector<HTMLElement>("[data-swipe]");
    const content = scope.querySelector<HTMLElement>("[data-content]");
    const tl = gsap.timeline();
    if (bar) {
      tl.set(bar, { scaleX: 0, transformOrigin: "left center", display: "block" })
        .to(bar, { scaleX: 1, duration: 0.35, ease: "expo.out" })
        .to(bar, { scaleX: 0, transformOrigin: "right center", duration: 0.35, ease: "expo.in" })
        .set(bar, { display: "none" });
    }
    if (content) {
      tl.from(content, { y: 22, autoAlpha: 0, duration: 0.55, ease: "expo.out" }, 0.15);
    }
  }, []);

  return (
    <div ref={scope}>
      <span
        data-swipe
        aria-hidden="true"
        className="fixed inset-x-0 top-0 z-[60] h-1.5 bg-lime"
        style={{ display: "none" }}
      />
      <div data-content>{children}</div>
    </div>
  );
}
