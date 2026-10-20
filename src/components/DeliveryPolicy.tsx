"use client";

import { COURIER_QUOTE_NOTE } from "@/lib/delivery";
import { formatPrice } from "@/lib/format";
import { usePricing } from "./PricingContext";

const title = (t: string) => t.replace(/\b\w/g, (c) => c.toUpperCase());
const list = (towns: string[]) => towns.length <= 1 ? towns.map(title).join("") : `${towns.slice(0, -1).map(title).join(", ")} and ${title(towns[towns.length - 1])}`;

/** The delivery part of the Delivery & Returns page, following back-office Settings → Delivery. */
export function DeliveryPolicy() {
  const { delivery: d } = usePricing();
  return (
    <>
      {d.collection.enabled && (
        <>
          <h3 className="mt-4 font-bold text-ink">Collection (free)</h3>
          <p className="mt-1">You can collect your order free of charge once payment has reflected. The collection address is sent with your order confirmation.{d.collection.hours ? ` Collection times: ${d.collection.hours}.` : ""}</p>
        </>
      )}
      <h3 className="mt-4 font-bold text-ink">Local delivery</h3>
      <p className="mt-1">We deliver ourselves within {d.localKm} km of {list(d.localTowns)} on orders of {d.minLitres} L or more (for example 5 × 25 L){d.localFee === null ? ", at the standard courier rates below." : d.localFee > 0 ? `, for ${formatPrice(d.localFee)} per order.` : ", free of charge."}{d.collection.enabled ? " Smaller orders can be collected." : ""} You choose collection or delivery at checkout.</p>
      <h3 className="mt-4 font-bold text-ink">Courier delivery</h3>
      {d.courierOnline ? (
        <>
          <p className="mt-1">Orders to other areas can be sent by courier.</p>
          <p className="mt-2">Standard courier charge: {formatPrice(d.courierFee)} per pack. 210 L drums always pay the courier charge.</p>
        </>
      ) : <p className="mt-1">Courier delivery is on request: choose &quot;Courier (quote to follow)&quot; at checkout. {COURIER_QUOTE_NOTE}</p>}
    </>
  );
}
