// Pure payment validation, shared with regression tests. No browser prices,
// totals, callback URLs, user ids or payment-status claims are trusted.
export type Catalogue = {
  items: { sku: string; slug: string; name: string; size: string; price: number | null }[];
  courier: { fee: number; freeFrom: Record<string, number>; localTowns?: string[] };
};

/** Mirrors localTown() in src/lib/courierRates.ts: the town in the local own-delivery area, if any. */
export function localTown(city: unknown, towns: string[] = []): string | null {
  const words = (typeof city === "string" ? city : "").toLowerCase().replace(/[^a-z]+/g, " ").trim().split(" ").filter(Boolean);
  if (!words.length) return null;
  // Whole words only: "Boksburg North" matches Boksburg, "Kemptonpark" matches Kempton Park, "Benonix" matches nothing.
  return towns.find((t) => {
    const tw = t.split(" ");
    return words.some((_, i) => tw.every((w, j) => words[i + j] === w)) || words.includes(tw.join(""));
  }) ?? null;
}

export class CheckoutError extends Error {
  constructor(message: string, public status = 400) { super(message); }
}

export function validateCapability(ref: unknown, token: unknown): asserts ref is string {
  if (typeof ref !== "string" || !/^OCTA-[A-F0-9]{12}$/.test(ref) || typeof token !== "string" || !/^[a-f0-9]{64}$/.test(token)) {
    throw new CheckoutError("Your payment reference is invalid. Please return to checkout.");
  }
}

export function quoteCart(input: unknown, catalogue: Catalogue, city?: unknown) {
  if (!Array.isArray(input) || input.length < 1 || input.length > 30) throw new CheckoutError("Please check the items in your cart.");
  const quantities = new Map<string, number>();
  for (const line of input) {
    if (!line || typeof line.sku !== "string" || !Number.isSafeInteger(line.qty) || line.qty < 1 || line.qty > 1000) {
      throw new CheckoutError("Each item needs a valid whole-number quantity.");
    }
    const qty = (quantities.get(line.sku) ?? 0) + line.qty;
    if (qty > 1000) throw new CheckoutError("Please contact us for orders above 1,000 packs per product.");
    quantities.set(line.sku, qty);
  }
  let subtotalCents = 0;
  let courierCents = 0;
  const items = [...quantities].sort(([a], [b]) => a.localeCompare(b)).map(([sku, qty]) => {
    const product = catalogue.items.find((p) => p.sku === sku);
    if (!product || product.price === null || product.price <= 0) throw new CheckoutError("A product is unavailable for online payment. Please review your cart.");
    const litres = /ml/i.test(product.size) ? parseFloat(product.size) / 1000 : parseFloat(product.size);
    const threshold = catalogue.courier.freeFrom[String(litres)];
    const drum = /drum/i.test(product.size);
    if (!drum && !threshold) throw new CheckoutError("Delivery for this pack needs a quote. Please use manual EFT after confirming delivery with us.");
    subtotalCents += Math.round(product.price * 100) * qty;
    if (drum || qty < threshold) courierCents += Math.round(catalogue.courier.fee * 100) * qty;
    return { ...product, price: product.price, qty };
  });
  // Free own delivery inside the local area (35 km around Benoni, Brakpan, Boksburg, Kempton Park).
  if (localTown(city, catalogue.courier.localTowns)) courierCents = 0;
  const total = (subtotalCents + courierCents) / 100;
  if (total > 9_999_999 || total <= 0) throw new CheckoutError("Please contact us to arrange this order.");
  return { items, subtotal: subtotalCents / 100, courier: courierCents / 100, total };
}

/** Optional South African VAT number: digits only, 10 long, starting with 4. Mirrors src/lib/vat.ts. */
export function validVat(value: string): boolean {
  const v = value.replace(/[\s-]/g, "");
  return v === "" || /^4\d{9}$/.test(v);
}

const OPTIONAL_CUSTOMER_FIELDS = new Set(["company", "vat"]);

