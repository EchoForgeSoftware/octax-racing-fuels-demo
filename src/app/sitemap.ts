import type { MetadataRoute } from "next";
import { absoluteUrl } from "@/lib/site";
import { products } from "@/lib/products";

export const dynamic = "force-static";

export default function sitemap(): MetadataRoute.Sitemap {
  const now = new Date();

  const staticRoutes: { path: string; priority: number }[] = [
    { path: "/", priority: 1 },
    { path: "/shop/", priority: 0.9 },
    { path: "/information/", priority: 0.7 },
    { path: "/contact/", priority: 0.6 },
    { path: "/privacy/", priority: 0.3 },
    { path: "/terms/", priority: 0.3 },
  ];

  const staticEntries = staticRoutes.map((r) => ({
    url: absoluteUrl(r.path),
    lastModified: now,
    changeFrequency: "weekly" as const,
    priority: r.priority,
  }));

  const productEntries = products.map((p) => ({
    url: absoluteUrl(`/shop/${p.slug}/`),
    lastModified: now,
    changeFrequency: "weekly" as const,
    priority: 0.8,
  }));

  return [...staticEntries, ...productEntries];
}
