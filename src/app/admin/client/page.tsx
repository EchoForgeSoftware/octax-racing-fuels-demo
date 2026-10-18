import { Suspense } from "react";
import type { Metadata } from "next";
import { ClientDetail } from "@/components/admin/Clients";
import { buildMetadata } from "@/lib/metadata";

export const metadata: Metadata = buildMetadata({
  path: "/admin/client/",
  title: "Client | Back Office",
  description: "Back office client record.",
  noindex: true,
});

export default function AdminClientPage() {
  return (
    <>
      {/* Reads ?id= from the address, so it needs a Suspense boundary in a static export. */}
      <Suspense fallback={null}>
        <ClientDetail />
      </Suspense>
    </>
  );
}