export function validateCustomer(input: unknown) {
  if (!input || typeof input !== "object") throw new CheckoutError("Please complete your delivery details.");
  const raw = input as Record<string, unknown>;
  const limits = { name: 200, email: 254, phone: 30, company: 200, vat: 20, address: 500, city: 120, postcode: 20 };
  const customer = {} as Record<keyof typeof limits, string>;
  for (const [key, limit] of Object.entries(limits)) {
    // Optional fields may be missing entirely (older checkout pages in open tabs).
    const value = OPTIONAL_CUSTOMER_FIELDS.has(key) ? raw[key] ?? "" : raw[key];
    if (typeof value !== "string" || value.length > limit || (!OPTIONAL_CUSTOMER_FIELDS.has(key) && !value.trim())) throw new CheckoutError("Please complete valid delivery details.");
    customer[key as keyof typeof limits] = value.trim();
  }
  if (!validVat(customer.vat)) throw new CheckoutError("A South African VAT number is 10 digits starting with 4.");
  customer.vat = customer.vat.replace(/[\s-]/g, "");
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(customer.email) || customer.phone.replace(/\D/g, "").length < 9) {
    throw new CheckoutError("Please check your email address and phone number.");
  }
  return customer;
}

export async function sha256(value: string) {
  const bytes = new Uint8Array(await crypto.subtle.digest("SHA-256", new TextEncoder().encode(value)));
  return [...bytes].map((byte) => byte.toString(16).padStart(2, "0")).join("");
}

export function trustedRedirect(value: unknown, environment: "staging" | "production"): string {
  if (typeof value !== "string") throw new CheckoutError("Ozow did not return a payment link. Please try again.", 502);
  const url = new URL(value);
  const host = environment === "production" ? "pay.ozow.com" : "stagingpay.ozow.com";
  if (url.protocol !== "https:" || url.hostname !== host || url.port || url.username || url.password) throw new CheckoutError("Ozow returned an unexpected payment link.", 502);
  return url.href;
}

function base64Bytes(value: string) {
  return Uint8Array.from(atob(value), (char) => char.charCodeAt(0));
}

/** Svix protocol: raw-body HMAC, timestamp window, signature rotation. */
export async function verifyWebhook(raw: string, headers: Headers, secret: string, now = Date.now()): Promise<boolean> {
  const id = headers.get("svix-id");
  const timestamp = headers.get("svix-timestamp");
  const signatures = headers.get("svix-signature");
  if (!id || id.length > 256 || !timestamp || !/^\d+$/.test(timestamp) || !signatures || signatures.length > 2048 || !secret.startsWith("whsec_")) return false;
  if (Math.abs(now / 1000 - Number(timestamp)) > 300) return false;
  try {
    const key = await crypto.subtle.importKey("raw", base64Bytes(secret.slice(6)), { name: "HMAC", hash: "SHA-256" }, false, ["verify"]);
    const payload = new TextEncoder().encode(`${id}.${timestamp}.${raw}`);
    for (const entry of signatures.split(/\s+/)) {
      const [version, signature] = entry.split(",");
      if (version !== "v1" || !signature) continue;
      // WebCrypto performs the signature comparison without string equality.
      try { if (await crypto.subtle.verify("HMAC", key, base64Bytes(signature), payload)) return true; } catch { /* try rotated signature */ }
    }
  } catch { return false; }
  return false;
}

export function verifiedOutcome(event: unknown, expected: { ref: string; total: number; siteCode: string; environment: string }) {
  if (!event || typeof event !== "object") throw new CheckoutError("Invalid notification.");
  const envelope = event as { type?: string; data?: Record<string, unknown> };
  if (envelope.type !== "transaction.complete") return null;
  const data = envelope.data;
  // Requires a FULL subscription; thin events don't contain enough to bind the
  // transaction to this order's reference, amount, currency and merchant site.
  if (!data || data.TransactionReference !== expected.ref || data.SiteCode !== expected.siteCode || data.CurrencyCode !== "ZAR"
    || typeof data.Amount !== "string" || !/^\d+\.\d{2}$/.test(data.Amount) || Math.round(Number(data.Amount) * 100) !== Math.round(expected.total * 100)
    || !["True", "False"].includes(String(data.IsTest)) || (expected.environment === "production" && data.IsTest !== "False")
    || typeof data.TransactionId !== "string" || !/^[a-f0-9-]{36}$/i.test(data.TransactionId)) {
    throw new CheckoutError("Notification does not match the expected payment.", 400);
  }
  const status = String(data.Status).toLowerCase();
  if (!["successful", "pending", "incomplete", "error"].includes(status)) throw new CheckoutError("Unknown payment status.");
  return { transactionId: data.TransactionId, status: status === "successful" ? "paid" : status === "error" ? "failed" : "pending" };
}
