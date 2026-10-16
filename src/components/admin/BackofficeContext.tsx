"use client";

import { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState, type ReactNode } from "react";
import { accountsEnabled } from "@/lib/supabase";
import { INDEXABLE } from "@/lib/site";
import { allowCustomerDemo } from "@/lib/customerDemo";
import { ADMIN_SESSION_KEY, demoAdminById, demoAdminMatch, type Admin, loadBackoffice, onBackofficeChange, resetBackoffice, saveBackoffice } from "@/lib/backoffice/local";
import { addDays, balance, defaultsFor, formatNumber, priceFor, todaySA } from "@/lib/backoffice/calc";
import type { Allocation, BackofficeData, BankTxn, BusinessSettings, CatalogueItem, Client, Delivery, Document, Payment, Referral, Rep, StockBatch, StockCount, Supplier, SupplierInvoice } from "@/lib/backoffice/types";
import { matchTxn, parseFnbCsv, txnKey } from "@/lib/backoffice/bank";
import { supplierBalance } from "@/lib/backoffice/calc";
import { scopeBackoffice } from "@/lib/backoffice/scope";
import { canCreateOrders, canEdit, canRecordPayments, canSignDelivery, type Area } from "@/lib/backoffice/roles";
import { deliveryFor } from "@/lib/courier";
import type { CustomerProfile } from "@/lib/backoffice/customerForm";

type Mode = "loading" | "demo" | "unavailable";

type BackofficeState = {
  mode: Mode;
  signedIn: boolean;
  /** The admin signed in on this device. */
  admin: Admin | null;
  data: BackofficeData | null;
  today: string;
  signIn: (email: string, password: string) => string | null;
  signOut: () => void;
  saveClient: (client: Client) => Client;
  newClient: (type: Client["type"]) => Client;
  saveDocument: (doc: Document, opts?: { paidMethod?: Payment["method"] }) => Document;
  /** Book stock in; optionally update the product's cost and website price from this delivery. */
  bookInStock: (batch: StockBatch, opts: { updateCost: boolean; updatePrice: boolean }) => void;
  removeStockBatch: (id: string) => void;
  /** Record a stock take: one line per product counted. */
  saveStockCount: (lines: Omit<StockCount, "id" | "by">[]) => void;
  /** A rep's own details (ID, address, phone, bank): the rep themself or a main admin. */
  saveRepDetails: (repId: string, patch: Pick<Rep, "idNumber" | "address" | "phone" | "bank">) => void;
  saveReferral: (referral: Referral) => void;
  /** Customer Information Form: main admins, Danium and reps (their own clients). Returns the updated client. */
  saveCustomerProfile: (clientId: string, contact: { name: string; email: string; phone: string; company: string; vat: string }, profile: CustomerProfile) => Client | null;
  /** Main admin marks a referral commission paid, or undoes it (paid = null). */
  setReferralPaid: (id: string, paid: Referral["paid"]) => void;
  /** Delivery method and goods-received sign-off (main admins, Danium, reps). */
  saveDelivery: (docId: string, delivery: Delivery) => void;
  newDocument: (kind: Document["kind"], clientId?: string) => Document;
  convertQuote: (quoteId: string) => Document | null;
  recordPayment: (docId: string, payment: Omit<Payment, "id">) => void;
  removePayment: (docId: string, paymentId: string) => void;
  setCancelled: (docId: string, cancelled: boolean) => void;
  saveCatalogueItem: (item: CatalogueItem) => void;
  saveSettings: (settings: BusinessSettings) => void;
  reset: () => void;
  saveRep: (rep: Rep) => void;
  /** Quick client changes from buttons (rep, agent, cash), saved straight away. */
  patchClient: (id: string, patch: Partial<Client>) => void;
  newSupplier: () => Supplier;
  saveSupplier: (supplier: Supplier) => void;
  saveSupplierInvoice: (invoice: SupplierInvoice) => void;
  removeSupplierInvoice: (id: string) => void;
  paySupplierInvoice: (id: string, payment: Omit<Payment, "id">) => void;
  removeSupplierPayment: (id: string, paymentId: string) => void;
  importBank: (fileName: string, text: string) => ImportResult;
  allocateTxn: (txnId: string, target: AllocationTarget) => void;
  unallocateTxn: (txnId: string) => void;
};

export type ImportResult = { added: number; duplicates: number; skipped: number; auto: number };
export type AllocationTarget =
  | { kind: "invoice"; docId: string; method?: Payment["method"] }
  | { kind: "supplier"; invoiceId: string }
  | { kind: "other"; category: Extract<Allocation, { kind: "other" }>["category"]; note: string };

