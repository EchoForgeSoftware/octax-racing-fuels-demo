"use client";

import { useEffect, useState } from "react";

export function BackToTop() {
  const [show, setShow] = useState(false);

  useEffect(() => {
    const onScroll = () => setShow(window.scrollY > 600);
    onScroll();
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  function toTop() {
    const start = window.scrollY;
    if (start <= 0) return;
    const duration = 600;
    const t0 = performance.now();
    const easeOutQuart = (t: number) => 1 - Math.pow(1 - t, 4);
    const step = (now: number) => {
      const p = Math.min(1, (now - t0) / duration);
      window.scrollTo(0, start * (1 - easeOutQuart(p)));
      if (p < 1) requestAnimationFrame(step);
    };
    requestAnimationFrame(step);
  }

  return (
    <button
      type="button"
      onClick={toTop}
      aria-label="Back to top"
      className={`fixed bottom-5 right-5 z-40 grid h-12 w-12 place-items-center border-2 border-ink bg-ink text-lime shadow-[4px_4px_0_0_var(--color-lime)] transition-all duration-300 ease-[cubic-bezier(0.22,1,0.36,1)] hover:bg-lime hover:text-ink ${
        show ? "translate-y-0 opacity-100" : "pointer-events-none translate-y-4 opacity-0"
      }`}
    >
      <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" aria-hidden="true">
        <path d="M12 19V5M6 11l6-6 6 6" strokeLinecap="round" strokeLinejoin="round" />
      </svg>
    </button>
  );
}
