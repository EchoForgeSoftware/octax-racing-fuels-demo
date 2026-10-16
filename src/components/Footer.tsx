import Link from "next/link";
import Image from "next/image";
import { SITE } from "@/lib/site";
import { OctaLogo } from "./brand/Wordmark";
import zrgLogo from "@/assets/zrg-x-logo.png";

const columns = [
  {
    title: "Shop",
    links: [
      { label: "All products", href: "/shop/" },
      { label: "OCTA-X Ethanol 95%", href: "/shop/octa-x-ethanol/" },
      { label: "OCTA-M Methanol", href: "/shop/octa-m-methanol/" },
      { label: "OCTA-BOOST", href: "/shop/octa-boost/" },
      { label: "OCTA-SHOT", href: "/shop/octa-shot/" },
      { label: "OCTA-TORQUE", href: "/shop/octa-torque/" },
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
    <footer className="border-t-2 border-ink bg-ink text-paper">
      <div className="mx-auto max-w-7xl px-4 py-16 sm:px-6">
        <div className="grid gap-12 lg:grid-cols-[1.4fr_1fr_1fr_1fr]">
          <div>
            <OctaLogo tone="light" className="h-14 w-auto" />
            <p className="mt-5 font-label text-2xl font-extrabold uppercase italic text-lime">
              {SITE.tagline}
            </p>
            <p className="mt-3 max-w-xs text-sm text-paper/70">
              OCTA-X ethanol 95%, OCTA-M methanol and OCTA-BOOST octane booster for
              performance use.
            </p>
            <div className="mt-6 inline-flex items-center gap-3">
              <span className="block bg-white p-2">
                <Image src={zrgLogo} alt={SITE.legalName} className="h-10 w-auto" />
              </span>
              <span className="max-w-[10rem] text-xs text-paper/60">
                OCTA Performance is a brand of {SITE.legalName}
              </span>
            </div>
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
          <p>&copy; {new Date().getFullYear()} {SITE.legalName} · Demo</p>
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
