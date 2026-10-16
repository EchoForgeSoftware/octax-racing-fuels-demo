import { SITE, SITE_URL, absoluteUrl } from "./site";
import type { Product } from "./products";
import { fromPrice } from "./products";

const logoUrl = absoluteUrl("/og/default.png");

export function organizationSchema() {
  return {
    "@context": "https://schema.org",
    "@type": "Organization",
    name: SITE.name,
    legalName: SITE.legalName,
    url: SITE_URL,
    logo: logoUrl,
    email: SITE.email,
    description: SITE.description,
    sameAs: [],
  };
}

export function websiteSchema() {
  return {
    "@context": "https://schema.org",
    "@type": "WebSite",
    name: SITE.name,
    url: SITE_URL,
    description: SITE.description,
  };
}

export function breadcrumbSchema(trail: { name: string; path: string }[]) {
  return {
    "@context": "https://schema.org",
    "@type": "BreadcrumbList",
    itemListElement: trail.map((item, i) => ({
      "@type": "ListItem",
      position: i + 1,
      name: item.name,
      item: absoluteUrl(item.path),
    })),
  };
}

export function productSchema(product: Product) {
  const price = fromPrice(product);
  return {
    "@context": "https://schema.org",
    "@type": "Product",
    name: product.name,
    description: product.description,
    sku: product.variants[0]?.sku,
    brand: { "@type": "Brand", name: SITE.name },
    image: logoUrl,
    offers: {
      "@type": "AggregateOffer",
      priceCurrency: SITE.currency,
      lowPrice: price,
      offerCount: product.variants.filter((v) => v.price !== null).length,
      // No stock on hand: orders are taken and fulfilled to order.
      availability: "https://schema.org/BackOrder",
      url: absoluteUrl(`/shop/${product.slug}/`),
    },
  };
}
