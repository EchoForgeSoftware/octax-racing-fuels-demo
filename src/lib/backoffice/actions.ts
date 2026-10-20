// Back-office actions: the one place records change. The browser demo runs them
// on its local copy; the live server (supabase/functions/backoffice) runs the
// same code on the full records after verifying the signed-in staff member, so
// the role rules can't be skipped from a browser. Pure: tested in
// scripts/backoffice.test.mjs and scripts/backoffice-live.test.mjs.
import { cleanShares } from "./commission";
import { addDays, balance, formatNumber, priceFor, supplierBalance } from "./calc";
import { matchTxn, parseFnbCsv, txnKey } from "./bank";
import { canCreateOrders, canEdit, canRecordPayments, canSignDelivery, type Area, type User } from "./roles";
import { localTown } from "../courierRates";
import { deliveryRules } from "../delivery";
import type { CustomerProfile } from "./customerForm";
import type { Allocation, BackofficeData, BankTxn, BusinessSettings, CatalogueItem, Client, Delivery, Document, Payment, Referral, Rep, StockBatch, StockCount, Supplier, SupplierInvoice } from "./types";

/** A refusal or invalid input, worded for the person using the back office. */
export class ActionError extends Error {}

export type Env = { today: string; uid: (prefix: string) => string };

export type ImportResult = { added: number; duplicates: number; skipped: number; auto: number };
export type AllocationTarget =
  | { kind: "invoice"; docId: string; method?: Payment["method"] }
  | { kind: "supplier"; invoiceId: string }
  | { kind: "other"; category: Extract<Allocation, { kind: "other" }>["category"]; note: string };
export type Contact = { name: string; email: string; phone: string; company: string; vat: string };

/** Every change the back office can make, with the same arguments in the demo and live. */
export type Actions = {
  saveClient: (client: Client) => Client;
  saveDocument: (doc: Document, opts?: { paidMethod?: Payment["method"] }) => Document;
  bookInStock: (batch: StockBatch, opts: { updateCost: boolean; updatePrice: boolean }) => void;
  removeStockBatch: (id: string) => void;
  saveStockCount: (lines: Omit<StockCount, "id" | "by">[]) => void;
  saveRepDetails: (repId: string, patch: Pick<Rep, "idNumber" | "address" | "phone" | "bank">) => void;
  saveReferral: (referral: Referral) => void;
  saveCustomerProfile: (clientId: string, contact: Contact, profile: CustomerProfile) => Client | null;
  setReferralPaid: (id: string, paid: Referral["paid"]) => void;
  saveDelivery: (docId: string, delivery: Delivery) => void;
  convertQuote: (quoteId: string) => Document | null;
  recordPayment: (docId: string, payment: Omit<Payment, "id">) => void;
  removePayment: (docId: string, paymentId: string) => void;
  setCancelled: (docId: string, cancelled: boolean) => void;
  saveCatalogueItem: (item: CatalogueItem) => void;
  /** Delete a product added in the back office that was never invoiced or booked into stock. */
  removeCatalogueItem: (sku: string) => void;
  saveSettings: (settings: BusinessSettings) => void;
  saveRep: (rep: Rep) => void;
  patchClient: (id: string, patch: Partial<Client>) => void;
  saveSupplier: (supplier: Supplier) => void;
  saveSupplierInvoice: (invoice: SupplierInvoice) => void;
  removeSupplierInvoice: (id: string) => void;
  paySupplierInvoice: (id: string, payment: Omit<Payment, "id">) => void;
  removeSupplierPayment: (id: string, paymentId: string) => void;
  importBank: (fileName: string, text: string) => ImportResult;
  allocateTxn: (txnId: string, target: AllocationTarget) => void;
  unallocateTxn: (txnId: string) => void;
};
export type ActionName = keyof Actions;
export const ACTION_NAMES = [
  "saveClient", "saveDocument", "bookInStock", "removeStockBatch", "saveStockCount", "saveRepDetails", "saveReferral", "saveCustomerProfile",
  "setReferralPaid", "saveDelivery", "convertQuote", "recordPayment", "removePayment", "setCancelled", "saveCatalogueItem", "removeCatalogueItem", "saveSettings",
  "saveRep", "patchClient", "saveSupplier", "saveSupplierInvoice", "removeSupplierInvoice", "paySupplierInvoice", "removeSupplierPayment",
  "importBank", "allocateTxn", "unallocateTxn",
] as const satisfies readonly ActionName[];

