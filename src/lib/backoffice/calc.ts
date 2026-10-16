// Pure back-office arithmetic: document totals, payment status, client
// pricing, statements and dashboard figures. No storage, no React, so the
// same rules can be unit-tested and reused by a server later.
import type { Referral, BackofficeData, CatalogueItem, Channel, Client, ClientType, Document, PriceTier, SupplierInvoice } from "./types";

/** Round to cents; all money is held as rand with two decimals. */
export const cents = (n: number) => Math.round(n * 100) / 100;

export const lineTotal = (l: { qty: number; unitPrice: number }) => cents(l.qty * l.unitPrice);
export const docSubtotal = (d: Pick<Document, "lines">) => cents(d.lines.reduce((n, l) => n + lineTotal(l), 0));
export const docTotal = (d: Pick<Document, "lines" | "courier">) => cents(docSubtotal(d) + d.courier);
export const docCost = (d: Pick<Document, "lines">) => cents(d.lines.reduce((n, l) => n + l.qty * l.unitCost, 0));
/** Gross profit on goods. Courier is passed through to the courier company, so it is left out. */
export const docProfit = (d: Pick<Document, "lines">) => cents(docSubtotal(d) - docCost(d));
export const paid = (d: Pick<Document, "payments">) => cents(d.payments.reduce((n, p) => n + p.amount, 0));
export const balance = (d: Pick<Document, "lines" | "courier" | "payments" | "cancelled">) =>
  d.cancelled ? 0 : cents(docTotal(d) - paid(d));

export type InvoiceStatus = "paid" | "part-paid" | "overdue" | "unpaid" | "cancelled";
export type QuoteStatus = "draft" | "sent" | "accepted" | "declined" | "invoiced" | "expired";

export function invoiceStatus(d: Document, today: string): InvoiceStatus {
  if (d.cancelled) return "cancelled";
  const owing = balance(d);
  if (owing <= 0) return "paid";
  if (d.dueDate && d.dueDate < today) return "overdue";
  return paid(d) > 0 ? "part-paid" : "unpaid";
}

export function quoteStatus(d: Document, today: string): QuoteStatus {
  if (d.linkedId) return "invoiced";
  if (d.quoteState === "accepted" || d.quoteState === "declined") return d.quoteState;
  if (d.dueDate && d.dueDate < today) return "expired";
  return d.quoteState;
}

export const STATUS_LABEL: Record<InvoiceStatus | QuoteStatus, string> = {
  paid: "Paid", "part-paid": "Part paid", overdue: "Overdue", unpaid: "Unpaid", cancelled: "Cancelled",
  draft: "Draft", sent: "Sent", accepted: "Accepted", declined: "Declined", invoiced: "Invoiced", expired: "Expired",
};

export const CLIENT_TYPE_LABEL: Record<ClientType, string> = {
  agent: "Agent", bulk: "Bulk", private: "Private / cash", website: "Website",
};

export const CHANNEL_LABEL: Record<Channel, string> = { website: "Website", private: "Private", agent: "Agent" };

/** Default channel and tier for a new client of this type. */
export function defaultsFor(type: ClientType): { channel: Channel; tier: PriceTier } {
  if (type === "agent") return { channel: "agent", tier: "agent" };
  if (type === "bulk") return { channel: "private", tier: "bulk" };
  if (type === "website") return { channel: "website", tier: "retail" };
  return { channel: "private", tier: "retail" };
}

/**
 * The price a client pays for one unit: their agreed price for this SKU, else
 * their tier price, else the website price. null means "on quotation".
 */
export function priceFor(item: CatalogueItem, client: Pick<Client, "tier" | "prices"> | null): number | null {
  const agreed = client?.prices[item.sku];
  if (typeof agreed === "number" && agreed > 0) return agreed;
  if (client?.tier === "agent" && item.agent) return item.agent;
  if (client?.tier === "bulk" && item.bulk) return item.bulk;
  return item.retail;
}

