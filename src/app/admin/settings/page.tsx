import type { Metadata } from "next";
import { SettingsAdmin } from "@/components/admin/Settings";
import { buildMetadata } from "@/lib/metadata";

export const metadata: Metadata = buildMetadata({
  path: "/admin/settings/",
  title: "Settings | Back Office",
  description: "Back office settings.",
  noindex: true,
});

export default function AdminSettingsPage() {
  return (
    <>
      <SettingsAdmin />
    </>
  );
}
