import type { Metadata } from "next";
import { OrderConfirmation } from "@/components/OrderConfirmation";
import { buildMetadata } from "@/lib/metadata";

export const metadata: Metadata = buildMetadata({
  path: "/checkout/success/",
  title: "Order Confirmed",
  description: "Your demo order with Octax Racing Fuels has been confirmed.",
});

export default function CheckoutSuccessPage() {
  return (
    <div className="mx-auto max-w-6xl px-4 py-20">
      <OrderConfirmation />
    </div>
  );
}
