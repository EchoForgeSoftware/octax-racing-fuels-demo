import type { OrderRow, Profile } from "./supabase";

// Public sample credentials, never a backend account or an authentication bypass.
export const DEMO_EMAIL = "customer@example.test";
export const DEMO_PASSWORD = "OctaDemo2026!";
export const DEMO_USER_ID = "local-demo-customer";
export const DEMO_SESSION_KEY = "octa-local-customer-demo-v1";

/**
 * Demo mode runs only with the explicit build flag, no connected backend and
 * indexing off, on loopback or on hosts listed exactly in NEXT_PUBLIC_DEMO_HOSTS
 * (e.g. the Cloudflare preview "octa-performance.pages.dev").
 */
export function allowCustomerDemo(flag: string | undefined, hostname: string, backendConnected: boolean, indexable: boolean, extraHosts = "") {
  const hosts = ["127.0.0.1", "localhost", "[::1]", ...extraHosts.split(",").map((h) => h.trim().toLowerCase()).filter((h) => /^[a-z0-9.-]+\.[a-z]{2,}$/.test(h))];
  return flag === "true" && hosts.includes(hostname) && !backendConnected && !indexable;
}

export function demoCredentialsMatch(email: string, password: string) {
  return email.trim().toLowerCase() === DEMO_EMAIL && password === DEMO_PASSWORD;
}

export function initialDemoProfile(): Profile {
  return { id: DEMO_USER_ID, full_name: "Alex Demo", phone: "", company: "Demo Racing Team", vat_number: "",
    address: "Example workshop — sample address", city: "Pretoria", postcode: "0000" };
}

export function demoOrders(userId: string): OrderRow[] {
  if (userId !== DEMO_USER_ID) return [];
  const ethanol = { sku: "OCTA-X95-25", slug: "octa-x-95-ethanol", name: "OCTA-X Ethanol 95%", size: "25L", price: 760, qty: 2 };
  const boost = { sku: "OCTA-BOOST-5", slug: "octa-boost", name: "OCTA-BOOST Octane Booster", size: "5L", price: 440, qty: 1 };
  // Production-shaped fixtures exercise the real payment display, but exist only
  // inside the local demo provider; nothing is written to Supabase or Ozow.
  return [
    { id: 104, ref: "DEMO-OCTA-104", items: [boost], subtotal: 440, courier: 200, total: 640, status: "awaiting_payment", created_at: "2026-10-16T08:00:00Z", payment_method: "eft", payment_confirmed_at: null },
    { id: 103, ref: "DEMO-OCTA-103", items: [ethanol, boost], subtotal: 1960, courier: 400, total: 2360, status: "paid", created_at: "2026-10-14T10:00:00Z", payment_method: "ozow", payment_confirmed_at: "2026-10-14T10:05:00Z", payment_confirmed_amount: 2360, payment_reference: "DEMO-OZOW-103" },
    { id: 102, ref: "DEMO-OCTA-102", items: [{ ...ethanol, qty: 1 }], subtotal: 760, courier: 200, total: 960, status: "dispatched", created_at: "2026-10-08T07:30:00Z", payment_method: "eft", payment_confirmed_at: "2026-10-08T12:30:00Z", payment_confirmed_amount: 960, payment_reference: "DEMO-EFT-102" },
    { id: 101, ref: "DEMO-OCTA-101", items: [boost], subtotal: 440, courier: 200, total: 640, status: "cancelled", created_at: "2026-10-01T11:00:00Z", payment_method: "eft", payment_confirmed_at: null },
  ];
}