const DATE = /^\d{4}-\d{2}-\d{2}$/;
const METHODS: Payment["method"][] = ["eft", "cash", "card", "ozow", "other"];
const DELIVERY_METHODS: Delivery["method"][] = ["own", "courier", "collect"];
const CHANNELS: Document["channel"][] = ["website", "private", "agent"];

const text = (v: unknown, max: number) => (typeof v === "string" ? v.slice(0, max) : "");
const date = (v: unknown, fallback: string) => (typeof v === "string" && DATE.test(v) ? v : fallback);
const money = (v: unknown) => typeof v === "number" && Number.isFinite(v) && v >= 0 && v < 1e9;
function id(v: unknown): string {
  if (typeof v !== "string" || !/^[\w:.-]{1,80}$/.test(v)) throw new ActionError("That record reference isn't valid.");
  return v;
}

export const docTotalOf = (doc: Document) => Math.round((doc.lines.reduce((n, l) => n + l.qty * l.unitPrice, 0) + doc.courier) * 100) / 100;

/** New invoices: own delivery inside the local area, courier elsewhere; cash customers collect. */
/** `towns`: the local delivery towns from Settings → Delivery (the 30 km list when not given). */
export function defaultDelivery(client: Client | null | undefined, towns?: string[]): Delivery {
  const method = client?.cash ? "collect" : localTown(client?.city, towns) ? "own" : "courier";
  return { method, status: "pending" };
}

/** Fill cost snapshots (hidden from order takers) and catalogue prices from the full records. */
function withCatalogueCosts(doc: Document, d: BackofficeData): Document {
  const client = d.clients.find((c) => c.id === doc.clientId) ?? null;
  return {
    ...doc,
    lines: doc.lines.map((l) => {
      const item = l.sku ? d.catalogue.find((i) => i.sku === l.sku) : null;
      if (!item) return l;
      const price = priceFor(item, client);
      return { ...l, unitCost: item.cost ?? 0, unitPrice: price ?? l.unitPrice };
    }),
  };
}

/**
 * A new order from Danium or a rep, rebuilt from trusted records: only their
 * own customers, catalogue products at that customer's price, no payments or
 * sign-off carried in, and costs from the catalogue.
 */
function orderFromTaker(input: Document, d: BackofficeData, admin: User, env: Env): Document {
  const client = d.clients.find((c) => c.id === input.clientId);
  if (!client || (admin.role === "rep" && client.repId !== admin.repId)) throw new ActionError("Choose one of your customers.");
  if (input.kind !== "invoice") throw new ActionError("Only main admins can create quotes.");
  const lines = (Array.isArray(input.lines) ? input.lines : []).slice(0, 100).map((l) => {
    const item = typeof l?.sku === "string" ? d.catalogue.find((i) => i.sku === l.sku && i.active && !i.comingSoon) : undefined;
    if (!item) throw new ActionError("Orders can only include products from the catalogue.");
    const qty = Number(l.qty);
    if (!(qty > 0 && qty <= 100000)) throw new ActionError("Enter valid quantities.");
    const price = priceFor(item, client);
    if (!price) throw new ActionError(`${item.productName} ${item.size} is priced on quotation; ask a main admin.`);
    return { id: text(l.id, 80) || env.uid("l"), sku: item.sku, description: text(l.description, 500).trim() || `${item.productName} — ${item.size}`, qty: Math.round(qty * 1000) / 1000, unitPrice: price, unitCost: item.cost ?? 0 };
  });
  if (!lines.length) throw new ActionError("Add at least one line.");
  if (!money(input.courier)) throw new ActionError("Enter a valid courier amount.");
  const day = date(input.date, env.today);
  const due = date(input.dueDate, addDays(day, d.settings.paymentTermsDays));
  const method = DELIVERY_METHODS.includes(input.delivery?.method as Delivery["method"]) ? input.delivery!.method : defaultDelivery(client, deliveryRules(d.settings).localArea).method;
  return {
    id: id(input.id), kind: "invoice", number: "", clientId: client.id, date: day, dueDate: due < day ? day : due,
    channel: CHANNELS.includes(input.channel) ? input.channel : "private", lines, courier: Math.round(input.courier * 100) / 100,
    notes: text(input.notes, 4000), reference: text(input.reference, 120), quoteState: "draft", linkedId: null, cancelled: false,
    payments: [], createdAt: env.today, ...(text(input.cashName, 120).trim() ? { cashName: text(input.cashName, 120).trim() } : {}),
    delivery: { method, status: "pending" },
  };
}

