// GENERATED from src/lib/backoffice/orders.ts by scripts/gen-backoffice-function.mjs. Do not edit.
// Website orders, worked out on the server from the live back office: the
// shop catalogue the payment code prices against (back-office prices, the
// customer's own prices, stock status and courier fee), and the invoice each
// order becomes in the back office. Pure; used by the "backoffice",
// "ozow-checkout" and "ozow-webhook" Edge Functions and tested in Node.
import { addDays, formatNumber, priceFor } from "./calc.ts";
import { accountEmails, type CustomerProfile } from "./customerForm.ts";
import { isSoldOut, stockLevels } from "./stock.ts";
import { courierRates, localTown } from "../courierRates.ts";
import { DELIVERY_NAME, deliveryRules, type DeliveryMethod } from "../delivery.ts";
import type { BackofficeData, Client, Document } from "./types.ts";

type Env = { today: string; uid: (prefix: string) => string };

/** The shape the payment code (supabase/functions/_shared/payment.ts quoteCart) prices against. */
export type ShopCatalogue = {
  items: { sku: string; slug: string; name: string; size: string; price: number | null }[];
  courier: { fee: number; freeFrom: Record<string, number>; localTowns: string[] };
};

/** The client record a verified customer email belongs to (login email or authorised buyer). */
export function customerClient(d: BackofficeData, email: string | null | undefined): Client | null {
  const e = email?.trim().toLowerCase();
  return e ? d.clients.find((c) => accountEmails(c).includes(e)) ?? null : null;
}

/** What can be ordered online right now, at this customer's prices. Hidden, coming-soon and out-of-stock products have no price. */
export function shopCatalogue(d: BackofficeData, client: Client | null, today: string): ShopCatalogue {
  const levels = d.catalogue.some((i) => i.stock === "auto") ? stockLevels(d, today) : [];
  return {
    items: d.catalogue.map((i) => ({
      sku: i.sku, slug: i.slug ?? "", name: i.productName, size: i.size,
      price: i.active && !i.comingSoon && !isSoldOut(i, levels) ? priceFor(i, client) : null,
    })),
    courier: { fee: d.settings.courierFee ?? courierRates.fee, freeFrom: courierRates.freeFrom, localTowns: courierRates.localTowns },
  };
}

/** Online ordering is opened and closed by a main admin in Settings. */
export const orderingOpen = (d: BackofficeData | null) => d?.settings.onlineOrdering === true;

export type WebsiteOrder = {
  ref: string;
  method: "eft" | "ozow";
  items: { sku: string; name: string; size: string; price: number; qty: number }[];
  courier: number;
  customer: { name: string; email: string; phone: string; company: string; vat: string; address: string; city: string; postcode: string };
  /** Company orders, "save me as a customer" and account forms become a client record; others go on Website guests. */
  orderAs?: "personal" | "company";
  saveCustomer?: boolean;
  registration?: string;
  profile?: CustomerProfile;
  /** Collect, OCTA local delivery or courier, as chosen at checkout. */
  deliveryMethod?: DeliveryMethod;
};

const text = (v: unknown, max: number) => (typeof v === "string" ? v.trim().slice(0, max) : "");

