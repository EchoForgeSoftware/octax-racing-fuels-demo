"use client";

import { useRef } from "react";
import { useGsap } from "@/lib/gsap";

type Props = {
  to: number;
  className?: string;
  prefix?: string;
  suffix?: string;
  duration?: number;
};

export function Counter({ to, className, prefix = "", suffix = "", duration = 1.6 }: Props) {
  const numRef = useRef<HTMLSpanElement | null>(null);

  const scope = useGsap(({ gsap, scope }) => {
    const el = numRef.current;
    if (!el) return;
    const obj = { v: 0 };
    gsap.to(obj, {
      v: to,
      duration,
      ease: "power2.out",
      scrollTrigger: { trigger: scope, start: "top 85%", once: true },
      onUpdate: () => {
        el.textContent = `${prefix}${Math.round(obj.v)}${suffix}`;
      },
    });
  });

  return (
    <span ref={scope} className={className}>
      {/* Resting value is the final number, so no-JS and reduced motion show it. */}
      <span ref={numRef}>{`${prefix}${to}${suffix}`}</span>
    </span>
  );
}