/** QUO-0007 / INV-0042. */
export function formatNumber(kind: Document["kind"], n: number): string {
  return `${kind === "quote" ? "QUO" : "INV"}-${String(n).padStart(4, "0")}`;
}

export function addDays(iso: string, days: number): string {
  const d = new Date(`${iso}T00:00:00Z`);
  d.setUTCDate(d.getUTCDate() + days);
  return d.toISOString().slice(0, 10);
}

export type ClientSummary = {
  /** Total invoiced (not cancelled), incl. courier. */
  spent: number;
  outstanding: number;
  invoices: number;
  quotes: number;
  lastActivity: string | null;
};

export function clientSummary(clientId: string, docs: Document[]): ClientSummary {
  const mine = docs.filter((d) => d.clientId === clientId);
  const invoices = mine.filter((d) => d.kind === "invoice" && !d.cancelled);
  return {
    spent: cents(invoices.reduce((n, d) => n + docTotal(d), 0)),
    outstanding: cents(invoices.reduce((n, d) => n + Math.max(0, balance(d)), 0)),
    invoices: invoices.length,
    quotes: mine.filter((d) => d.kind === "quote").length,
    lastActivity: mine.map((d) => d.date).sort().at(-1) ?? null,
  };
}

export type StatementRow = { date: string; description: string; reference: string; debit: number; credit: number; balance: number };

/**
 * Running account for one client: invoices charge (debit), payments reduce
 * (credit). Rows before `from` roll into the opening balance.
 */
export function statement(clientId: string, docs: Document[], from = "", to = "9999-12-31") {
  const events: Omit<StatementRow, "balance">[] = [];
  for (const d of docs) {
    if (d.clientId !== clientId || d.kind !== "invoice" || d.cancelled) continue;
    events.push({ date: d.date, description: `Invoice ${d.number}`, reference: d.number, debit: docTotal(d), credit: 0 });
    for (const p of d.payments) {
      events.push({ date: p.date, description: `Payment (${p.method.toUpperCase()})${p.note ? ` · ${p.note}` : ""}`, reference: d.number, debit: 0, credit: p.amount });
    }
  }
  events.sort((a, b) => a.date.localeCompare(b.date) || b.debit - a.debit);
  let running = 0;
  let opening = 0;
  const rows: StatementRow[] = [];
  for (const e of events) {
    running = cents(running + e.debit - e.credit);
    if (e.date < from) { opening = running; continue; }
    if (e.date > to) break;
    rows.push({ ...e, balance: running });
  }
  return { opening, rows, closing: rows.at(-1)?.balance ?? opening };
}

export type Period = "month" | "30d" | "year" | "all";

export function periodStart(period: Period, today: string): string {
  if (period === "month") return `${today.slice(0, 7)}-01`;
  if (period === "30d") return addDays(today, -29);
  if (period === "year") return `${today.slice(0, 4)}-01-01`;
  return "";
}

export type Dashboard = {
  turnover: number;
  profit: number;
  margin: number;
  byChannel: Record<Channel, number>;
  outstanding: number;
  collected: number;
  invoices: number;
  openQuotes: number;
  /** Last six calendar months, oldest first, turnover by channel. */
  months: { month: string; values: Record<Channel, number> }[];
  /** Supplier invoices dated in the period. */
  expenses: number;
  /** Turnover less supplier invoices: a quick cash view of profit. */
  afterExpenses: number;
  /** Unpaid supplier invoice balances. */
  owedToSuppliers: number;
};

export const supplierPaid = (i: SupplierInvoice) => cents(i.payments.reduce((n, p) => n + p.amount, 0));
export const supplierBalance = (i: SupplierInvoice) => cents(i.amount - supplierPaid(i));
export function supplierStatus(i: SupplierInvoice, today: string): "paid" | "part-paid" | "overdue" | "unpaid" {
  const owing = supplierBalance(i);
  if (owing <= 0.004) return "paid";
  if (i.dueDate < today) return "overdue";
  return supplierPaid(i) > 0 ? "part-paid" : "unpaid";
}

