// Single source of truth for every absolute URL on the site.
// Demo phase points at GitHub Pages. At production handoff, change ORIGIN and
// BASE_PATH here and everything (canonical, sitemap, robots, og, JSON-LD) follows.

export const ORIGIN = "https://echoforgesoftware.github.io";
export const BASE_PATH = "/octax-racing-fuels-demo";

// Canonical root of the site, e.g. https://echoforgesoftware.github.io/octax-racing-fuels-demo
export const SITE_URL = `${ORIGIN}${BASE_PATH}`;

// Flip to true at production handoff so robots and per-page meta allow indexing.
export const INDEXABLE = false;

export const SITE = {
  name: "OCTA Performance",
  shortName: "OCTA",
  tagline: "Fuel the addiction",
  description:
    "OCTA Performance supplies OCTA-X ethanol 95%, OCTA-M methanol, OCTA-BOOST and OCTA-SHOT octane boosters and OCTA-TORQUE diesel improver, with online ordering and delivery.",
  // Company that owns the OCTA brand, as printed on the product labels.
  legalName: "ZRG-X (PTY) LTD",
  // Email and phone are placeholders until the real contact details are supplied.
  email: "sales@octaperformance.example",
  phoneDisplay: "+27 00 000 0000",
  phoneHref: "+270000000000",
  currency: "ZAR",
  currencySymbol: "R",
  locale: "en_ZA",
};

/** Build an absolute URL from a site-relative path like "/shop". */
export function absoluteUrl(path = "/") {
  const clean = path.startsWith("/") ? path : `/${path}`;
  return `${SITE_URL}${clean}`;
}

/** Prefix a public asset path with BASE_PATH for use outside next/link and next/image. */
export function asset(path = "/") {
  const clean = path.startsWith("/") ? path : `/${path}`;
  return `${BASE_PATH}${clean}`;
}
