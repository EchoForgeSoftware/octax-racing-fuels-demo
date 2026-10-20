// The live back office for the Ozow functions: today's shop catalogue (prices,
// stock, courier fee, the customer's own prices) and the website invoice each
// order becomes. Before the back office is set up, checkout falls back to the
// built-in catalogue.json.
import { backofficeStore } from "./store.ts";
import { toData, updateBackoffice } from "./app/backoffice/server.ts";
import { customerClient, orderingOpen, recordWebsiteOrder, recordWebsitePayment, shopCatalogue, type ShopCatalogue, type WebsiteOrder } from "./app/backoffice/orders.ts";
import { todaySA } from "./app/backoffice/calc.ts";
import { orderEmails, type Email } from "./app/backoffice/orderEmail.ts";
import { sendEmails } from "./email.ts";
import { deliveryRules, pickDelivery } from "./app/delivery.ts";

// deno-lint-ignore no-explicit-any
type Db = any;
const makeId = (prefix: string) => `${prefix}-${crypto.randomUUID().slice(0, 8)}`;

/** null until the back office is set up. `email` must be a verified customer email. */
type Pick = ReturnType<typeof pickDelivery>;
export async function liveShop(db: Db, email: string | null): Promise<{ open: boolean; catalogue: ShopCatalogue; pick?: (lines: { size: string; qty: number }[], city: string, wanted: unknown) => Pick } | null> {
  const data = toData(await backofficeStore(db).load());
  if (!data) return null;
  const rules = deliveryRules(data.settings);
  return { open: orderingOpen(data), catalogue: shopCatalogue(data, customerClient(data, email), todaySA()),
    pick: (lines, city, wanted) => pickDelivery(lines, city, rules, wanted) };
}

/** The order as an unpaid website invoice. The payment itself never depends on this succeeding. */
export async function recordOrder(db: Db, order: WebsiteOrder): Promise<void> {
  try {
    await updateBackoffice(backofficeStore(db), "website-order", (d, env) => recordWebsiteOrder(d, order, env), todaySA(), makeId);
  } catch {
    console.warn("Website order not recorded in the back office");
  }
}

/** A verified Ozow payment on the order's invoice, and the "paid" emails (once). */
export async function recordPayment(db: Db, ref: string, amount: number, transactionId: string): Promise<void> {
  try {
    const store = backofficeStore(db);
    const recorded = await updateBackoffice(store, "ozow-payment", (d, env) => recordWebsitePayment(d, ref, amount, "ozow", transactionId, env), todaySA(), makeId);
    if (!recorded.ok || !recorded.result) return;
    const data = toData(await store.load(["settings", "documents"]));
    const { data: row } = await db.from("orders").select("customer,items,subtotal,courier,total").eq("ref", ref).maybeSingle();
    if (!data || !row) return;
    const order: WebsiteOrder = { ref, method: "ozow", customer: row.customer, courier: Number(row.courier),
      items: (row.items as WebsiteOrder["items"]).map(({ sku, name, size, price, qty }) => ({ sku, name, size, price: Number(price), qty: Number(qty) })) };
    const invoice = data.documents.find((x) => x.kind === "invoice" && x.reference === ref)?.number ?? null;
    const mail = orderEmails(order, { subtotal: Number(row.subtotal), courier: Number(row.courier), total: Number(row.total) }, invoice, data.settings, "paid");
    await sendEmails([mail.business, mail.customer].filter((m): m is Email => m !== null));
  } catch {
    console.warn("Ozow payment not recorded in the back office");
  }
}
