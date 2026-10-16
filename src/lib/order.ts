// The order just placed, kept in sessionStorage so the confirmation page can
// show the amount to pay by EFT and the reference to use.
import type { CartItem } from "@/components/CartContext";
import { cartCourier } from "./courier";

export type PlacedOrder = {
  ref: string;
  items: CartItem[];
  subtotal: number;
  courier: number;
  total: number;
  name: string;
  email: string;
  placedAt: string;
};

const KEY = "octa-last-order";

/** Short, readable EFT reference, e.g. OCTA-482915. */
export function newOrderRef(): string {
  return `OCTA-${Math.floor(100000 + Math.random() * 900000)}`;
}

export function buildOrder(items: CartItem[], details: { name: string; email: string }): PlacedOrder {
  const subtotal = items.reduce((n, i) => n + i.price * i.qty, 0);
  const { fee } = cartCourier(items);
  return {
    ref: newOrderRef(),
    items,
    subtotal,
    courier: fee,
    total: subtotal + fee,
    name: details.name,
    email: details.email,
    placedAt: new Date().toISOString(),
  };
}

export function saveOrder(order: PlacedOrder): void {
  try {
    sessionStorage.setItem(KEY, JSON.stringify(order));
  } catch {
    // storage blocked: the confirmation page falls back to generic instructions
  }
}

export function readOrder(): PlacedOrder | null {
  try {
    const raw = sessionStorage.getItem(KEY);
    return raw ? (JSON.parse(raw) as PlacedOrder) : null;
  } catch {
    return null;
  }
}