/** Apply one bank allocation: records the matching payment and links it to the bank line. */
function allocate(d: BackofficeData, txn: BankTxn, target: AllocationTarget, auto: boolean, by: string | undefined, env: Env): boolean {
  const note = `Bank ${txn.date}: ${txn.description}`.slice(0, 120);
  if (target.kind === "invoice") {
    const doc = d.documents.find((x) => x.id === target.docId);
    if (!doc || doc.kind !== "invoice" || txn.amount <= 0 || txn.amount > balance(doc) + 0.004) return false;
    const paymentId = env.uid("p");
    doc.payments.push({ id: paymentId, date: txn.date, amount: txn.amount, method: METHODS.includes(target.method as Payment["method"]) ? target.method! : "eft", note, by: auto ? "Bank import" : by });
    txn.allocation = { kind: "invoice", docId: doc.id, paymentId, auto };
    return true;
  }
  if (target.kind === "supplier") {
    const inv = d.supplierInvoices.find((x) => x.id === target.invoiceId);
    if (!inv || txn.amount >= 0 || -txn.amount > supplierBalance(inv) + 0.004) return false;
    const paymentId = env.uid("sp");
    inv.payments.push({ id: paymentId, date: txn.date, amount: -txn.amount, method: "eft", note, by: auto ? "Bank import" : by });
    txn.allocation = { kind: "supplier", invoiceId: inv.id, paymentId, auto };
    return true;
  }
  if (target.kind !== "other") return false;
  txn.allocation = { kind: "other", category: target.category, note: text(target.note, 200), auto };
  return true;
}

function upsert<T>(list: T[], key: (x: T) => string, item: T): void {
  const i = list.findIndex((x) => key(x) === key(item));
  if (i >= 0) list[i] = item; else list.push(item);
}

type Handlers = { [N in ActionName]: (d: BackofficeData, admin: User, env: Env, ...args: Parameters<Actions[N]>) => ReturnType<Actions[N]> };

function requireAccess(admin: User, area: Area | "payments" | "orders" | "delivery") {
  const role = admin.role;
  const ok = area === "payments" ? canRecordPayments(role)
    : area === "orders" ? canCreateOrders(role)
    : area === "delivery" ? canSignDelivery(role)
    : canEdit(role, area);
  if (!ok) throw new ActionError("This isn't part of your access.");
}

