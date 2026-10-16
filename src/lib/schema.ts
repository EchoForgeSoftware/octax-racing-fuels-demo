import { SITE, SITE_URL, absoluteUrl, hasContactEmail, hasContactPhone } from "./site";
import type { Product } from "./products";

const logoUrl = absoluteUrl("/og/logo.png");

export function organizationSchema() {
  return {
    "@context": "https://schema.org",
    "@type": "Organization",
    name: SITE.name,
    legalName: SITE.legalName,
    url: SITE_URL,
    logo: logoUrl,
    ...(hasContactEmail ? { email: SITE.email } : {}),
    ...(hasContactPhone ? { telephone: SITE.phoneHref } : {}),
    ...(SITE.registrationNumber ? { identifier: SITE.registrationNumber } : {}),
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
  const url = absoluteUrl(`/shop/${product.slug}/`);
  return {
    "@context": "https://schema.org",
    "@type": "Product",
    name: product.name,
    description: product.description,
    url,
    brand: { "@type": "Brand", name: SITE.name },
    image: [absoluteUrl(`/products/${product.slug}.png`)],
    offers: product.variants.filter((variant) => variant.price !== null).map((variant) => ({
      "@type": "Offer",
      name: `${product.name} ${variant.size}`,
      sku: variant.sku,
      priceCurrency: SITE.currency,
      price: variant.price!.toFixed(2),
      // No stock on hand: orders are taken and fulfilled to order.
      availability: "https://schema.org/BackOrder",
      itemCondition: "https://schema.org/NewCondition",
      url,
      seller: { "@type": "Organization", name: SITE.name },
    })),
  };
}
