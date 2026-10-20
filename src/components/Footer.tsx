import Link from "next/link";
import Image from "next/image";
import { SITE, hasContactEmail, hasContactPhone } from "@/lib/site";
import { IfOnWebsite } from "./Available";
import { OctaLogo } from "./brand/Wordmark";
import zrgLogo from "@/assets/zrg-x-logo.png";

const columns = [
  {
    title: "Shop",
    links: [
      { label: "All products", href: "/shop/" },
      { label: "OCTA-X Plus Ethanol 96%", href: "/shop/octa-x-ethanol/" },
      { label: "OCTA-X Ethanol 95%", href: "/shop/octa-x-95-ethanol/" },
      { label: "OCTA-M Methanol 99.9%", href: "/shop/octa-m-methanol/" },
      { label: "OCTA-BOOST", href: "/shop/octa-boost/" },
      { label: "OCTA-SHOT", href: "/shop/octa-shot/" },
      { label: "OCTA-TORQUE", href: "/shop/octa-torque/" },
    ],
  },
  {
    title: "Company",
    links: [
      { label: "My account", href: "/account/" },
      { label: "Information", href: "/information/" },
      { label: "Become a reseller", href: "/agents/" },
      { label: "Technical data sheets", href: "/information/#data-sheets" },
      { label: "Contact", href: "/contact/" },
      { label: "Privacy policy", href: "/privacy/" },
      { label: "Terms of service", href: "/terms/" },
      { label: "Delivery & returns", href: "/delivery-returns/" },
      { label: "Staff sign-in", href: "/admin/" },
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
              OCTA-X ethanol, OCTA-M methanol and OCTA-BOOST octane booster for
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
                  // Product links disappear when the product is switched off in the back office.
                  <IfOnWebsite key={l.href} slug={l.href.replace(/^\/shop\/|\/$/g, "")}>
                    <li>
                      <Link href={l.href} className="text-sm text-paper/80 transition-colors hover:text-lime">
                        {l.label}
                      </Link>
                    </li>
                  </IfOnWebsite>
                ))}
              </ul>
            </div>
          ))}

          <div>
            <h2 className="kicker text-lime">Contact</h2>
            <ul className="mt-4 space-y-2.5 text-sm">
              {hasContactEmail && <li>
                <a href={`mailto:${SITE.email}`} className="text-paper/80 hover:text-lime">{SITE.email}</a>
              </li>}
              {hasContactPhone && <li>
                <a href={`tel:${SITE.phoneHref}`} className="text-paper/80 hover:text-lime">{SITE.phoneDisplay}</a>
              </li>}
              {!hasContactEmail && !hasContactPhone && <li className="text-paper/60">Contact details will be published before ordering opens.</li>}
            </ul>
          </div>
        </div>
      </div>

      <div className="border-t border-paper/15">
        <div className="mx-auto flex max-w-7xl flex-col items-center justify-between gap-2 px-4 py-6 font-mono text-xs uppercase tracking-wider text-paper/60 sm:flex-row sm:px-6">
          <p>&copy; {new Date().getFullYear()} {SITE.legalName}</p>
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