export function dashboard(data: Pick<BackofficeData, "documents"> & Partial<Pick<BackofficeData, "supplierInvoices">>, period: Period, today: string): Dashboard {
  const from = periodStart(period, today);
  const live = data.documents.filter((d) => d.kind === "invoice" && !d.cancelled);
  const inPeriod = live.filter((d) => d.date >= from && d.date <= today);
  const byChannel: Record<Channel, number> = { website: 0, private: 0, agent: 0 };
  let turnover = 0;
  let profit = 0;
  let goods = 0;
  for (const d of inPeriod) {
    const total = docTotal(d);
    turnover += total;
    byChannel[d.channel] += total;
    profit += docProfit(d);
    goods += docSubtotal(d);
  }
  const bills = data.supplierInvoices ?? [];
  const expenses = bills.filter((i) => i.date >= from && i.date <= today).reduce((n, i) => n + i.amount, 0);
  const collected = live.flatMap((d) => d.payments).filter((p) => p.date >= from && p.date <= today).reduce((n, p) => n + p.amount, 0);
  const months: Dashboard["months"] = [];
  const start = new Date(`${today.slice(0, 7)}-01T00:00:00Z`);
  for (let i = 5; i >= 0; i--) {
    const m = new Date(start);
    m.setUTCMonth(m.getUTCMonth() - i);
    const key = m.toISOString().slice(0, 7);
    const values: Record<Channel, number> = { website: 0, private: 0, agent: 0 };
    for (const d of live) if (d.date.startsWith(key)) values[d.channel] = cents(values[d.channel] + docTotal(d));
    months.push({ month: key, values });
  }
  return {
    turnover: cents(turnover),
    profit: cents(profit),
    margin: goods > 0 ? Math.round((profit / goods) * 1000) / 10 : 0,
    byChannel: { website: cents(byChannel.website), private: cents(byChannel.private), agent: cents(byChannel.agent) },
    outstanding: cents(live.reduce((n, d) => n + Math.max(0, balance(d)), 0)),
    collected: cents(collected),
    invoices: inPeriod.length,
    openQuotes: data.documents.filter((d) => d.kind === "quote" && ["draft", "sent"].includes(quoteStatus(d, today))).length,
    months,
    expenses: cents(expenses),
    afterExpenses: cents(turnover - expenses),
    owedToSuppliers: cents(bills.reduce((n, i) => n + Math.max(0, supplierBalance(i)), 0)),
  };
}

/** Today's date in South Africa (yyyy-mm-dd), so the dashboard rolls over at local midnight. */
export function todaySA(now = new Date()): string {
  return new Intl.DateTimeFormat("en-CA", { timeZone: "Africa/Johannesburg", year: "numeric", month: "2-digit", day: "2-digit" }).format(now);
}

export type Breakdown = {
  /** Turnover per rep (and "unassigned"), for the period. */
  byRep: { repId: string | null; name: string; clients: number; turnover: number; owing: number }[];
  /** Every agent client with what they spent in the period. */
  agents: { client: Client; spent: number; owing: number }[];
  /** Private sales on cash customers: name, invoice number and amount. */
  cash: { total: number; sales: { doc: Document; name: string; total: number }[] };
  /** Private sales to key customers (normal private sales). */
  keyPrivate: number;
  /** Sales to bulk buyers. */
  bulk: number;
};

