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
      className="group flex flex-col border-2 border-ink bg-panel transition-transform duration-300 ease-[cubic-bezier(0.22,1,0.36,1)] hover:-translate-x-1 hover:-translate-y-1 hover:shadow-[8px_8px_0_0_var(--color-ink)]"
    >
      <div className="relative overflow-hidden border-b-2 border-ink">
        <ProductArt product={product} className="aspect-[4/3] w-full transition-transform duration-500 ease-[cubic-bezier(0.22,1,0.36,1)] group-hover:scale-[1.04]" />
        <span className="absolute left-0 top-0 bg-ink px-2.5 py-1 font-mono text-[0.62rem] font-bold uppercase tracking-wider text-lime">
          {category?.name}
        </span>
      </div>

      <div className="flex flex-1 flex-col p-4">
        <h3 className="font-display text-lg uppercase leading-none">{product.name}</h3>
        <p className="mt-2 line-clamp-2 text-sm text-muted">{product.short}</p>
        <div className="mt-4 flex items-end justify-between border-t-2 border-ink pt-3">
          <div>
            <span className="kicker text-muted">From</span>
            <div className="font-display text-2xl">{formatPrice(price)}</div>
          </div>
          <span className="flex items-center gap-1.5 font-mono text-[0.68rem] font-bold uppercase tracking-wider">
            <span className={`h-2 w-2 ${stock > 0 ? "bg-lime" : "bg-flare"}`} />
            {stock > 0 ? "In stock" : "Sold out"}
          </span>
        </div>
      </div>
    </Link>
  );
}
