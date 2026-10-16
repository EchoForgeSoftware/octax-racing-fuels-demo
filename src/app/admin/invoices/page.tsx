import type { Metadata } from "next";
import { AdminShell } from "@/components/admin/AdminShell";
import { DocumentsList } from "@/components/admin/DocumentsList";
import { buildMetadata } from "@/lib/metadata";

export const metadata: Metadata = buildMetadata({
  path: "/admin/invoices/",
  title: "Invoices | Back Office",
  description: "Back office invoices.",
  noindex: true,
});

export default function AdminInvoicesPage() {
  return (
    <AdminShell>
      <DocumentsList kind="invoice" />
    </AdminShell>
  );
}
