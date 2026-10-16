import type { Metadata } from "next";
import { AdminShell } from "@/components/admin/AdminShell";
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
    <AdminShell>
      <ProductsAdmin />
    </AdminShell>
  );
}