/** Apply one allocation inside a commit: records the matching payment and links it to the bank line. */
function allocate(d: BackofficeData, txn: BankTxn, target: AllocationTarget, auto: boolean, by: string | undefined): boolean {
  const note = `Bank ${txn.date}: ${txn.description}`.slice(0, 120);
  if (target.kind === "invoice") {
    const doc = d.documents.find((x) => x.id === target.docId);
    if (!doc || txn.amount <= 0 || txn.amount > balance(doc) + 0.004) return false;
    const paymentId = uid("p");
    doc.payments.push({ id: paymentId, date: txn.date, amount: txn.amount, method: target.method ?? "eft", note, by: auto ? "Bank import" : by });
    txn.allocation = { kind: "invoice", docId: doc.id, paymentId, auto };
    return true;
  }
  if (target.kind === "supplier") {
    const inv = d.supplierInvoices.find((x) => x.id === target.invoiceId);
    if (!inv || txn.amount >= 0 || -txn.amount > supplierBalance(inv) + 0.004) return false;
    const paymentId = uid("sp");
    inv.payments.push({ id: paymentId, date: txn.date, amount: -txn.amount, method: "eft", note, by: auto ? "Bank import" : by });
    txn.allocation = { kind: "supplier", invoiceId: inv.id, paymentId, auto };
    return true;
  }
  txn.allocation = { kind: "other", category: target.category, note: target.note, auto };
  return true;
}

const Ctx = createContext<BackofficeState | null>(null);

/** New invoices: own delivery inside the local area, courier elsewhere; cash customers collect. */
export function defaultDelivery(client: Client | null | undefined): Delivery {
  const method = client?.cash ? "collect" : deliveryFor(client?.city).method;
  return { method, status: "pending" };
}

const docTotalOf = (doc: Document) => Math.round((doc.lines.reduce((n, l) => n + l.qty * l.unitPrice, 0) + doc.courier) * 100) / 100;

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

export const uid = (prefix: string) => `${prefix}-${crypto.randomUUID().slice(0, 8)}`;

/**
 * Back-office state. Today only the browser demo exists: real staff logins and
 * shared records need the Supabase project (see docs/BACKOFFICE.md).
 */
