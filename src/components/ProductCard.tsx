import Link from "next/link";
import type { Product } from "@/lib/products";
import { fromPrice, totalStock, getCategory } from "@/lib/products";
import { formatPrice } from "@/lib/format";
import { ProductArt } from "./ProductArt";

export function ProductCard({ product }: { product: Product }) {
  const price = fromPrice(product);
  const stock = totalStock(product);
  const category = getCategory(product.category);

  return (
    <Link
      href={`/shop/${product.slug}/`}
      className="group flex flex-col overflow-hidden rounded-xl border border-border bg-surface transition-colors hover:border-brand"
    >
      <div className="relative aspect-square overflow-hidden bg-surface-2">
        <ProductArt
          product={product}
          className="h-full w-full transition-transform duration-500 group-hover:scale-105"
        />
        <span className="absolute left-3 top-3 rounded-full bg-black/60 px-2.5 py-1 text-xs font-medium text-fg backdrop-blur">
          {category?.name}
        </span>
      </div>
      <div className="flex flex-1 flex-col p-4">
        <h3 className="font-display text-base font-semibold leading-snug">
          {product.name}
        </h3>
        <p className="mt-1 line-clamp-2 text-sm text-muted">{product.short}</p>
        <div className="mt-4 flex items-end justify-between">
          <div>
            <span className="text-xs text-muted">from</span>
            <div className="font-display text-lg font-bold text-brand">
              {formatPrice(price)}
            </div>
          </div>
          <span
            className={`text-xs font-medium ${
              stock > 0 ? "text-acid" : "text-muted"
            }`}
          >
            {stock > 0 ? "In stock" : "Out of stock"}
          </span>
        </div>
      </div>
    </Link>
  );
}
