import { accountsEnabled, getSupabase } from "./supabase";
import type { CustomerDetails, PlacedOrder } from "./order";

export const ozowEnabled = accountsEnabled && process.env.NEXT_PUBLIC_OZOW_ENABLED === "true";
/**
 * Online ordering stays closed until the business can see and act on orders
 * (live back office or order emails). Accounts can be live before that.
 */
export const orderingEnabled = accountsEnabled && process.env.NEXT_PUBLIC_ORDERING_ENABLED === "true";
export type PaymentStatus = "pending" | "paid" | "failed";

async function callPayment(body: Record<string, unknown>) {
  const sb = getSupabase();
  if (!sb || (body.action !== "status" && !ozowEnabled)) throw new Error("Ozow payments are being connected. Please try again once checkout opens.");
  const session = await sb.auth.getSession();
  if (session.error) throw new Error("Your sign-in session couldn't be checked. Please sign in again.");
  // The gateway permits guests; only real session JWTs are sent as bearer
  // credentials. Publishable/anon API keys are not customer sessions.
  const { data, error } = await sb.functions.invoke("ozow-checkout", { body,
    headers: { Authorization: session.data.session ? `Bearer ${session.data.session.access_token}` : "" } });
  if (error) {
    let message = "We couldn't connect to Ozow. Your cart has been kept. Please try again.";
    if (error.context instanceof Response) {
      const result = await error.context.json().catch(() => null);
      if (typeof result?.error === "string") message = result.error;
    }
    throw new Error(message);
  }
  if (!data || typeof data !== "object") throw new Error("Payment details could not be confirmed. Please try again.");
  return data;
}

export async function createOzowPayment(order: PlacedOrder, customer: CustomerDetails, termsAccepted: boolean, captchaToken?: string, account?: { orderAs: "personal" | "company"; saveCustomer: boolean; registration: string }): Promise<{ redirectUrl: string; order: PlacedOrder }> {
  const data = await callPayment({ action: "create", ref: order.ref, checkoutToken: order.checkoutToken,
    items: order.items.map(({ sku, qty }) => ({ sku, qty })), customer, expectedTotal: order.total, termsAccepted, termsVersion: order.termsVersion, captchaToken, ...account });
  const redirect = new URL(data.redirectUrl);
  // Never navigate to an arbitrary URL returned by an unavailable/misconfigured service.
  if (redirect.protocol !== "https:" || !["pay.ozow.com", "stagingpay.ozow.com"].includes(redirect.hostname) || redirect.port || redirect.username || redirect.password) {
    throw new Error("The payment link couldn't be verified. Please try again later.");
  }
  return { redirectUrl: redirect.href, order: { ...order, ...data.order, paymentMethod: "ozow", checkoutToken: order.checkoutToken } };
}

export async function getOzowStatus(order: PlacedOrder): Promise<{ status: PaymentStatus; testMode: boolean }> {
  const data = await callPayment({ action: "status", ref: order.ref, checkoutToken: order.checkoutToken });
  if (!["pending", "paid", "failed"].includes(data.status)) throw new Error("Payment status is not available yet.");
  return { status: data.status, testMode: data.testMode === true };
}
