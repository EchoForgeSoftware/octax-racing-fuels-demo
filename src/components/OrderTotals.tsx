import { formatPrice } from "@/lib/format";
import { cartCourier } from "@/lib/courier";
import type { CartItem } from "./CartContext";

/** Subtotal, courier and total rows shared by the cart and checkout summaries. */
export function OrderTotals({ items, subtotal, label = "Subtotal" }: {
  items: CartItem[];
  subtotal: number;
  label?: string;
}) {
  const { fee, quoted } = cartCourier(items);
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
