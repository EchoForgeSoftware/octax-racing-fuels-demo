"use client";

import type { ReactNode } from "react";

type Props = {
  children: ReactNode;
  className?: string;
  duration?: number;
  reverse?: boolean;
};

// Duplicates content once so the -50% keyframe loops seamlessly.
export function Marquee({ children, className, duration = 28, reverse }: Props) {
  return (
    <div
      className={`overflow-hidden ${reverse ? "marquee-reverse" : ""} ${className ?? ""}`}
    >
      <div
        className="marquee-track"
        style={{ ["--marquee-duration" as string]: `${duration}s` }}
        aria-hidden="true"
      >
        {children}
        {children}
      </div>
    </div>
  );
}
