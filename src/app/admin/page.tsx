import type { Metadata } from "next";
import { AdminShell } from "@/components/admin/AdminShell";
import { AdminDashboard } from "@/components/admin/Dashboard";
import { buildMetadata } from "@/lib/metadata";

export const metadata: Metadata = buildMetadata({
  path: "/admin/",
  title: "Back Office",
  description: "OCTA Performance back office: sales, quotes, invoices and clients.",
  noindex: true,
});

export default function AdminHomePage() {
  return (
    <AdminShell>
      <AdminDashboard />
    </AdminShell>
  );
}
