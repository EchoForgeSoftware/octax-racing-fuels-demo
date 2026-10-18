"use client";

import { usePricing } from "./PricingContext";

/** The current courier charge per pack, as set in the back office. */
export function CourierFee() {
  return <>R{usePricing().courierFee}</>;
}
