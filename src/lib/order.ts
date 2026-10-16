// The order just placed, kept in sessionStorage so the confirmation page can
// show the amount to pay by EFT and the reference to use.
import type { CartItem } from "@/components/CartContext";
import { cartCourier } from "./courier";
import { getSupabase } from "./supabase";
import { LEGAL } from "./site";

export type PlacedOrder = {
  ref: string;
  items: CartItem[];
  subtotal: number;
  courier: number;
  total: number;
  name: string;
  email: string;
  placedAt: string;
  paymentMethod?: "eft" | "ozow";
  /** Random capability for this tab to read only its own payment outcome. */
  checkoutToken?: string;
  checkoutFingerprint?: string;
  termsVersion?: string;
};

const KEY = "octa-last-order";

/** Random EFT reference with enough space to avoid collisions across orders. */
export function newOrderRef(): string {
  return `OCTA-${crypto.randomUUID().replaceAll("-", "").slice(0, 12).toUpperCase()}`;
}

export function buildOrder(items: CartItem[], details: { name: string; email: string; city?: string }): PlacedOrder {
  const subtotal = items.reduce((n, i) => n + i.price * i.qty, 0);
  // Free own delivery inside the local area; the payment server applies the same rule.
  const { fee } = cartCourier(items, details.city);
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

export function saveOrder(order: PlacedOrder): boolean {
  try {
    sessionStorage.setItem(KEY, JSON.stringify(order));
    return true;
  } catch {
    // Storage blocked: the confirmation page directs customers to their account.
    return false;
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

export type CustomerDetails = {
  name: string;
  email: string;
  phone: string;
  company: string;
  /** Optional South African VAT number, digits only. */
  vat: string;
  address: string;
  city: string;
  postcode: string;
};

/**
 * Store the order in Supabase so it is not lost and shows in the customer's
 * order history. Guests are stored with no user id. A retry uses the same
 * reference, so a lost response cannot create a second order.
 */
export async function persistOrder(order: PlacedOrder, customer: CustomerDetails, userId: string | null, termsAccepted = false): Promise<{ error: string | null }> {
  if (!termsAccepted) return { error: "Please read and agree to the terms before placing your order." };
  const sb = getSupabase();
  if (!sb) return { error: "Online ordering is being set up. Please wait until ordering opens before making a payment." };
  try {
    const { error } = await sb.from("orders").upsert({
      ref: order.ref,
      user_id: userId,
      customer,
      items: order.items,
      subtotal: order.subtotal,
      courier: order.courier,
      total: order.total,
      terms_version: LEGAL.version,
    }, { onConflict: "ref", ignoreDuplicates: true });
    if (error) return { error: "We couldn't save your order. Your cart has been kept. Try again before making a payment." };
    return { error: null };
  } catch {
    return { error: "We couldn't confirm your order. Check your connection and try again. Your cart has been kept; please wait before paying." };
  }
}
