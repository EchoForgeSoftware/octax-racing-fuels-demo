import type { Metadata } from "next";
import { DocumentsList } from "@/components/admin/DocumentsList";
import { buildMetadata } from "@/lib/metadata";

export const metadata: Metadata = buildMetadata({
  path: "/admin/quotes/",
  title: "Quotes | Back Office",
  description: "Back office quotes.",
  noindex: true,
});

export default function AdminQuotesPage() {
  return (
    <>
      <DocumentsList kind="quote" />
    </>
  );
}
