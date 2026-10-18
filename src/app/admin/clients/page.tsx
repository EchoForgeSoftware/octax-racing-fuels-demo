import type { Metadata } from "next";
import { ClientsList } from "@/components/admin/Clients";
import { buildMetadata } from "@/lib/metadata";

export const metadata: Metadata = buildMetadata({
  path: "/admin/clients/",
  title: "Clients | Back Office",
  description: "Back office clients.",
  noindex: true,
});

export default function AdminClientsPage() {
  return (
    <>
      <ClientsList />
    </>
  );
}
