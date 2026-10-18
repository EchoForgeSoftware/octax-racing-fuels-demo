import type { Metadata } from "next";
import { BankAdmin } from "@/components/admin/Bank";
import { buildMetadata } from "@/lib/metadata";

export const metadata: Metadata = buildMetadata({
  path: "/admin/bank/",
  title: "Bank | Back Office",
  description: "Back office bank statement import and allocation.",
  noindex: true,
});

export default function AdminBankPage() {
  return (
    <>
      <BankAdmin />
    </>
  );
}
