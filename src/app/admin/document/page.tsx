import { Suspense } from "react";
import type { Metadata } from "next";
import { AdminShell } from "@/components/admin/AdminShell";
import { DocumentEditor } from "@/components/admin/DocumentEditor";
import { buildMetadata } from "@/lib/metadata";

export const metadata: Metadata = buildMetadata({
  path: "/admin/document/",
  title: "Quote or Invoice | Back Office",
  description: "Back office quote and invoice editor.",
  noindex: true,
});

export default function AdminDocumentPage() {
  return (
    <AdminShell>
      {/* Reads ?id= from the address, so it needs a Suspense boundary in a static export. */}
      <Suspense fallback={null}>
        <DocumentEditor />
      </Suspense>
    </AdminShell>
  );
}