export function BackofficeProvider({ children }: { children: ReactNode }) {
  const [mode, setMode] = useState<Mode>("loading");
  const [admin, setAdmin] = useState<Admin | null>(null);
  const signedIn = admin !== null;
  const [data, setData] = useState<BackofficeData | null>(null);
  const [storageError, setStorageError] = useState(false);
  // Latest data, so actions can compute results (like a new invoice number) synchronously.
  const dataRef = useRef<BackofficeData | null>(null);
  const today = useMemo(() => todaySA(), []);
  const replace = useCallback((next: BackofficeData) => { dataRef.current = next; setData(next); }, []);

  useEffect(() => {
    const demo = allowCustomerDemo(process.env.NEXT_PUBLIC_CUSTOMER_DEMO, window.location.hostname, accountsEnabled, INDEXABLE, process.env.NEXT_PUBLIC_DEMO_HOSTS);
    if (!demo) return setMode("unavailable");
    const loaded = loadBackoffice();
    replace(loaded);
    try { setAdmin(demoAdminById(sessionStorage.getItem(ADMIN_SESSION_KEY), loaded.reps)); } catch { /* memory only */ }
    setMode("demo");
    return onBackofficeChange(() => replace(loadBackoffice()));
  }, [replace]);

  const commit = useCallback((update: (d: BackofficeData) => BackofficeData) => {
    if (!dataRef.current || mode !== "demo" || !admin) return;
    const next = update(structuredClone(dataRef.current));
    dataRef.current = next;
    setData(next);
    setStorageError(!saveBackoffice(next));
  }, [mode, admin]);

  function requireAccess(area: Area | "payments" | "orders" | "delivery") {
    const role = admin?.role;
    const ok = area === "payments" ? canRecordPayments(role)
      : area === "orders" ? canCreateOrders(role)
      : area === "delivery" ? canSignDelivery(role)
      : canEdit(role, area);
    if (mode !== "demo" || !admin || !ok) throw new Error("This action is not part of your demo role.");
  }

  // Reps see only their own customers and those customers' documents.
  const visible = useMemo(() => data ? scopeBackoffice(data, admin) : null, [data, admin]);

  const api = useMemo<BackofficeState>(() => ({
    mode,
    signedIn,
    admin,
    data: visible,
    today,
    signIn(email, password) {
      if (mode !== "demo") return "The back office isn't connected yet.";
      const match = demoAdminMatch(email, password, dataRef.current?.reps);
      if (!match) return "Use one of the demo admin emails and the password shown on this page.";
      try { sessionStorage.setItem(ADMIN_SESSION_KEY, match.id); } catch { /* memory only */ }
      setAdmin(match);
      return null;
    },
    signOut() {
      try { sessionStorage.removeItem(ADMIN_SESSION_KEY); } catch { /* memory only */ }
      setAdmin(null);
    },
    newClient(type) {
      return { id: uid("c"), type, name: "", company: "", email: "", phone: "", vat: "", address: "", city: "", notes: "",
        tier: defaultsFor(type).tier, prices: {}, linkedEmail: "", createdAt: today };
    },
    saveClient(client) {
      requireAccess("clients");
      commit((d) => {
        const i = d.clients.findIndex((c) => c.id === client.id);
        if (i >= 0) d.clients[i] = client; else d.clients.push(client);
        return d;
      });
      return client;
    },
    newDocument(kind, clientId = "") {
      const client = data?.clients.find((c) => c.id === clientId);
      const days = kind === "quote" ? data?.settings.quoteValidDays ?? 14 : data?.settings.paymentTermsDays ?? 7;
      return { id: uid(kind === "quote" ? "q" : "i"), kind, number: "", clientId, date: today, dueDate: addDays(today, days),
        channel: client ? defaultsFor(client.type).channel : "private", lines: [], courier: 0, notes: "", reference: "",
        quoteState: "draft", linkedId: null, cancelled: false, payments: [], createdAt: today,
        ...(kind === "invoice" ? { delivery: defaultDelivery(client) } : {}) };
    },
    saveDocument(input, opts) {
      const isNew = !dataRef.current?.documents.some((x) => x.id === input.id);
      // Danium and reps may take new orders (invoices); changing documents stays with main admins.
      requireAccess(isNew && input.kind === "invoice" && admin?.role !== "main" ? "orders" : input.kind === "quote" ? "quotes" : "invoices");
      let saved = input;
      commit((d) => {
        // Order takers never see costs or change prices: costs and prices come from the full catalogue.
        const doc = admin?.role === "main" ? input : withCatalogueCosts(input, d);
        const i = d.documents.findIndex((x) => x.id === doc.id);
        if (i >= 0) { d.documents[i] = doc; saved = doc; return d; }
        // Numbers are issued only when a document is first saved, so abandoned drafts leave no gaps.
        const n = doc.kind === "quote" ? d.settings.next.quote++ : d.settings.next.invoice++;
        // Pro formas share the quote sequence but carry their own prefix.
        const number = formatNumber(doc.kind, n);
        saved = { ...doc, number: doc.kind === "quote" && doc.proforma ? number.replace(/^QUO/, "PRO") : number, createdBy: admin?.name };
        if (saved.kind === "invoice" && opts?.paidMethod) {
          saved.payments = [{ id: uid("p"), date: saved.date, amount: docTotalOf(saved), method: opts.paidMethod, note: "Paid at sale", by: admin?.name }];
        }
        d.documents.push(saved);
        return d;
      });
      return saved;
    },
    bookInStock(batch, opts) {
      requireAccess("suppliers");
      commit((d) => {
        d.stock.push({ ...batch, createdBy: admin?.name });
        const item = d.catalogue.find((i) => i.sku === batch.sku);
        if (item && opts.updateCost) item.cost = d.settings.vatRegistered ? batch.unitCostEx : batch.unitCostIncl;
        if (item && opts.updatePrice && batch.sellPrice !== null && batch.sellPrice > 0 && admin?.role === "main") item.retail = batch.sellPrice;
        return d;
      });
    },
    removeStockBatch(id) {
      requireAccess("suppliers");
      commit((d) => { d.stock = d.stock.filter((b) => b.id !== id); return d; });
    },
    saveStockCount(lines) {
      requireAccess("suppliers");
      commit((d) => {
        for (const l of lines) d.stockCounts.push({ ...l, id: uid("sc"), by: admin?.name });
        return d;
      });
    },
    saveRepDetails(repId, patch) {
      if (mode !== "demo" || !admin || !(admin.role === "main" || (admin.role === "rep" && admin.repId === repId))) throw new Error("This action is not part of your demo role.");
      commit((d) => {
        const rep = d.reps.find((r) => r.id === repId);
        if (rep) Object.assign(rep, { idNumber: patch.idNumber, address: patch.address, phone: patch.phone, bank: patch.bank });
        return d;
      });
    },
    saveCustomerProfile(clientId, contact, profile) {
      requireAccess("orders");
      let saved: Client | null = null;
      commit((d) => {
        const c = d.clients.find((x) => x.id === clientId);
        // Reps only see (and so only update) their own clients.
        if (!c || (admin?.role === "rep" && c.repId !== admin.repId)) return d;
        Object.assign(c, {
          name: contact.name.trim(), email: contact.email.trim().toLowerCase(), phone: contact.phone.trim(),
          company: contact.company.trim(), vat: contact.vat.replace(/[\s-]/g, ""),
          address: profile.delivery.street.trim(), city: profile.delivery.city.trim(), profile,
          linkedEmail: c.linkedEmail || contact.email.trim().toLowerCase(),
        });
        saved = structuredClone(c);
        return d;
      });
      return saved;
    },
    saveReferral(referral) {
      requireAccess("reps");
      commit((d) => {
        const i = d.referrals.findIndex((x) => x.id === referral.id);
        if (i >= 0) d.referrals[i] = referral; else d.referrals.push({ ...referral, createdBy: admin?.name });
        return d;
      });
    },
    setReferralPaid(id, paid) {
      requireAccess("reps");
      commit((d) => {
        const r = d.referrals.find((x) => x.id === id);
        if (r) r.paid = paid;
        return d;
      });
    },
    saveDelivery(docId, delivery) {
      requireAccess("delivery");
      commit((d) => {
        const doc = d.documents.find((x) => x.id === docId && x.kind === "invoice");
        if (!doc || doc.cancelled) return d;
        // Only main admins can reopen a signed delivery.
        if (doc.delivery?.status === "delivered" && admin?.role !== "main") return d;
        doc.delivery = { ...delivery, deliveredBy: delivery.status === "delivered" ? admin?.name : undefined };
        return d;
      });
    },
    convertQuote(quoteId) {
      requireAccess("quotes");
      let created: Document | null = null;
      commit((d) => {
        const quote = d.documents.find((x) => x.id === quoteId && x.kind === "quote");
        if (!quote || quote.linkedId) return d;
        const n = d.settings.next.invoice++;
        created = {
          ...structuredClone(quote), id: uid("i"), kind: "invoice", number: formatNumber("invoice", n), date: today,
          dueDate: addDays(today, d.settings.paymentTermsDays), quoteState: "accepted", linkedId: quote.id, payments: [], cancelled: false,
          notes: quote.notes, createdAt: today, createdBy: admin?.name,
        };
        quote.quoteState = "accepted";
        quote.linkedId = created.id;
        d.documents.push(created);
        return d;
      });
      return created;
    },
    recordPayment(docId, payment) {
      requireAccess("payments");
      commit((d) => {
        const doc = d.documents.find((x) => x.id === docId);
        if (doc?.kind === "invoice" && !doc.cancelled && Number.isFinite(payment.amount) && payment.amount > 0 && payment.amount <= balance(doc) + 0.001) doc.payments.push({ ...payment, id: uid("p"), by: admin?.name });
        return d;
      });
    },
    removePayment(docId, paymentId) {
      requireAccess("payments");
      commit((d) => {
        const doc = d.documents.find((x) => x.id === docId);
        if (doc) doc.payments = doc.payments.filter((p) => p.id !== paymentId);
        for (const t of d.bank) if (t.allocation?.kind === "invoice" && t.allocation.paymentId === paymentId) t.allocation = null;
        return d;
      });
    },
    setCancelled(docId, cancelled) {
      requireAccess("invoices");
      commit((d) => {
        const doc = d.documents.find((x) => x.id === docId);
        if (doc && (!cancelled || doc.payments.length === 0)) doc.cancelled = cancelled;
        return d;
      });
    },
    saveCatalogueItem(item) {
      requireAccess("products");
      commit((d) => {
        const i = d.catalogue.findIndex((x) => x.sku === item.sku);
        if (i >= 0) d.catalogue[i] = item; else d.catalogue.push(item);
        return d;
      });
    },
    saveSettings(settings) {
      requireAccess("settings");
      commit((d) => ({ ...d, settings }));
    },
    reset() {
      requireAccess("settings");
      replace(resetBackoffice());
    },
    saveRep(rep) {
      requireAccess("settings");
      commit((d) => {
        const i = d.reps.findIndex((x) => x.id === rep.id);
        if (i >= 0) d.reps[i] = rep; else d.reps.push(rep);
        return d;
      });
    },
    patchClient(id, patch) {
      requireAccess("clients");
      commit((d) => {
        const c = d.clients.find((x) => x.id === id);
        if (c) Object.assign(c, patch);
        return d;
      });
    },
    newSupplier() {
      return { id: uid("s"), name: "", contact: "", email: "", phone: "", vat: "", bankMatch: "", notes: "", createdAt: today };
    },
    saveSupplier(supplier) {
      requireAccess("suppliers");
      commit((d) => {
        const i = d.suppliers.findIndex((x) => x.id === supplier.id);
        if (i >= 0) d.suppliers[i] = supplier; else d.suppliers.push(supplier);
        return d;
      });
    },
    saveSupplierInvoice(invoice) {
      requireAccess("suppliers");
      commit((d) => {
        const i = d.supplierInvoices.findIndex((x) => x.id === invoice.id);
        if (i >= 0) d.supplierInvoices[i] = invoice; else d.supplierInvoices.push({ ...invoice, createdBy: admin?.name });
        return d;
      });
    },
    removeSupplierInvoice(id) {
      requireAccess("suppliers");
      commit((d) => {
        const inv = d.supplierInvoices.find((x) => x.id === id);
        if (!inv || inv.payments.length) return d;
        d.supplierInvoices = d.supplierInvoices.filter((x) => x.id !== id);
        return d;
      });
    },
    paySupplierInvoice(id, payment) {
      requireAccess("suppliers");
      commit((d) => {
        const inv = d.supplierInvoices.find((x) => x.id === id);
        if (inv && payment.amount > 0 && payment.amount <= supplierBalance(inv) + 0.004) inv.payments.push({ ...payment, id: uid("sp"), by: admin?.name });
        return d;
      });
    },
    removeSupplierPayment(id, paymentId) {
      requireAccess("suppliers");
      commit((d) => {
        const inv = d.supplierInvoices.find((x) => x.id === id);
        if (inv) inv.payments = inv.payments.filter((p) => p.id !== paymentId);
        for (const t of d.bank) if (t.allocation?.kind === "supplier" && t.allocation.paymentId === paymentId) t.allocation = null;
        return d;
      });
    },
    importBank(fileName, text) {
      requireAccess("bank");
      const result: ImportResult = { added: 0, duplicates: 0, skipped: 0, auto: 0 };
      commit((d) => {
        const { rows, skipped } = parseFnbCsv(text);
        result.skipped = skipped;
        const seen = new Set(d.bank.map(txnKey));
        for (const row of rows) {
          const key = txnKey(row);
          if (seen.has(key)) { result.duplicates++; continue; }
          seen.add(key);
          const txn: BankTxn = { id: uid("b"), ...row, source: fileName.slice(0, 80), allocation: null };
          d.bank.push(txn);
          result.added++;
          const m = matchTxn(txn, d);
          const target: AllocationTarget | null = !m ? null
            : m.kind === "invoice" ? { kind: "invoice", docId: m.doc.id, method: m.method }
            : m.kind === "supplier" ? { kind: "supplier", invoiceId: m.invoice.id }
            : { kind: "other", category: m.category, note: m.why };
          if (target && allocate(d, txn, target, true, admin?.name)) result.auto++;
        }
        return d;
      });
      return result;
    },
    allocateTxn(txnId, target) {
      requireAccess("bank");
      commit((d) => {
        const txn = d.bank.find((t) => t.id === txnId);
        if (txn && !txn.allocation) allocate(d, txn, target, false, admin?.name);
        return d;
      });
    },
    unallocateTxn(txnId) {
      requireAccess("bank");
      commit((d) => {
        const txn = d.bank.find((t) => t.id === txnId);
        const a = txn?.allocation;
        if (!txn || !a) return d;
        if (a.kind === "invoice") {
          const doc = d.documents.find((x) => x.id === a.docId);
          if (doc) doc.payments = doc.payments.filter((p) => p.id !== a.paymentId);
        } else if (a.kind === "supplier") {
          const inv = d.supplierInvoices.find((x) => x.id === a.invoiceId);
          if (inv) inv.payments = inv.payments.filter((p) => p.id !== a.paymentId);
        }
        txn.allocation = null;
        return d;
      });
    },
  }), [mode, signedIn, admin, data, visible, today, commit, replace]);

  return <Ctx.Provider value={api}>{storageError && <p role="alert" className="border-2 border-flare bg-paper p-4 text-sm">Browser storage is full or blocked. Changes are in memory only; keep this page open and export your work before leaving.</p>}{children}</Ctx.Provider>;
}

export function useBackoffice(): BackofficeState {
  const ctx = useContext(Ctx);
  if (!ctx) throw new Error("useBackoffice must be used inside BackofficeProvider");
  return ctx;
}
