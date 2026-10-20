"use client";

import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { categories, products } from "@/lib/products";
import { ProductCard } from "./ProductCard";
import { useOnWebsite } from "./Available";

const filters = [{ slug: "all", name: "All" }, ...categories];

export function ShopGrid() {
  const params = useSearchParams();
  const router = useRouter();
  const pathname = usePathname();

  // The URL is the source of truth, so footer and category links work while
  // already on /shop/, and a filtered view can be shared or bookmarked.
  const requested = params.get("category") ?? "all";
  const active = filters.some((f) => f.slug === requested) ? requested : "all";

  function select(slug: string) {
    const href = slug === "all" ? pathname : `${pathname}?category=${slug}`;
    router.replace(href, { scroll: false });
  }

  const onWebsite = useOnWebsite();
  // Products switched off in the back office (Products & pricing) aren't listed.
  const list = (active === "all" ? products : products.filter((p) => p.category === active)).filter(onWebsite);
  const activeName = filters.find((f) => f.slug === active)?.name;

  return (
    <div>
      <div className="flex flex-wrap gap-2" role="group" aria-label="Filter by category">
        {filters.map((f) => (
          <button
            key={f.slug}
            type="button"
            aria-pressed={active === f.slug}
            onClick={() => select(f.slug)}
            className={`kicker min-h-11 border-2 border-ink px-4 py-2.5 transition-colors ${
              active === f.slug ? "bg-ink text-lime" : "text-ink hover:bg-lime"
            }`}
          >
            {f.name}
          </button>
        ))}
      </div>

      <p className="num mt-5 font-mono text-xs uppercase tracking-wider text-muted" aria-live="polite">
        {list.length} product{list.length === 1 ? "" : "s"}
        {active !== "all" && <> in {activeName}</>}
      </p>

      <div className="mt-6 grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
        {list.map((p) => (
          <ProductCard key={p.slug} product={p} />
        ))}
      </div>
    </div>
  );
}
