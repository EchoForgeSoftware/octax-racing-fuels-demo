"use client";

import { useSearchParams } from "next/navigation";
import { useState } from "react";
import { categories, products } from "@/lib/products";
import { ProductCard } from "./ProductCard";

const filters = [{ slug: "all", name: "All" }, ...categories];

export function ShopGrid() {
  const params = useSearchParams();
  const initial = params.get("category") ?? "all";
  const known = filters.some((f) => f.slug === initial) ? initial : "all";
  const [active, setActive] = useState(known);

  const list = active === "all" ? products : products.filter((p) => p.category === active);

  return (
    <div>
      <div className="flex flex-wrap gap-2" role="tablist" aria-label="Product categories">
        {filters.map((f) => (
          <button
            key={f.slug}
            type="button"
            role="tab"
            aria-selected={active === f.slug}
            onClick={() => setActive(f.slug)}
            className={`kicker border-2 border-ink px-4 py-2.5 transition-colors ${
              active === f.slug ? "bg-ink text-lime" : "text-ink hover:bg-lime"
            }`}
          >
            {f.name}
          </button>
        ))}
      </div>

      <p className="mt-5 font-mono text-xs uppercase tracking-wider text-muted">
        {list.length} product{list.length === 1 ? "" : "s"}
      </p>

      <div className="mt-6 grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
        {list.map((p) => (
          <ProductCard key={p.slug} product={p} />
        ))}
      </div>
    </div>
  );
}
