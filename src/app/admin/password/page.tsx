import type { Metadata } from "next";
import { ChangePassword } from "@/components/admin/ChangePassword";
import { buildMetadata } from "@/lib/metadata";

export const metadata: Metadata = buildMetadata({
  path: "/admin/password/",
  title: "Change Password | Back Office",
  description: "Change your back-office password.",
  noindex: true,
});

export default function AdminPasswordPage() {
  return <ChangePassword />;
}
