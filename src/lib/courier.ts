// Courier pricing from the client:
// - R200 courier per pack for 5L, 25L and 500ml packs;
// - free delivery on a line of 10 or more of the same 5L or 25L product,
//   or 12 or more of the same 500ml product;
// - 210L drums always pay the standard R200 courier per drum;
// - any other size is quoted separately.
import { formatPrice } from "./format";
import { courierRates, localTown } from "./courierRates";

export { localTown };

export type DeliveryMethod = "own" | "courier" | "collect";

/** How an order to this town is delivered: our own vehicle can be arranged inside the local area, else courier. */
export function deliveryFor(city: string | null | undefined): { method: "own"; town: string } | { method: "courier" } {
  const town = localTown(city);
  return town ? { method: "own", town } : { method: "courier" };
}

export const DELIVERY_LABEL: Record<DeliveryMethod, string> = {
  own: "OCTA local delivery",
  courier: "Courier",
  collect: "Collected",
};

export const COURIER_FEE = courierRates.fee;

/** Free-delivery threshold per pack size, in litres. */
const FREE_FROM: Record<number, number> = courierRates.freeFrom;

export type Courier =
  | { kind: "fee"; fee: number; freeFrom: number | null }
  | { kind: "free"; freeFrom: number }
  | { kind: "quote" };

function litres(size: string): number {
  return /ml/i.test(size) ? parseFloat(size) / 1000 : parseFloat(size);
}

/** Courier for one cart line: `qty` packs of one product in one size. */
export function courierFor(size: string, qty: number, feePerPack: number = COURIER_FEE): Courier {
  if (/drum/i.test(size)) return { kind: "fee", fee: feePerPack * qty, freeFrom: null };
  const freeFrom = FREE_FROM[litres(size)];
  if (!freeFrom) return { kind: "quote" };
  if (qty >= freeFrom) return { kind: "free", freeFrom };
  return { kind: "fee", fee: feePerPack * qty, freeFrom };
}

/** Courier across the cart: total fee, and whether any line still needs a quote. */
export function cartCourier(lines: { size: string; qty: number }[], city?: string | null, feePerPack: number = COURIER_FEE): { fee: number; quoted: boolean; local: string | null } {
  // Inside the local area we can arrange our own delivery, but the cost is confirmed per order:
  // checkout charges the standard courier rate and flags the order as local.
  const local = localTown(city);
  let fee = 0;
  let quoted = false;
  for (const line of lines) {
    const c = courierFor(line.size, line.qty, feePerPack);
    if (c.kind === "fee") fee += c.fee;
    if (c.kind === "quote") quoted = true;
  }
  return { fee, quoted, local };
}

/** Short description of a line's courier, e.g. "Courier R600.00 (3 × R200.00)". */
export function courierNote(size: string, qty: number, feePerPack: number = COURIER_FEE): string {
  const c = courierFor(size, qty, feePerPack);
  if (c.kind === "free") return `Free delivery (${c.freeFrom} or more)`;
  if (c.kind === "quote") return "Courier quoted separately";
  return qty > 1
    ? `Courier ${formatPrice(c.fee)} (${qty} × ${formatPrice(feePerPack)})`
    : `Courier ${formatPrice(c.fee)}`;
}

/** Hint shown before the free-delivery threshold is reached. */
export function freeDeliveryHint(size: string, qty: number, feePerPack: number = COURIER_FEE): string | null {
  const c = courierFor(size, qty, feePerPack);
  if (c.kind !== "fee" || c.freeFrom === null) return null;
  const more = c.freeFrom - qty;
  return `Add ${more} more for free delivery`;
}
