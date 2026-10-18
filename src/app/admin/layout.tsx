import type { ReactNode } from "react";
import { AdminShell } from "@/components/admin/AdminShell";

/**
 * One back office for every admin page: the signed-in staff member and their
 * records load once and stay loaded while moving between pages.
 */
export default function AdminLayout({ children }: { children: ReactNode }) {
  return <AdminShell>{children}</AdminShell>;
}
