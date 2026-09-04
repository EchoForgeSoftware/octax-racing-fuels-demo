import Link from "next/link";
import { Logo } from "./Logo";
import { SITE } from "@/lib/site";

export function Footer() {
  return (
    <footer className="border-t border-border bg-surface">
      <div className="mx-auto grid max-w-6xl gap-8 px-4 py-12 sm:grid-cols-2 lg:grid-cols-4">
        <div>
          <div className="flex items-center gap-2">
            <Logo className="h-7 w-7" />
            <span className="font-display font-bold">Octax Racing Fuels</span>
          </div>
          <p className="mt-3 text-sm text-muted">
            High-octane race fuels, methanol, ethanol and additives for motorsport,
            karting and marine.
          </p>
        </div>

        <div>
          <h2 className="text-sm font-semibold">Shop</h2>
          <ul className="mt-3 space-y-2 text-sm text-muted">
            <li><Link href="/shop/" className="hover:text-fg">All products</Link></li>
            <li><Link href="/shop/?category=race-fuels" className="hover:text-fg">Race fuels</Link></li>
            <li><Link href="/shop/?category=methanol" className="hover:text-fg">Methanol</Link></li>
            <li><Link href="/shop/?category=ethanol" className="hover:text-fg">Ethanol</Link></li>
            <li><Link href="/shop/?category=additives" className="hover:text-fg">Additives</Link></li>
          </ul>
        </div>

        <div>
          <h2 className="text-sm font-semibold">Company</h2>
          <ul className="mt-3 space-y-2 text-sm text-muted">
            <li><Link href="/information/" className="hover:text-fg">Information</Link></li>
            <li><Link href="/contact/" className="hover:text-fg">Contact</Link></li>
            <li><Link href="/privacy/" className="hover:text-fg">Privacy policy</Link></li>
            <li><Link href="/terms/" className="hover:text-fg">Terms of service</Link></li>
          </ul>
        </div>

        <div>
          <h2 className="text-sm font-semibold">Contact</h2>
          <ul className="mt-3 space-y-2 text-sm text-muted">
            <li>
              <a href={`mailto:${SITE.email}`} className="hover:text-fg">
                {SITE.email}
              </a>
            </li>
            <li>
              <a href={`tel:${SITE.phoneHref}`} className="hover:text-fg">
                {SITE.phoneDisplay}
              </a>
            </li>
          </ul>
        </div>
      </div>

      <div className="border-t border-border">
        <div className="mx-auto flex max-w-6xl flex-col items-center justify-between gap-2 px-4 py-6 text-xs text-muted sm:flex-row">
          <p>&copy; {new Date().getFullYear()} Octax Racing Fuels. Demo site, sample data.</p>
          <p>
            Made and maintained by{" "}
            <a
              href="https://echosoftware.co.za"
              className="font-medium text-fg hover:text-brand"
              rel="noopener"
            >
              Echo Software
            </a>
          </p>
        </div>
      </div>
    </footer>
  );
}
