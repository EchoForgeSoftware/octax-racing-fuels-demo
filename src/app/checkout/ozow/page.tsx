import type { Metadata } from "next";
import { OzowReturn } from "@/components/OzowReturn";
import { buildMetadata } from "@/lib/metadata";

export const metadata: Metadata = buildMetadata({ path: "/checkout/ozow/", title: "Ozow Payment Status",
  description: "Check the verified payment status of your OCTA order.", noindex: true });

export default function OzowReturnPage() {
  return <div className="mx-auto max-w-6xl px-4 py-20"><OzowReturn /></div>;
}
