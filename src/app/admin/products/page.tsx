import type { Metadata } from "next";
import { ProductsAdmin } from "@/components/admin/Products";
import { buildMetadata } from "@/lib/metadata";

export const metadata: Metadata = buildMetadata({
  path: "/admin/products/",
  title: "Products & Pricing | Back Office",
  description: "Back office products and pricing.",
  noindex: true,
});

export default function AdminProductsPage() {
  return (
    <>
      <ProductsAdmin />
    </>
  );
}
