import type { Metadata } from "next";
import { Breadcrumbs } from "@/components/Breadcrumbs";
import { AccountView } from "@/components/account/AccountView";
import { buildMetadata } from "@/lib/metadata";

export const metadata: Metadata = buildMetadata({
  path: "/account/",
  title: "Customer Dashboard",
  description: "Your OCTA Performance order history, ordered items, recorded payments and saved delivery details.",
  noindex: true,
});

const trail = [
  { name: "Home", path: "/" },
  { name: "Customer", path: "/account/" },
];

export default function AccountPage() {
  return (
    <>
      <Breadcrumbs trail={trail} />
      <div className="mx-auto max-w-7xl px-4 py-12 sm:px-6">
        <p className="kicker text-flare">Your OCTA account</p>
        <h1 className="mb-8 mt-3 font-display text-[clamp(2.4rem,8vw,5rem)]">Customer area</h1>
        <AccountView />
      </div>
    </>
  );
}
