import type { Metadata } from "next";
import { Breadcrumbs } from "@/components/Breadcrumbs";
import { CheckoutView } from "@/components/CheckoutView";
import { buildMetadata } from "@/lib/metadata";

export const metadata: Metadata = buildMetadata({
  path: "/checkout/",
  title: "Checkout",
  description: "Enter delivery details to place your Octax Racing Fuels order. Demo checkout, no payment is taken.",
});

const trail = [
  { name: "Home", path: "/" },
  { name: "Cart", path: "/cart/" },
  { name: "Checkout", path: "/checkout/" },
];

export default function CheckoutPage() {
  return (
    <>
      <Breadcrumbs trail={trail} />
      <div className="mx-auto max-w-7xl px-4 py-12 sm:px-6">
        <h1 className="mb-8 font-display text-[clamp(2.4rem,8vw,5rem)]">Checkout</h1>
        <CheckoutView />
      </div>
    </>
  );
}
