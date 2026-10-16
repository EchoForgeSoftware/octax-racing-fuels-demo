import type { Metadata } from "next";
import { AdminShell } from "@/components/admin/AdminShell";
import { RepsAdmin } from "@/components/admin/Reps";
import { buildMetadata } from "@/lib/metadata";

export const metadata: Metadata = buildMetadata({
  path: "/admin/reps/",
  title: "Reps | Back Office",
  description: "Back office reps, referral agreements and commission.",
  noindex: true,
});

export default function AdminRepsPage() {
  return (
    <AdminShell>
      <RepsAdmin />
    </AdminShell>
  );
}
