import type { Metadata } from "next";
import { Archivo, Archivo_Black, Barlow_Condensed, Space_Mono } from "next/font/google";
import "./globals.css";
import { Providers } from "@/components/Providers";
import { Nav } from "@/components/Nav";
import { SiteChrome } from "@/components/SiteChrome";
import { Footer } from "@/components/Footer";
import { BackToTop } from "@/components/BackToTop";
import { CartToast } from "@/components/CartToast";
import { JsonLd } from "@/components/JsonLd";
import { organizationSchema, websiteSchema } from "@/lib/schema";
import { SITE, SITE_URL, INDEXABLE } from "@/lib/site";

const display = Archivo_Black({
  subsets: ["latin"],
  weight: "400",
  variable: "--font-display",
  display: "swap",
});

const sans = Archivo({
  subsets: ["latin"],
  variable: "--font-sans",
  display: "swap",
});

// Condensed face for the product labels ("FUEL THE ADDICTION", UN lines, mix table).
const label = Barlow_Condensed({
  subsets: ["latin"],
  weight: ["500", "600", "800"],
  style: ["normal", "italic"],
  variable: "--font-label",
  display: "swap",
});

const mono = Space_Mono({
  subsets: ["latin"],
  weight: ["400", "700"],
  variable: "--font-mono",
  display: "swap",
});

export const metadata: Metadata = {
  metadataBase: new URL(SITE_URL),
  title: {
    // Only the not-found page falls back to this default; every real page sets its own.
    default: `Page not found | ${SITE.name}`,
    template: `%s | ${SITE.name}`,
  },
  description: SITE.description,
  applicationName: SITE.name,
  robots: INDEXABLE
    ? { index: true, follow: true }
    : { index: false, follow: false },
  openGraph: {
    type: "website",
    siteName: SITE.name,
    locale: SITE.locale,
    url: SITE_URL,
  },
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html
      lang="en"
      className={`${display.variable} ${sans.variable} ${label.variable} ${mono.variable}`}
    >
      <body className="flex min-h-screen flex-col">
        <a href="#main-content" className="sr-only z-[100] bg-lime p-3 text-ink focus:not-sr-only focus:fixed focus:left-4 focus:top-4">Skip to content</a>
        <JsonLd data={[organizationSchema(), websiteSchema()]} />
        <Providers>
          <SiteChrome><Nav /></SiteChrome>
          {/* Bottom gap before the footer, dropped when a page ends on a full-bleed band. */}
          <main id="main-content" tabIndex={-1} className="flex-1 pb-24 has-[[data-flush-footer]]:pb-0">{children}</main>
          <SiteChrome>
            <Footer />
            <BackToTop />
            <CartToast />
          </SiteChrome>
        </Providers>
      </body>
    </html>
  );
}
