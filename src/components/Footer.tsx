import Link from "next/link";
import { SITE } from "@/lib/site";

const columns = [
  {
    title: "Shop",
    links: [
      { label: "All products", href: "/shop/" },
      { label: "Race fuels", href: "/shop/?category=race-fuels" },
      { label: "Methanol", href: "/shop/?category=methanol" },
      { label: "Ethanol", href: "/shop/?category=ethanol" },
      { label: "Additives", href: "/shop/?category=additives" },
    ],
  },
  {
    title: "Company",
    links: [
      { label: "Information", href: "/information/" },
      { label: "Contact", href: "/contact/" },
      { label: "Privacy policy", href: "/privacy/" },
      { label: "Terms of service", href: "/terms/" },
    ],
  },
];

export function Footer() {
  return (
    <footer className="mt-24 border-t-2 border-ink bg-ink text-paper">
      <div className="mx-auto max-w-7xl px-4 py-16 sm:px-6">
        <div className="grid gap-12 lg:grid-cols-[1.4fr_1fr_1fr_1fr]">
          <div>
            <p className="font-display text-4xl uppercase leading-none">
              Octax<span className="text-lime">.</span>
            </p>
            <p className="mt-4 max-w-xs text-sm text-paper/70">
              High-octane race fuels, methanol, ethanol and additives for motorsport,
              karting and marine.
            </p>
          </div>

          {columns.map((col) => (
            <div key={col.title}>
              <h2 className="kicker text-lime">{col.title}</h2>
              <ul className="mt-4 space-y-2.5">
                {col.links.map((l) => (
                  <li key={l.href}>
                    <Link href={l.href} className="text-sm text-paper/80 transition-colors hover:text-lime">
                      {l.label}
                    </Link>
                  </li>
                ))}
              </ul>
            </div>
          ))}

          <div>
            <h2 className="kicker text-lime">Contact</h2>
            <ul className="mt-4 space-y-2.5 text-sm">
              <li>
                <a href={`mailto:${SITE.email}`} className="text-paper/80 hover:text-lime">{SITE.email}</a>
              </li>
              <li>
                <a href={`tel:${SITE.phoneHref}`} className="text-paper/80 hover:text-lime">{SITE.phoneDisplay}</a>
              </li>
            </ul>
          </div>
        </div>
      </div>

      <div className="border-t border-paper/15">
        <div className="mx-auto flex max-w-7xl flex-col items-center justify-between gap-2 px-4 py-6 font-mono text-xs uppercase tracking-wider text-paper/60 sm:flex-row sm:px-6">
          <p>&copy; {new Date().getFullYear()} Octax Racing Fuels · Demo</p>
          <p>
            Made and maintained by{" "}
            <a href="https://echosoftware.co.za" className="text-lime hover:underline" rel="noopener">
              Echo Software
            </a>
          </p>
        </div>
      </div>
    </footer>
  );
}