/** Record a website order as an unpaid website invoice (once per order reference). Returns the invoice number. */
export function recordWebsiteOrder(d: BackofficeData, o: WebsiteOrder, env: Env): string {
  const existing = d.documents.find((x) => x.kind === "invoice" && x.reference === o.ref);
  if (existing) return existing.number;
  const email = text(o.customer.email, 254).toLowerCase();
  const company = o.orderAs === "company";
  const save = company || o.saveCustomer === true || !!o.profile;
  let client = customerClient(d, email) ?? d.clients.find((c) => c.email.toLowerCase() === email && !!email);
  if (save) {
    const fields = {
      name: text(o.customer.name, 200), email, phone: text(o.customer.phone, 40), vat: text(o.customer.vat, 20),
      company: company ? text(o.customer.company, 200) : client?.company ?? "",
      address: text(o.customer.address, 500), city: text(o.customer.city, 120),
    };
    if (client) Object.assign(client, fields, o.profile ? { profile: o.profile } : {});
    else {
      client = {
        id: env.uid("c"), type: "website", ...fields,
        notes: company ? `Company order from the website${o.registration ? ` · Reg. ${text(o.registration, 40)}` : ""}.` : "Saved from website checkout.",
        tier: "retail", prices: {}, linkedEmail: email, createdAt: env.today, repId: null, cash: false, ...(o.profile ? { profile: o.profile } : {}),
      };
      d.clients.push(client);
    }
  } else if (!client) {
    client = d.clients.find((c) => c.id === "c-web-guests");
    if (!client) {
      client = { id: "c-web-guests", type: "website", name: "Website guests", company: "", email: "", phone: "", vat: "", address: "", city: "",
        notes: "Website orders from customers who didn't save their details.", tier: "retail", prices: {}, linkedEmail: "", createdAt: env.today, repId: null, cash: false };
      d.clients.push(client);
    }
  }
  const guest = client.id === "c-web-guests";
  const c = o.customer;
  const doc: Document = {
    id: env.uid("i"), kind: "invoice", number: formatNumber("invoice", d.settings.next.invoice++), clientId: client.id,
    date: env.today, dueDate: addDays(env.today, d.settings.paymentTermsDays), channel: "website",
    lines: o.items.map((i) => ({ id: env.uid("l"), sku: i.sku, description: `${i.name} — ${i.size}`, qty: i.qty, unitPrice: i.price,
      unitCost: d.catalogue.find((x) => x.sku === i.sku)?.cost ?? 0 })),
    courier: o.courier, notes: [
      `Website order · ${o.method === "ozow" ? "Ozow" : "EFT"} · awaiting payment.`,
      o.deliveryMethod ? `${DELIVERY_NAME[o.deliveryMethod]}.` : "",
      guest ? `Customer: ${text(c.name, 200)}, ${text(c.email, 254)}, ${text(c.phone, 40)}.` : "",
      `Deliver to: ${text(c.address, 500)}, ${text(c.city, 120)} ${text(c.postcode, 20)}.`,
    ].filter(Boolean).join(" "),
    reference: o.ref, quoteState: "accepted", linkedId: null, cancelled: false, payments: [], createdAt: env.today, createdBy: "Website",
    delivery: { method: o.deliveryMethod === "collect" ? "collect" : o.deliveryMethod === "local" ? "own" : o.deliveryMethod === "courier" ? "courier"
      : localTown(c.city, deliveryRules(d.settings).localArea) ? "own" : "courier", status: "pending" },
  };
  d.documents.push(doc);
  return doc.number;
}

/** A confirmed online payment on the order's invoice (once per order; never more than the balance). */
export function recordWebsitePayment(d: BackofficeData, ref: string, amount: number, method: "ozow" | "eft", reference: string, env: Env): boolean {
  const doc = d.documents.find((x) => x.kind === "invoice" && x.reference === ref);
  if (!doc || doc.payments.some((p) => p.note.startsWith(`Online payment ${ref}`))) return false;
  const total = Math.round((doc.lines.reduce((n, l) => n + l.qty * l.unitPrice, 0) + doc.courier) * 100) / 100;
  const owing = Math.round((total - doc.payments.reduce((n, p) => n + p.amount, 0)) * 100) / 100;
  const paid = Math.min(Math.round(amount * 100) / 100, owing);
  if (!(paid > 0)) return false;
  doc.payments.push({ id: env.uid("p"), date: env.today, amount: paid, method, note: `Online payment ${ref} (${text(reference, 60)})`, by: "Website" });
  doc.notes = doc.notes.replace("· awaiting payment.", "· paid online.");
  return true;
}
