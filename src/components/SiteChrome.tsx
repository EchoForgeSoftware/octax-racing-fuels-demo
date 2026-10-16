"use client";

import { usePathname } from "next/navigation";
import type { ReactNode } from "react";

/** Shop header, footer and floating buttons; hidden inside the back office, which has its own frame. */
export function SiteChrome({ children }: { children: ReactNode }) {
  const pathname = usePathname() ?? "";
  if (/\/admin(\/|$)/.test(pathname)) return null;
  return <>{children}</>;
}
