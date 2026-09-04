"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useState } from "react";
import { useCart } from "./CartContext";
import { Logo } from "./Logo";

const links = [
  { href: "/shop/", label: "Shop" },
  { href: "/information/", label: "Info" },
  { href: "/contact/", label: "Contact" },
];

function isActive(pathname: string, href: string) {
  return href === "/" ? pathname === "/" : pathname.startsWith(href);
}

export function Nav() {
  const pathname = usePathname();
  const { count, ready } = useCart();
  const [open, setOpen] = useState(false);

  return (
    <header className="sticky top-0 z-50 border-b-2 border-ink bg-paper/90 backdrop-blur">
      <div className="mx-auto flex h-16 max-w-7xl items-center justify-between px-4 sm:px-6">
        <Link href="/" className="flex items-center gap-2.5" aria-label="Octax Racing Fuels home">
          <Logo className="h-9 w-9" />
          <span className="font-display text-xl uppercase tracking-tight">Octax</span>
        </Link>

        <nav className="hidden items-center gap-1 md:flex" aria-label="Primary">
          {links.map((l) => (
            <Link
              key={l.href}
              href={l.href}
              className={`kicker px-4 py-2 transition-colors ${
                isActive(pathname, l.href)
                  ? "text-ink"
                  : "text-muted hover:text-ink"
              }`}
            >
              {l.label}
              {isActive(pathname, l.href) && (
                <span className="ml-2 inline-block h-1.5 w-1.5 bg-lime align-middle" />
              )}
            </Link>
          ))}
        </nav>

        <div className="flex items-center gap-2">
          <Link
            href="/cart/"
            className="group relative flex items-center gap-2 border-2 border-ink bg-ink px-4 py-2 text-paper transition-colors hover:bg-lime hover:text-ink"
          >
            <span className="kicker">Cart</span>
            <span className="grid h-5 min-w-5 place-items-center bg-lime px-1 font-mono text-xs font-bold text-ink group-hover:bg-ink group-hover:text-lime">
              {ready ? count : 0}
            </span>
          </Link>
          <button
            type="button"
            className="border-2 border-ink p-2 md:hidden"
            aria-label="Toggle menu"
            aria-expanded={open}
            onClick={() => setOpen((v) => !v)}
          >
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" aria-hidden="true">
              {open ? <path d="M6 6l12 12M6 18L18 6" strokeLinecap="round" /> : <path d="M4 7h16M4 12h16M4 17h16" strokeLinecap="round" />}
            </svg>
          </button>
        </div>
      </div>

      {open && (
        <nav className="border-t-2 border-ink md:hidden" aria-label="Mobile">
          <div className="mx-auto flex max-w-7xl flex-col px-4 py-1">
            {[{ href: "/", label: "Home" }, ...links].map((l) => (
              <Link
                key={l.href}
                href={l.href}
                onClick={() => setOpen(false)}
                className={`kicker border-b border-line py-4 ${
                  isActive(pathname, l.href) ? "text-ink" : "text-muted"
                }`}
              >
                {l.label}
              </Link>
            ))}
          </div>
        </nav>
      )}
    </header>
  );
}
