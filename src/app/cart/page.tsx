import type { Metadata } from "next";
import { Breadcrumbs } from "@/components/Breadcrumbs";
import { CartView } from "@/components/CartView";
import { buildMetadata } from "@/lib/metadata";

export const metadata: Metadata = buildMetadata({
  path: "/cart/",
  title: "Your Cart",
  description: "Review the fuels and additives in your Octax Racing Fuels cart before checkout.",
});

const trail = [
  { name: "Home", path: "/" },
  { name: "Cart", path: "/cart/" },
];

export default function CartPage() {
  return (
    <>
      <Breadcrumbs trail={trail} />
      <div className="mx-auto max-w-6xl px-4 py-8">
        <h1 className="mb-8 font-display text-4xl font-bold">Your cart</h1>
        <CartView />
      </div>
    </>
  );
}