export function breakdown(data: Pick<BackofficeData, "documents" | "clients"> & Partial<Pick<BackofficeData, "reps">>, period: Period, today: string): Breakdown {
  const from = periodStart(period, today);
  const live = data.documents.filter((d) => d.kind === "invoice" && !d.cancelled);
  const inPeriod = live.filter((d) => d.date >= from && d.date <= today);
  const clientOf = new Map(data.clients.map((c) => [c.id, c]));
  const reps = data.reps ?? [];
  const sumFor = (ids: Set<string>, docs: Document[]) => cents(docs.filter((d) => ids.has(d.clientId)).reduce((n, d) => n + docTotal(d), 0));
  const owingFor = (ids: Set<string>) => cents(live.filter((d) => ids.has(d.clientId)).reduce((n, d) => n + Math.max(0, balance(d)), 0));

  const groups: { repId: string | null; name: string }[] = [...reps.map((r) => ({ repId: r.id, name: r.name })), { repId: null, name: "No rep" }];
  const byRep = groups.map((g) => {
    const ids = new Set(data.clients.filter((c) => (c.repId ?? null) === g.repId).map((c) => c.id));
    return { ...g, clients: ids.size, turnover: sumFor(ids, inPeriod), owing: owingFor(ids) };
  }).filter((r) => r.repId !== null || r.turnover > 0 || r.owing > 0);

  const agents = data.clients.filter((c) => c.type === "agent").map((c) => {
    const ids = new Set([c.id]);
    return { client: c, spent: sumFor(ids, inPeriod), owing: owingFor(ids) };
  }).sort((a, b) => b.spent - a.spent);

  const cashSales = inPeriod
    .filter((d) => clientOf.get(d.clientId)?.cash)
    .map((d) => {
      const c = clientOf.get(d.clientId)!;
      return { doc: d, name: d.cashName || c.company || c.name, total: docTotal(d) };
    })
    .sort((a, b) => b.doc.date.localeCompare(a.doc.date));

  const keyPrivate = cents(inPeriod.filter((d) => { const c = clientOf.get(d.clientId); return c?.type === "private" && !c.cash; }).reduce((n, d) => n + docTotal(d), 0));
  const bulk = cents(inPeriod.filter((d) => clientOf.get(d.clientId)?.type === "bulk").reduce((n, d) => n + docTotal(d), 0));
  return { byRep, agents, cash: { total: cents(cashSales.reduce((n, s) => n + s.total, 0)), sales: cashSales }, keyPrivate, bulk };
}

/** An order not yet delivered: a live invoice whose delivery is still pending. Older records without delivery details count as delivered. */
export const pendingDelivery = (d: Document) => d.kind === "invoice" && !d.cancelled && d.delivery?.status === "pending";

/** Undelivered orders, oldest first, so nothing sold slips through. */
export function pendingOrders(docs: Document[]): Document[] {
  return docs.filter(pendingDelivery).sort((a, b) => a.date.localeCompare(b.date) || a.number.localeCompare(b.number));
}

/**
 * Referral commission (clause 4 and 5 of the referral agreement): a percentage of the
 * net invoice value excluding VAT and courier of the first sale to the client after the
 * agreement, earned once that invoice is paid in full; due within 14 days.
 */
export function referralEarning(ref: Pick<Referral, "clientId" | "percent" | "agreementDate">, docs: Document[], vatRegistered: boolean) {
  const invoice = docs
    .filter((d) => d.kind === "invoice" && !d.cancelled && d.clientId === ref.clientId && d.date >= ref.agreementDate)
    .sort((a, b) => a.date.localeCompare(b.date) || a.number.localeCompare(b.number))[0] ?? null;
  if (!invoice) return { invoice: null, netValue: 0, amount: 0, earned: false, dueBy: null as string | null };
  const goods = docSubtotal(invoice);
  const netValue = cents(vatRegistered ? goods / 1.15 : goods);
  const earned = balance(invoice) <= 0.004;
  const paidOn = earned ? invoice.payments.reduce((max, p) => (p.date > max ? p.date : max), invoice.date) : null;
  return { invoice, netValue, amount: cents((netValue * ref.percent) / 100), earned, dueBy: paidOn ? addDays(paidOn, 14) : null };
}
