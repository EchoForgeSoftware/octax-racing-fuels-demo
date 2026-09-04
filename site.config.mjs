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
  name: "Octax Racing Fuels",
  shortName: "Octax",
  tagline: "Race fuels, methanol, ethanol and additives",
  description:
    "Octax Racing Fuels supplies high-octane race fuels, methanol, ethanol and performance additives for motorsport, karting and marine, with online ordering and delivery.",
  email: "sales@octaxracingfuels.example",
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
