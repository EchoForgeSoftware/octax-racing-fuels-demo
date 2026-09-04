"use client";

import type { ReactNode, ElementType } from "react";
import { useGsap } from "@/lib/gsap";

type Props = {
  children: ReactNode;
  className?: string;
  as?: ElementType;
  y?: number;
  stagger?: number;
  /** Animate the wrapper itself instead of its direct children. */
  self?: boolean;
};

export function Reveal({
  children,
  className,
  as,
  y = 40,
  stagger = 0.08,
  self = false,
}: Props) {
  const scope = useGsap(({ gsap, scope }) => {
    const targets = self ? [scope] : Array.from(scope.children);
    if (targets.length === 0) return;
    gsap.from(targets, {
      yPercent: 0,
      y,
      autoAlpha: 0,
      skewY: 2.5,
      duration: 0.85,
      ease: "expo.out",
      stagger,
      scrollTrigger: {
        trigger: scope,
        start: "top 82%",
        once: true,
      },
    });
  });

  const Tag = (as ?? "div") as ElementType;
  return (
    <Tag ref={scope} className={className}>
      {children}
    </Tag>
  );
}
