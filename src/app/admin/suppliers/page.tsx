import type { Metadata } from "next";
import { SuppliersAdmin } from "@/components/admin/Suppliers";
import { buildMetadata } from "@/lib/metadata";

export const metadata: Metadata = buildMetadata({
  path: "/admin/suppliers/",
  title: "Suppliers | Back Office",
  description: "Back office suppliers and supplier invoices.",
  noindex: true,
});

export default function AdminSuppliersPage() {
  return (
    <>
      <SuppliersAdmin />
    </>
  );
}
