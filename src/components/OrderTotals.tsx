import { formatPrice } from "@/lib/format";
import { cartCourier } from "@/lib/courier";
import { courierRates } from "@/lib/courierRates";
import { usePricing } from "./PricingContext";
import type { CartItem } from "./CartContext";

/** Subtotal, courier and total rows shared by the cart and checkout summaries. */
export function OrderTotals({ items, subtotal, label = "Subtotal", city, delivery }: {
  items: CartItem[];
  subtotal: number;
  label?: string;
  /** Delivery town, when known. */
  city?: string;
  /** The delivery chosen at checkout (collect, local delivery or courier). */
  delivery?: { label: string; fee: number; quoted?: boolean } | null;
}) {
  const { courierFee } = usePricing();
  if (delivery !== undefined) return <ChosenTotals subtotal={subtotal} label={label} delivery={delivery} />;
  if (!city) return <CartTotals subtotal={subtotal} label={label} />;
  const { fee, quoted, local } = cartCourier(items, city, courierFee);
  const total = subtotal + fee;
  const courierText = fee > 0 ? formatPrice(fee) : quoted ? "Quoted separately" : "Free";

  return (
    <>
      <dl className="num mt-5 space-y-2.5 text-sm">
        <div className="flex justify-between gap-4">
          <dt className="font-mono text-xs uppercase tracking-wider text-muted">{label}</dt>
          <dd className="font-bold">{formatPrice(subtotal)}</dd>
        </div>
        <div className="flex justify-between gap-4">
          <dt className="font-mono text-xs uppercase tracking-wider text-muted">Courier</dt>
          <dd className={fee > 0 ? "font-bold" : "text-right text-muted"}>{courierText}</dd>
        </div>
        {local && (
          <p className="text-right text-xs text-muted">You are inside our {courierRates.localRadiusKm} km local area: we can arrange local delivery and will confirm its cost with you.</p>
        )}
        {quoted && fee > 0 && (
          <p className="text-right text-xs text-muted">Some items: courier quoted separately</p>
        )}
      </dl>
      <div className="mt-5 flex items-end justify-between gap-4 border-t-2 border-ink pt-4">
        <span className="kicker">
          Total
          <span className="mt-1 block font-normal normal-case tracking-normal text-muted">
            {quoted ? "Incl. VAT; some courier quoted separately" : "Incl. VAT and courier"}
          </span>
        </span>
        <span className="num font-display text-3xl text-flare">{formatPrice(total)}</span>
      </div>
    </>
  );
}

/** Checkout: the delivery the customer picked, and the total they pay. */
function ChosenTotals({ subtotal, label, delivery }: { subtotal: number; label: string; delivery: { label: string; fee: number; quoted?: boolean } | null }) {
  const fee = delivery?.fee ?? 0;
  return (
    <>
      <dl className="num mt-5 space-y-2.5 text-sm">
        <div className="flex justify-between gap-4">
          <dt className="font-mono text-xs uppercase tracking-wider text-muted">{label}</dt>
          <dd className="font-bold">{formatPrice(subtotal)}</dd>
        </div>
        <div className="flex justify-between gap-4">
          <dt className="font-mono text-xs uppercase tracking-wider text-muted">{delivery?.label ?? "Delivery"}</dt>
          <dd className={fee > 0 ? "font-bold" : "text-right text-muted"}>{delivery ? (delivery.quoted ? "Quoted after ordering" : fee > 0 ? formatPrice(fee) : "Free") : "Choose above"}</dd>
        </div>
      </dl>
      <div className="mt-5 flex items-end justify-between gap-4 border-t-2 border-ink pt-4">
        <span className="kicker">Total<span className="mt-1 block font-normal normal-case tracking-normal text-muted">Incl. VAT{fee > 0 ? " and delivery" : delivery?.quoted ? ", courier excluded" : ""}</span></span>
        <span className="num font-display text-3xl text-flare">{formatPrice(subtotal + fee)}</span>
      </div>
    </>
  );
}

/** Cart: collection is free; delivery is chosen (and priced) at checkout. */
function CartTotals({ subtotal, label }: { subtotal: number; label: string }) {
  const { delivery } = usePricing();
  return (
    <>
      <dl className="num mt-5 space-y-2.5 text-sm">
        <div className="flex justify-between gap-4">
          <dt className="font-mono text-xs uppercase tracking-wider text-muted">{label}</dt>
          <dd className="font-bold">{formatPrice(subtotal)}</dd>
        </div>
        <div className="flex justify-between gap-4">
          <dt className="font-mono text-xs uppercase tracking-wider text-muted">Delivery</dt>
          <dd className="text-right text-muted">Chosen at checkout</dd>
        </div>
        <p className="text-right text-xs text-muted">
          {delivery.collection.enabled ? "Collect for free, or add delivery at checkout. " : ""}Local delivery within {delivery.localKm} km from {delivery.minLitres} L; courier {delivery.courierOnline ? `${formatPrice(delivery.courierFee)} per pack` : "on request"}.
        </p>
      </dl>
      <div className="mt-5 flex items-end justify-between gap-4 border-t-2 border-ink pt-4">
        <span className="kicker">Total<span className="mt-1 block font-normal normal-case tracking-normal text-muted">Incl. VAT, before delivery</span></span>
        <span className="num font-display text-3xl text-flare">{formatPrice(subtotal)}</span>
      </div>
    </>
  );
}
