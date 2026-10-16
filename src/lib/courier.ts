// Courier pricing from the client:
// - R200 courier per pack for 5L, 25L and 500ml packs;
// - free delivery on a line of 10 or more of the same 5L or 25L product,
//   or 12 or more of the same 500ml product;
// - 210L drums always pay the standard R200 courier per drum;
// - any other size is quoted separately.
import { formatPrice } from "./format";

export const COURIER_FEE = 200;

/** Free-delivery threshold per pack size, in litres. */
const FREE_FROM: Record<number, number> = { 5: 10, 25: 10, 0.5: 12 };

export type Courier =
  | { kind: "fee"; fee: number; freeFrom: number | null }
  | { kind: "free"; freeFrom: number }
  | { kind: "quote" };

function litres(size: string): number {
  return /ml/i.test(size) ? parseFloat(size) / 1000 : parseFloat(size);
}

/** Courier for one cart line: `qty` packs of one product in one size. */
export function courierFor(size: string, qty: number): Courier {
  if (/drum/i.test(size)) return { kind: "fee", fee: COURIER_FEE * qty, freeFrom: null };
  const freeFrom = FREE_FROM[litres(size)];
  if (!freeFrom) return { kind: "quote" };
  if (qty >= freeFrom) return { kind: "free", freeFrom };
  return { kind: "fee", fee: COURIER_FEE * qty, freeFrom };
}

/** Courier across the cart: total fee, and whether any line still needs a quote. */
export function cartCourier(lines: { size: string; qty: number }[]): { fee: number; quoted: boolean } {
  let fee = 0;
  let quoted = false;
  for (const line of lines) {
    const c = courierFor(line.size, line.qty);
    if (c.kind === "fee") fee += c.fee;
    if (c.kind === "quote") quoted = true;
  }
  return { fee, quoted };
}

/** Short description of a line's courier, e.g. "Courier R600.00 (3 × R200.00)". */
export function courierNote(size: string, qty: number): string {
  const c = courierFor(size, qty);
  if (c.kind === "free") return `Free delivery (${c.freeFrom} or more)`;
  if (c.kind === "quote") return "Courier quoted separately";
  return qty > 1
    ? `Courier ${formatPrice(c.fee)} (${qty} × ${formatPrice(COURIER_FEE)})`
    : `Courier ${formatPrice(c.fee)}`;
}

/** Hint shown before the free-delivery threshold is reached. */
export function freeDeliveryHint(size: string, qty: number): string | null {
  const c = courierFor(size, qty);
  if (c.kind !== "fee" || c.freeFrom === null) return null;
  const more = c.freeFrom - qty;
  return `Add ${more} more for free delivery`;
}
