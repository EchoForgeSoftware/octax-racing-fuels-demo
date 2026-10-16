// Browser storage for the back-office DEMO. Everything lives in this browser
// only: nothing reaches a server, and clearing site data resets it. The live
// version stores the same records in Supabase (supabase/backoffice.sql).
import { addDays, formatNumber, todaySA } from "./calc";
import { accountEmails, type CustomerProfile } from "./customerForm";
import { deliveryFor } from "../courier";
import { demoData } from "./seed";
import type { BackofficeData } from "./types";
import { STAFF, type User } from "./roles";
import type { Rep } from "./types";

// v6: adds deliveries, stock batches, stock takes, referrals and customer forms.
export const BACKOFFICE_KEY = "octa-backoffice-demo-v6";
export const ADMIN_SESSION_KEY = "octa-admin-demo-session-v2";

export type Admin = User;

/** One shared demo password for the four demo admins (public sample credentials). */
export const DEMO_ADMIN_PASSWORD = "OctaAdmin2026!";

const repUser = (r: Rep): Admin => ({ id: `rep:${r.id}`, name: r.name, role: "rep", email: r.email, demoEmail: r.email, repId: r.id });

/** Demo sign-in: the four admins, plus any active rep by the email set in Settings. */
export function demoAdminMatch(email: string, password: string, reps: Rep[] = []): Admin | null {
  const e = email.trim().toLowerCase();
  if (password !== DEMO_ADMIN_PASSWORD || !e) return null;
  const staff = STAFF.find((a) => a.demoEmail === e);
  if (staff) return staff;
  const rep = reps.find((r) => r.active && r.email.toLowerCase() === e);
  return rep ? repUser(rep) : null;
}

export function demoAdminById(id: string | null, reps: Rep[] = []): Admin | null {
  const rep = id?.startsWith("rep:") ? reps.find((r) => r.active && `rep:${r.id}` === id) : null;
  return rep ? repUser(rep) : STAFF.find((a) => a.id === id) ?? null;
}

function valid(data: unknown): data is BackofficeData {
  const d = data as BackofficeData;
  return !!d && d.version === 1 && Array.isArray(d.catalogue) && Array.isArray(d.clients) && Array.isArray(d.documents) && !!d.settings;
}

export function loadBackoffice(): BackofficeData {
  try {
    const raw = localStorage.getItem(BACKOFFICE_KEY);
    if (raw) {
      const parsed = JSON.parse(raw);
      if (valid(parsed)) return { ...parsed, suppliers: parsed.suppliers ?? [], supplierInvoices: parsed.supplierInvoices ?? [], bank: parsed.bank ?? [], reps: parsed.reps ?? [], stock: parsed.stock ?? [], stockCounts: parsed.stockCounts ?? [], referrals: parsed.referrals ?? [] };
    }
  } catch {
    // Corrupt or blocked storage: fall back to fresh sample data.
  }
  const seeded = demoData(todaySA());
  saveBackoffice(seeded);
  return seeded;
}

export function saveBackoffice(data: BackofficeData): boolean {
  try {
    localStorage.setItem(BACKOFFICE_KEY, JSON.stringify(data));
    window.dispatchEvent(new Event("octa-backoffice-change"));
    return true;
  } catch {
    return false;
  }
}

export function resetBackoffice(): BackofficeData {
  const fresh = demoData(todaySA());
  saveBackoffice(fresh);
  return fresh;
}

/** Subscribe to changes from this tab (custom event) and other tabs (storage event). */
export function onBackofficeChange(callback: () => void): () => void {
  const onStorage = (e: StorageEvent) => { if (e.key === BACKOFFICE_KEY) callback(); };
  window.addEventListener("storage", onStorage);
  window.addEventListener("octa-backoffice-change", callback);
  return () => {
    window.removeEventListener("storage", onStorage);
    window.removeEventListener("octa-backoffice-change", callback);
  };
}

export type DemoWebsiteOrder = {
  ref: string;
  items: { sku: string; name: string; size: string; price: number; qty: number }[];
  courier: number;
  customer: { name: string; email: string; phone: string; company: string; vat: string; address: string; city: string; registration?: string };
  orderAs: "personal" | "company";
  /** Personal orders: the customer ticked "save me as a customer". */
  saveCustomer: boolean;
  /** Customer Information Form, when they asked to open an account. */
  profile?: CustomerProfile;
  paymentMethod: "ozow" | "eft";
};

/**
 * DEMO ONLY: a sample website checkout lands in the back office as a website
 * invoice (unpaid, no payment taken), and company orders or "save me" orders
 * create or update the customer straight away. Live, the payment server does this.
 */
export function recordDemoWebsiteOrder(order: DemoWebsiteOrder, today: string): { number: string; client: string; saved: boolean } {
  const data = loadBackoffice();
  const email = order.customer.email.trim().toLowerCase();
  const save = order.orderAs === "company" || order.saveCustomer || !!order.profile;
  let client = data.clients.find((c) => c.email.toLowerCase() === email || accountEmails(c).includes(email));
  if (save) {
    const fields = {
      name: order.customer.name, email, phone: order.customer.phone, vat: order.customer.vat,
      company: order.orderAs === "company" ? order.customer.company : client?.company ?? "",
      address: order.customer.address, city: order.customer.city,
    };
    if (client) Object.assign(client, fields, order.profile ? { profile: order.profile } : {});
    else {
      client = { id: `c-web-${order.ref.slice(-8).toLowerCase()}`, type: "website", ...fields, notes: order.orderAs === "company" ? `Company order from the website${order.customer.registration ? ` · Reg. ${order.customer.registration}` : ""}.` : "Saved from website checkout.",
        tier: "retail", prices: {}, linkedEmail: email, createdAt: today, repId: null, cash: false, ...(order.profile ? { profile: order.profile } : {}) };
      data.clients.push(client);
    }
  } else if (!client) {
    client = data.clients.find((c) => c.id === "c-web-guests");
    if (!client) {
      client = { id: "c-web-guests", type: "website", name: "Website guests", company: "", email: "", phone: "", vat: "", address: "", city: "",
        notes: "Website orders from customers who didn't save their details.", tier: "retail", prices: {}, linkedEmail: "", createdAt: today, repId: null, cash: false };
      data.clients.push(client);
    }
  }
  const number = formatNumber("invoice", data.settings.next.invoice++);
  const local = deliveryFor(order.customer.city);
  data.documents.push({
    id: `d-web-${order.ref.slice(-8).toLowerCase()}`, kind: "invoice", number, clientId: client.id, date: today, dueDate: addDays(today, data.settings.paymentTermsDays),
    channel: "website", courier: order.courier, reference: order.ref, quoteState: "accepted", linkedId: null, cancelled: false, payments: [], createdAt: today,
    createdBy: "Website", notes: `Website order (demo) · ${order.paymentMethod === "ozow" ? "Ozow" : "EFT"} · no payment taken.${save ? "" : ` Guest: ${order.customer.name}, ${email}, ${order.customer.phone}.`}`,
    lines: order.items.map((i, n) => ({ id: `l-web-${n}`, sku: i.sku, description: `${i.name} — ${i.size}`, qty: i.qty, unitPrice: i.price, unitCost: data.catalogue.find((c) => c.sku === i.sku)?.cost ?? 0 })),
    delivery: { method: local.method, status: "pending" },
  });
  saveBackoffice(data);
  return { number, client: client.company || client.name, saved: save };
}
