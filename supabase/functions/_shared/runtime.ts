import { createClient } from "npm:@supabase/supabase-js@2.118.0";
import { CheckoutError } from "./payment.ts";

export function required(name: string) {
  const value = Deno.env.get(name)?.trim();
  if (!value) throw new CheckoutError("Payments are not connected yet. Please try again later.", 503);
  return value;
}

export function database() {
  return createClient(required("SUPABASE_URL"), required("SUPABASE_SERVICE_ROLE_KEY"), {
    auth: { persistSession: false, autoRefreshToken: false },
  });
}

export function settings() {
  const environment = required("OZOW_ENVIRONMENT");
  if (environment !== "staging" && environment !== "production") throw new CheckoutError("Payment configuration needs attention.", 503);
  const siteUrl = new URL(required("CHECKOUT_SITE_URL"));
  if (siteUrl.protocol !== "https:" || siteUrl.search || siteUrl.hash || siteUrl.username || siteUrl.password) throw new CheckoutError("Payment return address needs attention.", 503);
  const origins = required("CHECKOUT_ALLOWED_ORIGINS").split(",").map((value) => new URL(value.trim()).origin);
  if (!origins.includes(siteUrl.origin)) throw new CheckoutError("Payment return address needs attention.", 503);
  return { environment: environment as "staging" | "production", siteCode: required("OZOW_SITE_CODE"), origins,
    siteUrl: siteUrl.href.replace(/\/$/, ""),
    baseUrl: environment === "production" ? "https://one.ozow.com/v1" : "https://stagingone.ozow.com/v1" };
}

// Tokens and credentials never leave the function. No provider error bodies
// are forwarded to the browser or written to logs.
export async function requestOzow(config: ReturnType<typeof settings>, path: string, body: unknown, key: string) {
  const response = await fetch(`${config.baseUrl}/token`, {
    method: "POST", headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams({ client_id: required("OZOW_CLIENT_ID"), client_secret: required("OZOW_CLIENT_SECRET"), scope: "payments", grant_type: "client_credentials" }),
    signal: AbortSignal.timeout(15000),
  });
  if (!response.ok) throw new CheckoutError("We couldn't connect to the payment provider. Your cart has been kept.", 502);
  const token = await response.json();
  if (!token.access_token) throw new CheckoutError("The payment provider is unavailable. Please try again.", 502);
  const payment = await fetch(`${config.baseUrl}${path}`, { method: "POST", headers: {
    Authorization: `Bearer ${token.access_token}`, "Content-Type": "application/json", "Idempotency-Key": key,
  }, body: JSON.stringify(body), signal: AbortSignal.timeout(20000) });
  if (!payment.ok) throw new CheckoutError("We couldn't prepare your Ozow payment. Your cart has been kept. Please retry.", 502);
  return payment.json();
}
