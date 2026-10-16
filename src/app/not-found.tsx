import Link from "next/link";

const helpful = [
  { href: "/shop/", label: "Shop" },
  { href: "/information/", label: "Information" },
  { href: "/contact/", label: "Contact" },
  { href: "/cart/", label: "Cart" },
];

export default function NotFound() {
  return (
    <div className="mx-auto flex max-w-3xl flex-col items-center px-4 pt-20 text-center sm:px-6">
      <p className="text-outline font-display text-[clamp(6rem,24vw,13rem)] leading-[0.8]" aria-hidden="true">
        404
      </p>
      <div
        className="mt-6 h-4 w-full max-w-md"
        style={{ backgroundImage: "repeating-linear-gradient(-45deg, var(--color-ink) 0 10px, var(--color-lime) 10px 20px)" }}
        aria-hidden="true"
      />
      <h1 className="mt-8 font-display text-[clamp(2rem,6vw,3.5rem)]">This page ran out of fuel</h1>
      <p className="mt-4 max-w-md text-ink-soft">
        The page you are looking for does not exist or may have moved. Head back to
        the store and pick up where you left off.
      </p>
      <div className="mt-9 flex flex-wrap justify-center gap-3">
        <Link href="/" className="border-2 border-ink bg-flare px-6 py-3.5 font-display uppercase text-paper transition-colors hover:bg-ink">
          Back to home
        </Link>
        <Link href="/shop/" className="border-2 border-ink px-6 py-3.5 font-display uppercase text-ink transition-colors hover:bg-ink hover:text-lime">
          Browse the shop
        </Link>
      </div>
      <nav className="mt-10 flex flex-wrap justify-center gap-x-6 gap-y-2" aria-label="Helpful links">
        {helpful.map((l) => (
          <Link key={l.href} href={l.href} className="kicker py-2 text-muted hover:text-flare">
            {l.label}
          </Link>
        ))}
      </nav>
    </div>
  );
}
