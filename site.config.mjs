// Single source of truth for every absolute URL on the site.
// The demo defaults to GitHub Pages. At production handoff, set the public
// origin/base-path environment values; all canonical and asset URLs follow.

const configuredOrigin = new URL(process.env.NEXT_PUBLIC_SITE_ORIGIN || "https://echoforgesoftware.github.io");
if (configuredOrigin.protocol !== "https:" || configuredOrigin.pathname !== "/" || configuredOrigin.search || configuredOrigin.hash || configuredOrigin.username || configuredOrigin.password) {
  throw new Error("NEXT_PUBLIC_SITE_ORIGIN must be an HTTPS origin without a path or credentials.");
}
export const ORIGIN = configuredOrigin.origin;
export const BASE_PATH = process.env.NEXT_PUBLIC_BASE_PATH ?? "/octax-racing-fuels-demo";
if (BASE_PATH && (!/^\/[a-zA-Z0-9/_-]+$/.test(BASE_PATH) || BASE_PATH.endsWith("/") || BASE_PATH.includes("//"))) throw new Error("NEXT_PUBLIC_BASE_PATH must be empty or a clean path without a trailing slash.");

// Canonical root of the site, e.g. https://echoforgesoftware.github.io/octax-racing-fuels-demo
export const SITE_URL = `${ORIGIN}${BASE_PATH}`;

// Flip to true at production handoff so robots and per-page meta allow indexing.
export const INDEXABLE = process.env.NEXT_PUBLIC_SITE_INDEXABLE === "true" && process.env.VERCEL_ENV !== "preview" && process.env.VERCEL_ENV !== "development";

export const LEGAL = { version: "2026-10-16", reviewed: process.env.NEXT_PUBLIC_POLICIES_REVIEWED === "true" };

export const SITE = {
  name: "OCTA Performance",
  shortName: "OCTA",
  tagline: "Fuel the addiction",
  description:
    "OCTA Performance supplies OCTA-X ethanol 96%, OCTA-M methanol, OCTA-BOOST and OCTA-SHOT octane boosters and OCTA-TORQUE diesel improver, with online ordering and delivery.",
  // Company that owns the OCTA brand, as printed on the product labels.
  legalName: "ZRG-X (PTY) LTD",
  // Mailboxes on octa-boost.com (2026-10-16). Phone and address follow.
  email: process.env.NEXT_PUBLIC_SUPPORT_EMAIL || "info@octa-boost.com",
  salesEmail: "sales@octa-boost.com",
  accountsEmail: "accounts@octa-boost.com",
  phoneDisplay: process.env.NEXT_PUBLIC_SUPPORT_PHONE || "+27 00 000 0000",
  phoneHref: (process.env.NEXT_PUBLIC_SUPPORT_PHONE || "+270000000000").replace(/[^+\d]/g, ""),
  registrationNumber: process.env.NEXT_PUBLIC_COMPANY_REGISTRATION || "2026/667453/07",
  businessAddress: process.env.NEXT_PUBLIC_BUSINESS_ADDRESS || "",
  privacyEmail: process.env.NEXT_PUBLIC_PRIVACY_EMAIL || "info@octa-boost.com",
  privacyOfficer: process.env.NEXT_PUBLIC_PRIVACY_CONTACT || "",
  currency: "ZAR",
  currencySymbol: "R",
  locale: "en_ZA",
};

export const hasContactEmail = /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(SITE.email) && !/\.(example|invalid|test)$/i.test(SITE.email);
export const hasContactPhone = SITE.phoneHref !== "+270000000000" && /^\+\d{9,15}$/.test(SITE.phoneHref);

// EFT payment details shown at checkout and on the order confirmation, from the
// FNB account confirmation letter (2026-10-16). If any field is emptied the bank
// details are hidden and customers are told the details will be sent to them.
export const BANK = {
  accountHolder: "ZRG-X (PTY) LTD",
  bank: "FNB (First National Bank)",
  accountNumber: "63226106151",
  branchCode: "252605",
  accountType: "Gold Business Account",
};

export const hasBankDetails = Object.values(BANK).every((v) => v.trim() !== "");

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
