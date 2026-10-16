import type { Metadata } from "next";
import { SITE, INDEXABLE, absoluteUrl } from "./site";

type PageMetaInput = {
  path: string; // site-relative, e.g. "/shop/"
  title: string; // page-specific part; brand is appended
  description: string;
  ogImage?: string; // site-relative path to a 1200x630 image
  /** Keep private pages (account, password reset) out of search even when the site is indexable. */
  noindex?: boolean;
};

const DEFAULT_OG = "/og/default.png";

export function buildMetadata({
  path,
  title,
  description,
  ogImage = DEFAULT_OG,
  noindex = false,
}: PageMetaInput): Metadata {
  const url = absoluteUrl(path);
  const image = absoluteUrl(ogImage);
  // <title> gets the brand appended by the root template; OG/Twitter set it in full.
  const fullTitle = `${title} | ${SITE.name}`;
  const privatePage = /^\/(account|cart|checkout)(\/|$)/.test(path);

  return {
    title,
    description,
    alternates: { canonical: url },
    robots: INDEXABLE && !noindex && !privatePage
      ? { index: true, follow: true }
      : { index: false, follow: false },
    openGraph: {
      type: "website",
      siteName: SITE.name,
      title: fullTitle,
      description,
      url,
      locale: SITE.locale,
      images: [{ url: image, width: 1200, height: 630, alt: SITE.name }],
    },
    twitter: {
      card: "summary_large_image",
      title: fullTitle,
      description,
      images: [image],
    },
  };
}