const handlers: Handlers = {
  saveClient(d, admin, _env, client) {
    requireAccess(admin, "clients");
    id(client.id);
    upsert(d.clients, (c) => c.id, client);
    return client;
  },
  saveDocument(d, admin, env, input, opts) {
    const isNew = !d.documents.some((x) => x.id === input.id);
    // Danium and reps may take new orders (invoices); changing documents stays with main admins.
    requireAccess(admin, isNew && input.kind === "invoice" && admin.role !== "main" ? "orders" : input.kind === "quote" ? "quotes" : "invoices");
    id(input.id);
    // Order takers never see costs or change prices: costs and prices come from the full catalogue.
    const doc = admin.role === "main" ? input : orderFromTaker(input, d, admin, env);
    const i = d.documents.findIndex((x) => x.id === doc.id);
    if (i >= 0) { d.documents[i] = doc; return doc; }
    // Numbers are issued only when a document is first saved, so abandoned drafts leave no gaps.
    const n = doc.kind === "quote" ? d.settings.next.quote++ : d.settings.next.invoice++;
    // Pro formas share the quote sequence but carry their own prefix.
    const number = formatNumber(doc.kind, n);
    const saved: Document = { ...doc, number: doc.kind === "quote" && doc.proforma ? number.replace(/^QUO/, "PRO") : number, createdBy: admin.name };
    if (saved.kind === "invoice" && opts?.paidMethod && METHODS.includes(opts.paidMethod)) {
      saved.payments = [{ id: env.uid("p"), date: saved.date, amount: docTotalOf(saved), method: opts.paidMethod, note: "Paid at sale", by: admin.name }];
    }
    d.documents.push(saved);
    return saved;
  },
  bookInStock(d, admin, _env, batch, opts) {
    requireAccess(admin, "suppliers");
    id(batch.id);
    d.stock.push({ ...batch, createdBy: admin.name });
    const item = d.catalogue.find((i) => i.sku === batch.sku);
    if (item && opts.updateCost) item.cost = d.settings.vatRegistered ? batch.unitCostEx : batch.unitCostIncl;
    if (item && opts.updatePrice && batch.sellPrice !== null && batch.sellPrice > 0 && admin.role === "main") item.retail = batch.sellPrice;
  },
  removeStockBatch(d, admin, _env, batchId) {
    requireAccess(admin, "suppliers");
    d.stock = d.stock.filter((b) => b.id !== batchId);
  },
  saveStockCount(d, admin, env, lines) {
    requireAccess(admin, "suppliers");
    for (const l of lines) d.stockCounts.push({ ...l, id: env.uid("sc"), by: admin.name });
  },
  saveRepDetails(d, admin, _env, repId, patch) {
    if (!(admin.role === "main" || (admin.role === "rep" && admin.repId === repId))) throw new ActionError("This isn't part of your access.");
    const rep = d.reps.find((r) => r.id === repId);
    const b = patch.bank;
    if (rep) Object.assign(rep, {
      idNumber: text(patch.idNumber, 40), address: text(patch.address, 400), phone: text(patch.phone, 40),
      bank: b ? { holder: text(b.holder, 120), bank: text(b.bank, 80), account: text(b.account, 40), branch: text(b.branch, 20), type: text(b.type, 40) } : rep.bank,
    });
  },
  saveCustomerProfile(d, admin, _env, clientId, contact, profile) {
    requireAccess(admin, "orders");
    const c = d.clients.find((x) => x.id === clientId);
    // Reps only see (and so only update) their own clients.
    if (!c || (admin.role === "rep" && c.repId !== admin.repId)) return null;
    if (!profile || typeof profile !== "object" || JSON.stringify(profile).length > 50000) throw new ActionError("The customer form is too long.");
    const email = text(contact.email, 200).trim().toLowerCase();
    Object.assign(c, {
      name: text(contact.name, 200).trim(), email, phone: text(contact.phone, 40).trim(),
      company: text(contact.company, 200).trim(), vat: text(contact.vat, 40).replace(/[\s-]/g, ""),
      address: text(profile.delivery?.street, 400).trim(), city: text(profile.delivery?.city, 120).trim(), profile,
      linkedEmail: c.linkedEmail || email,
    });
    return structuredClone(c);
  },
  saveReferral(d, admin, _env, referral) {
    requireAccess(admin, "reps");
    id(referral.id);
    const i = d.referrals.findIndex((x) => x.id === referral.id);
    if (i >= 0) d.referrals[i] = referral; else d.referrals.push({ ...referral, createdBy: admin.name });
  },
  setReferralPaid(d, admin, _env, referralId, paid) {
    requireAccess(admin, "reps");
    const r = d.referrals.find((x) => x.id === referralId);
    if (r) r.paid = paid;
  },
  saveDelivery(d, admin, env, docId, delivery) {
    requireAccess(admin, "delivery");
    const doc = d.documents.find((x) => x.id === docId && x.kind === "invoice");
    if (!doc || doc.cancelled) return;
    if (admin.role === "rep" && d.clients.find((c) => c.id === doc.clientId)?.repId !== admin.repId) throw new ActionError("This isn't one of your customers.");
    // Only main admins can reopen a signed delivery or change how a saved order goes out.
    if (doc.delivery?.status === "delivered" && admin.role !== "main") return;
    const method = DELIVERY_METHODS.includes(delivery.method) ? delivery.method : doc.delivery?.method ?? "courier";
    if (admin.role !== "main" && doc.delivery && method !== doc.delivery.method) throw new ActionError("Ask a main admin to change the delivery method.");
    if (delivery.status !== "delivered") { doc.delivery = { method, status: "pending" }; return; }
    const signature = typeof delivery.signature === "string" && delivery.signature.startsWith("data:image/png;base64,") && delivery.signature.length <= 400000 ? delivery.signature : null;
    const name = text(delivery.receivedName, 120).trim(), surname = text(delivery.receivedSurname, 120).trim();
    if (!signature || !name || !surname) throw new ActionError("Enter the name and surname and ask them to sign.");
    doc.delivery = { method, status: "delivered", receivedName: name, receivedSurname: surname, receivedDate: date(delivery.receivedDate, env.today), signature, deliveredBy: admin.name };
  },
  convertQuote(d, admin, env, quoteId) {
    requireAccess(admin, "quotes");
    const quote = d.documents.find((x) => x.id === quoteId && x.kind === "quote");
    if (!quote || quote.linkedId) return null;
    const n = d.settings.next.invoice++;
    const created: Document = {
      ...structuredClone(quote), id: env.uid("i"), kind: "invoice", number: formatNumber("invoice", n), date: env.today,
      dueDate: addDays(env.today, d.settings.paymentTermsDays), quoteState: "accepted", linkedId: quote.id, payments: [], cancelled: false,
      notes: quote.notes, createdAt: env.today, createdBy: admin.name,
    };
    quote.quoteState = "accepted";
    quote.linkedId = created.id;
    d.documents.push(created);
    return created;
  },
  recordPayment(d, admin, env, docId, payment) {
    requireAccess(admin, "payments");
    const doc = d.documents.find((x) => x.id === docId);
    if (doc?.kind === "invoice" && !doc.cancelled && Number.isFinite(payment.amount) && payment.amount > 0 && payment.amount <= balance(doc) + 0.001) {
      doc.payments.push({ date: date(payment.date, env.today), amount: Math.round(payment.amount * 100) / 100, method: METHODS.includes(payment.method) ? payment.method : "other", note: text(payment.note, 200), id: env.uid("p"), by: admin.name });
    }
  },
  removePayment(d, admin, _env, docId, paymentId) {
    requireAccess(admin, "payments");
    const doc = d.documents.find((x) => x.id === docId);
    if (doc) doc.payments = doc.payments.filter((p) => p.id !== paymentId);
    for (const t of d.bank) if (t.allocation?.kind === "invoice" && t.allocation.paymentId === paymentId) t.allocation = null;
  },
  setCancelled(d, admin, _env, docId, cancelled) {
    requireAccess(admin, "invoices");
    const doc = d.documents.find((x) => x.id === docId);
    if (doc && (!cancelled || doc.payments.length === 0)) doc.cancelled = cancelled === true;
  },
  saveCatalogueItem(d, admin, _env, item) {
    requireAccess(admin, "products");
    if (typeof item.sku !== "string" || !/^[\w.-]{1,60}$/.test(item.sku)) throw new ActionError("Use letters, numbers and dashes for the SKU.");
    const { soldOut: _shown, ...stored } = item;
    const repShares = cleanShares(stored.repShares, d.reps.map((r) => r.id));
    upsert(d.catalogue, (x) => x.sku, { ...stored, ...(["in", "out", "auto"].includes(stored.stock as string) ? {} : { stock: undefined }),
      repShares: repShares.length ? repShares : undefined });
  },
  removeCatalogueItem(d, admin, _env, sku) {
    requireAccess(admin, "products");
    const item = d.catalogue.find((x) => x.sku === sku);
    if (!item) return;
    if (item.slug) throw new ActionError("Products with their own website page can't be deleted. Untick \"Show on the website\" to hide it.");
    const used = d.documents.some((doc) => doc.lines.some((l) => l.sku === sku)) || d.stock.some((b) => b.sku === sku) || d.stockCounts.some((c) => c.sku === sku);
    if (used) throw new ActionError(`${item.productName} (${item.size}) is on invoices, quotes or stock records, so it stays for your records. Untick "Show on the website" to hide it.`);
    d.catalogue = d.catalogue.filter((x) => x.sku !== sku);
    for (const c of d.clients) if (c.prices[sku] !== undefined) delete c.prices[sku];
  },
  saveSettings(d, admin, _env, settings) {
    requireAccess(admin, "settings");
    // Document numbers only move forward, so a stale screen can't reissue a number.
    const next = { quote: Math.max(d.settings.next.quote, settings.next?.quote ?? 0), invoice: Math.max(d.settings.next.invoice, settings.next?.invoice ?? 0) };
    d.settings = { ...settings, next };
  },
  saveRep(d, admin, _env, rep) {
    requireAccess(admin, "settings");
    id(rep.id);
    upsert(d.reps, (r) => r.id, { ...rep, email: text(rep.email, 200).trim().toLowerCase() });
  },
  patchClient(d, admin, _env, clientId, patch) {
    requireAccess(admin, "clients");
    const c = d.clients.find((x) => x.id === clientId);
    if (!c) return;
    // Only the quick buttons' fields.
    if ("repId" in patch) c.repId = patch.repId ? id(patch.repId) : null;
    if (patch.type && ["agent", "bulk", "private", "website"].includes(patch.type)) c.type = patch.type;
    if (typeof patch.cash === "boolean") c.cash = patch.cash;
    if (patch.tier && ["retail", "agent", "bulk"].includes(patch.tier)) c.tier = patch.tier;
  },
  saveSupplier(d, admin, _env, supplier) {
    requireAccess(admin, "suppliers");
    id(supplier.id);
    upsert(d.suppliers, (s) => s.id, supplier);
  },
  saveSupplierInvoice(d, admin, _env, invoice) {
    requireAccess(admin, "suppliers");
    id(invoice.id);
    const i = d.supplierInvoices.findIndex((x) => x.id === invoice.id);
    if (i >= 0) d.supplierInvoices[i] = invoice; else d.supplierInvoices.push({ ...invoice, createdBy: admin.name });
  },
  removeSupplierInvoice(d, admin, _env, invoiceId) {
    requireAccess(admin, "suppliers");
    const inv = d.supplierInvoices.find((x) => x.id === invoiceId);
    if (!inv || inv.payments.length) return;
    d.supplierInvoices = d.supplierInvoices.filter((x) => x.id !== invoiceId);
  },
  paySupplierInvoice(d, admin, env, invoiceId, payment) {
    requireAccess(admin, "suppliers");
    const inv = d.supplierInvoices.find((x) => x.id === invoiceId);
    if (inv && Number.isFinite(payment.amount) && payment.amount > 0 && payment.amount <= supplierBalance(inv) + 0.004) {
      inv.payments.push({ date: date(payment.date, env.today), amount: Math.round(payment.amount * 100) / 100, method: METHODS.includes(payment.method) ? payment.method : "other", note: text(payment.note, 200), id: env.uid("sp"), by: admin.name });
    }
  },
  removeSupplierPayment(d, admin, _env, invoiceId, paymentId) {
    requireAccess(admin, "suppliers");
    const inv = d.supplierInvoices.find((x) => x.id === invoiceId);
    if (inv) inv.payments = inv.payments.filter((p) => p.id !== paymentId);
    for (const t of d.bank) if (t.allocation?.kind === "supplier" && t.allocation.paymentId === paymentId) t.allocation = null;
  },
  importBank(d, admin, env, fileName, csv) {
    requireAccess(admin, "bank");
    if (typeof csv !== "string" || csv.length > 3_000_000) throw new ActionError("That file is too large. Download a shorter date range.");
    const result: ImportResult = { added: 0, duplicates: 0, skipped: 0, auto: 0 };
    const { rows, skipped } = parseFnbCsv(csv);
    result.skipped = skipped;
    const seen = new Set(d.bank.map(txnKey));
    for (const row of rows) {
      const key = txnKey(row);
      if (seen.has(key)) { result.duplicates++; continue; }
      seen.add(key);
      const txn: BankTxn = { id: env.uid("b"), ...row, source: text(fileName, 80), allocation: null };
      d.bank.push(txn);
      result.added++;
      const m = matchTxn(txn, d);
      const target: AllocationTarget | null = !m ? null
        : m.kind === "invoice" ? { kind: "invoice", docId: m.doc.id, method: m.method }
        : m.kind === "supplier" ? { kind: "supplier", invoiceId: m.invoice.id }
        : { kind: "other", category: m.category, note: m.why };
      if (target && allocate(d, txn, target, true, admin.name, env)) result.auto++;
    }
    return result;
  },
  allocateTxn(d, admin, env, txnId, target) {
    requireAccess(admin, "bank");
    const txn = d.bank.find((t) => t.id === txnId);
    if (txn && !txn.allocation) allocate(d, txn, target, false, admin.name, env);
  },
  unallocateTxn(d, admin, _env, txnId) {
    requireAccess(admin, "bank");
    const txn = d.bank.find((t) => t.id === txnId);
    const a = txn?.allocation;
    if (!txn || !a) return;
    if (a.kind === "invoice") {
      const doc = d.documents.find((x) => x.id === a.docId);
      if (doc) doc.payments = doc.payments.filter((p) => p.id !== a.paymentId);
    } else if (a.kind === "supplier") {
      const inv = d.supplierInvoices.find((x) => x.id === a.invoiceId);
      if (inv) inv.payments = inv.payments.filter((p) => p.id !== a.paymentId);
    }
    txn.allocation = null;
  },
};

/** Run one action on `d` (changed in place) as `admin`. Throws ActionError when it isn't allowed. */
export function runAction<N extends ActionName>(d: BackofficeData, admin: User, name: N, args: Parameters<Actions[N]>, env: Env): ReturnType<Actions[N]> {
  const handler = handlers[name] as unknown as (d: BackofficeData, admin: User, env: Env, ...args: unknown[]) => ReturnType<Actions[N]>;
  if (!handler) throw new ActionError("Unknown back-office action.");
  return handler(d, admin, env, ...(args as unknown[]));
}
