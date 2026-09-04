import Link from "next/link";
import { Logo } from "@/components/Logo";

export default function NotFound() {
  return (
    <div className="mx-auto flex max-w-2xl flex-col items-center px-4 py-24 text-center">
      <Logo className="h-14 w-14" />
      <p className="mt-6 font-display text-6xl font-extrabold text-brand">404</p>
      <h1 className="mt-2 font-display text-2xl font-bold">
        This page ran out of fuel
      </h1>
      <p className="mt-3 max-w-md text-muted">
        The page you are looking for does not exist or may have moved. Head back to
        the store and pick up where you left off.
      </p>
      <div className="mt-8 flex flex-wrap justify-center gap-3">
        <Link href="/" className="rounded-lg bg-brand px-6 py-3 font-semibold text-black transition-colors hover:bg-brand-strong">
          Back to home
        </Link>
        <Link href="/shop/" className="rounded-lg border border-border px-6 py-3 font-semibold text-fg transition-colors hover:border-brand">
          Browse the shop
        </Link>
      </div>
      <nav className="mt-10 flex flex-wrap justify-center gap-x-6 gap-y-2 text-sm text-muted" aria-label="Helpful links">
        <Link href="/shop/" className="hover:text-brand">Shop</Link>
        <Link href="/information/" className="hover:text-brand">Information</Link>
        <Link href="/contact/" className="hover:text-brand">Contact</Link>
        <Link href="/cart/" className="hover:text-brand">Cart</Link>
      </nav>
    </div>
  );
}
