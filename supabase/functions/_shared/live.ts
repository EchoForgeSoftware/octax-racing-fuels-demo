// The live back office for the Ozow functions: today's shop catalogue (prices,
// stock, courier fee, the customer's own prices) and the website invoice each
// order becomes. Before the back office is set up, checkout falls back to the
// built-in catalogue.json.
import { backofficeStore } from "./store.ts";
import { toData, updateBackoffice } from "./app/backoffice/server.ts";
import { customerClient, orderingOpen, recordWebsiteOrder, recordWebsitePayment, shopCatalogue, type ShopCatalogue, type WebsiteOrder } from "./app/backoffice/orders.ts";
import { todaySA } from "./app/backoffice/calc.ts";

// deno-lint-ignore no-explicit-any
type Db = any;
const makeId = (prefix: string) => `${prefix}-${crypto.randomUUID().slice(0, 8)}`;

/** null until the back office is set up. `email` must be a verified customer email. */
export async function liveShop(db: Db, email: string | null): Promise<{ open: boolean; catalogue: ShopCatalogue } | null> {
  const data = toData(await backofficeStore(db).load());
  if (!data) return null;
  return { open: orderingOpen(data), catalogue: shopCatalogue(data, customerClient(data, email), todaySA()) };
}

/** The order as an unpaid website invoice. The payment itself never depends on this succeeding. */
export async function recordOrder(db: Db, order: WebsiteOrder): Promise<void> {
  try {
    await updateBackoffice(backofficeStore(db), "website-order", (d, env) => recordWebsiteOrder(d, order, env), todaySA(), makeId);
  } catch {
    console.warn("Website order not recorded in the back office");
  }
}

/** A verified Ozow payment on the order's invoice. */
export async function recordPayment(db: Db, ref: string, amount: number, transactionId: string): Promise<void> {
  try {
    await updateBackoffice(backofficeStore(db), "ozow-payment", (d, env) => recordWebsitePayment(d, ref, amount, "ozow", transactionId, env), todaySA(), makeId);
  } catch {
    console.warn("Ozow payment not recorded in the back office");
  }
}
