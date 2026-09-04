"use client";

import type { ReactNode } from "react";
import { useGsap } from "@/lib/gsap";

type Props = {
  children: ReactNode;
  className?: string;
  strength?: number;
};

// Pointer-follow effect. Listeners are only attached for users who allow motion.
export function Magnetic({ children, className, strength = 0.35 }: Props) {
  const scope = useGsap(({ gsap, scope }) => {
    const xTo = gsap.quickTo(scope, "x", { duration: 0.5, ease: "power3.out" });
    const yTo = gsap.quickTo(scope, "y", { duration: 0.5, ease: "power3.out" });

    const onMove = (e: PointerEvent) => {
      const r = scope.getBoundingClientRect();
      xTo((e.clientX - (r.left + r.width / 2)) * strength);
      yTo((e.clientY - (r.top + r.height / 2)) * strength);
    };
    const onLeave = () => {
      xTo(0);
      yTo(0);
    };

    scope.addEventListener("pointermove", onMove);
    scope.addEventListener("pointerleave", onLeave);
    return () => {
      scope.removeEventListener("pointermove", onMove);
      scope.removeEventListener("pointerleave", onLeave);
    };
  });

  return (
    <div ref={scope} className={`inline-block ${className ?? ""}`}>
      {children}
    </div>
  );
}
