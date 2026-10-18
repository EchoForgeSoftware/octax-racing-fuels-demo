// GENERATED from src/lib/backoffice/bank.ts by scripts/gen-backoffice-function.mjs. Do not edit.
// Bank statement import and matching. Pure functions: the back office calls
// them and applies the result, and scripts/backoffice.test.mjs tests them.
//
// FNB online banking exports transactions as CSV (Transaction History →
// Download → CSV). Two layouts are in use and both are read here:
//   classic:  5,1,'01 Oct 2026','FNB App Payment From','INV-0012 Steyn','',1500.00,20000.00,0.00
//   simple:   Date,Amount,Balance,Description  →  2026/10/01,1500.00,20000.00,FNB APP PAYMENT FROM INV-0012
// PDF statements are not read: download the CSV for the same period instead.
import { balance, cents, formatNumber } from "./calc.ts";
import type { Allocation, BackofficeData, BankTxn, Document, Payment, SupplierInvoice } from "./types.ts";

export type BankRow = { date: string; description: string; amount: number; balance: number | null };

const MONTHS: Record<string, string> = { jan: "01", feb: "02", mar: "03", apr: "04", may: "05", jun: "06", jul: "07", aug: "08", sep: "09", oct: "10", nov: "11", dec: "12" };

/** Split one CSV line, honouring "double" and FNB's 'single' quotes. */
export function splitCsv(line: string): string[] {
  const out: string[] = [];
  let cur = "";
  let quote: string | null = null;
  for (let i = 0; i < line.length; i++) {
    const ch = line[i];
    if (quote) {
      if (ch === quote && line[i + 1] === quote) { cur += ch; i++; }
      else if (ch === quote) quote = null;
      else cur += ch;
    } else if ((ch === '"' || ch === "'") && cur.trim() === "") { quote = ch; cur = ""; }
    else if (ch === ",") { out.push(cur.trim()); cur = ""; }
    else cur += ch;
  }
  out.push(cur.trim());
  return out;
}

/** 2026/10/01, 2026-10-01, 01/10/2026 (day first), 01 Oct 2026 or 1 October 2026 → 2026-10-01. */
export function parseDate(text: string): string | null {
  const t = text.trim();
  let m = t.match(/^(\d{4})[/-](\d{1,2})[/-](\d{1,2})$/);
  if (m) return validDate(`${m[1]}-${m[2].padStart(2, "0")}-${m[3].padStart(2, "0")}`);
  m = t.match(/^(\d{1,2})[/-](\d{1,2})[/-](\d{4})$/);
  if (m) return validDate(`${m[3]}-${m[2].padStart(2, "0")}-${m[1].padStart(2, "0")}`);
  m = t.match(/^(\d{1,2})\s+([A-Za-z]{3})[A-Za-z]*\s+(\d{4})$/);
  if (m && MONTHS[m[2].toLowerCase()]) return validDate(`${m[3]}-${MONTHS[m[2].toLowerCase()]}-${m[1].padStart(2, "0")}`);
  return null;
}

function validDate(value: string) {
  const date = new Date(`${value}T00:00:00Z`);
  return Number.isFinite(date.getTime()) && date.toISOString().slice(0,10) === value ? value : null;
}

/** "1,500.00", "-250.00", "R 1 500,00", "1500.00Cr", "250.00Dr" → number. */
export function parseAmount(text: string): number | null {
  let t = text.replace(/^\s*R\s*/i, "").replace(/\s/g, "");
  let sign = 1;
  if (/dr$/i.test(t)) { sign = -1; t = t.slice(0, -2); } else if (/cr$/i.test(t)) t = t.slice(0, -2);
  if (/^-?(?:\d+|\d{1,3}(?:\.\d{3})+),\d{2}$/.test(t)) t = t.replace(/\./g, "").replace(",", ".");
  t = t.replace(/,/g, "");
  if (!/^-?\d+(\.\d+)?$/.test(t)) return null;
  const amount = sign * Number(t);
  return Number.isFinite(amount) && Math.abs(amount) <= 1e12 ? cents(amount) : null;
}

/** Read an FNB CSV export. Returns rows plus how many lines could not be read. */
export function parseFnbCsv(text: string): { rows: BankRow[]; skipped: number } {
  const lines = text.replace(/^﻿/, "").split(/\r?\n/).filter((l) => l.trim() !== "");
  const rows: BankRow[] = [];
  let skipped = 0;

  // Classic layout: transaction lines start with record type 5.
  if (lines.some((l) => /^5,/.test(l))) {
    for (const line of lines.filter((l) => /^5,/.test(l))) {
      const c = splitCsv(line);
      const date = parseDate(c[2] ?? "");
      const amount = parseAmount(c[6] ?? "");
      if (!date || amount === null || /^date$/i.test(c[2] ?? "")) { if (!/^date$/i.test(c[2] ?? "")) skipped++; continue; }
      rows.push({ date, description: [c[3], c[4], c[5]].filter(Boolean).join(" ").replace(/\s+/g, " ").trim(), amount, balance: parseAmount(c[7] ?? "") });
    }
    return { rows, skipped };
  }

  // Simple layout: find the header row, then read by column name.
  const headerAt = lines.findIndex((l) => /date/i.test(l) && /amount/i.test(l));
  if (headerAt < 0) return { rows, skipped: lines.length };
  const head = splitCsv(lines[headerAt]).map((h) => h.toLowerCase());
  const col = (name: RegExp) => head.findIndex((h) => name.test(h));
  const iDate = col(/date/), iAmount = col(/amount/), iBalance = col(/balance/);
  const iDesc = head.map((h, i) => (/desc|reference|narrative|details/.test(h) ? i : -1)).filter((i) => i >= 0);
  for (const line of lines.slice(headerAt + 1)) {
    const c = splitCsv(line);
    const date = parseDate(c[iDate] ?? "");
    const amount = parseAmount(c[iAmount] ?? "");
    if (!date || amount === null) { skipped++; continue; }
    rows.push({ date, description: iDesc.map((i) => c[i]).filter(Boolean).join(" ").replace(/\s+/g, " ").trim(), amount, balance: iBalance >= 0 ? parseAmount(c[iBalance] ?? "") : null });
  }
  return { rows, skipped };
}

/** Same date, amount, description and balance = the same bank line (re-imports and overlapping statements). */
export const txnKey = (r: Pick<BankRow, "date" | "amount" | "description" | "balance">) =>
  `${r.date}|${r.amount.toFixed(2)}|${r.description.toUpperCase().replace(/\s+/g, " ")}|${r.balance ?? ""}`;

const norm = (s: string) => s.toUpperCase().replace(/[^A-Z0-9]/g, "");

export type Match =
  | { kind: "invoice"; doc: Document; method: Payment["method"]; why: string }
  | { kind: "supplier"; invoice: SupplierInvoice; why: string }
  | { kind: "other"; category: "fees"; why: string };

/** How the money came in, from the statement wording. */
export function methodFor(description: string): Payment["method"] {
  if (/ozow/i.test(description)) return "ozow";
  if (/cash|adt|atm dep/i.test(description)) return "cash";
  return "eft";
}

const supplierBalance = (i: SupplierInvoice) => cents(i.amount - i.payments.reduce((n, p) => n + p.amount, 0));

/**
 * A confident match for one bank line, or null to leave it for a person.
 * Money in: an invoice number (INV-0012, INV 12) or website order reference
 * (OCTA-…) in the description, on an open invoice that still owes at least
 * that much. Money out: the supplier's invoice number, or the supplier's bank
 * words plus the exact amount owing. Bank fees are filed as fees.
 */
export function matchTxn(txn: Pick<BankRow, "description" | "amount">, data: Pick<BackofficeData, "documents" | "supplierInvoices" | "suppliers">): Match | null {
  const desc = txn.description;
  if (txn.amount > 0) {
    const open = data.documents.filter((d) => d.kind === "invoice" && !d.cancelled && balance(d) > 0.004);
    const fits = (d: Document) => txn.amount <= balance(d) + 0.004;
    const matches: Document[] = [];
    for (const m of desc.matchAll(/\bINV(?:OICE)?[\s#:-]*0*(\d{1,6})\b/gi)) {
      const number = formatNumber("invoice", Number(m[1]));
      const doc = open.find((d) => d.number === number);
      if (doc && fits(doc) && !matches.some(d => d.id === doc.id)) matches.push(doc);
    }
    const ref = desc.match(/\bOCTA-?[A-Z0-9]{12}\b/i)?.[0];
    if (ref) {
      for (const doc of open.filter(d => d.reference && norm(d.reference) === norm(ref) && fits(d))) if (!matches.some(d => d.id === doc.id)) matches.push(doc);
    }
    return matches.length === 1 ? {kind:"invoice", doc:matches[0], method:methodFor(desc), why:`Unique invoice/order reference on the statement`} : null;
  }
  if (txn.amount < 0) {
    const out = -txn.amount;
    const open = data.supplierInvoices.filter((i) => supplierBalance(i) > 0.004 && out <= supplierBalance(i) + 0.004);
    const byNumber = open.filter((i) => i.number.length >= 3 && new RegExp(`(?:^|[^A-Z0-9])${i.number.replace(/[.*+?^${}()|[\]\\]/g,"\\$&")}(?:$|[^A-Z0-9])`,"i").test(desc));
    if (byNumber.length === 1) return { kind: "supplier", invoice: byNumber[0], why: `Supplier invoice ${byNumber[0].number} on the statement` };
    if (byNumber.length > 1) return null;
    const bySupplier = open.filter((i) => {
      const s = data.suppliers.find((x) => x.id === i.supplierId);
      return s?.bankMatch && norm(desc).includes(norm(s.bankMatch)) && Math.abs(supplierBalance(i) - out) < 0.005;
    });
    if (bySupplier.length === 1) return { kind: "supplier", invoice: bySupplier[0], why: "Supplier name and exact amount owing" };
    if (/\bfees?\b|charges?|#?service fee|monthly acc/i.test(desc)) return { kind: "other", category: "fees", why: "Bank fee" };
  }
  return null;
}

/** Open invoices whose balance equals this amount: suggestions for a person to confirm, never automatic. */
export function suggestions(txn: Pick<BankRow, "amount">, data: Pick<BackofficeData, "documents" | "supplierInvoices">) {
  if (txn.amount > 0) return data.documents.filter((d) => d.kind === "invoice" && !d.cancelled && Math.abs(balance(d) - txn.amount) < 0.005);
  return data.supplierInvoices.filter((i) => Math.abs(supplierBalance(i) + txn.amount) < 0.005);
}

export function allocationLabel(a: Allocation | null, data: Pick<BackofficeData, "documents" | "supplierInvoices" | "suppliers">): string {
  if (!a) return "Not allocated";
  if (a.kind === "invoice") return `Invoice ${data.documents.find((d) => d.id === a.docId)?.number ?? "(removed)"}`;
  if (a.kind === "supplier") {
    const inv = data.supplierInvoices.find((i) => i.id === a.invoiceId);
    const s = data.suppliers.find((x) => x.id === inv?.supplierId);
    return `${s?.name ?? "Supplier"} ${inv?.number ?? ""}`.trim();
  }
  return { fees: "Bank fees", transfer: "Transfer", income: "Other income", stock: "Stock", packaging: "Packaging", courier: "Courier", marketing: "Marketing", rent: "Rent", other: "Other" }[a.category];
}

export function bankSummary(txns: BankTxn[]) {
  const sorted = [...txns].sort((a, b) => a.date.localeCompare(b.date));
  return {
    in: cents(txns.filter((t) => t.amount > 0).reduce((n, t) => n + t.amount, 0)),
    out: cents(-txns.filter((t) => t.amount < 0).reduce((n, t) => n + t.amount, 0)),
    unallocated: txns.filter((t) => !t.allocation).length,
    closing: sorted.length ? sorted[sorted.length - 1].balance : null,
  };
}

/**
 * A believable FNB CSV (classic layout) for trying the import in the demo:
 * payments quoting open invoice numbers (EFT, cash deposit and Ozow), a
 * supplier payment, a bank fee and one deposit nobody can place.
 */
export function sampleFnbCsv(data: Pick<BackofficeData, "documents" | "supplierInvoices" | "suppliers">, today: string): string {
  const open = data.documents.filter((d) => d.kind === "invoice" && !d.cancelled && balance(d) > 0).sort((a, b) => a.date.localeCompare(b.date));
  const supplier = data.supplierInvoices.find((i) => supplierBalance(i) > 0);
  const day = (offset: number) => {
    const d = new Date(`${today}T00:00:00Z`);
    d.setUTCDate(d.getUTCDate() + offset);
    return `${String(d.getUTCDate()).padStart(2, "0")} ${"Jan Feb Mar Apr May Jun Jul Aug Sep Oct Nov Dec".split(" ")[d.getUTCMonth()]} ${d.getUTCFullYear()}`;
  };
  let bal = 85000;
  const lines: string[] = [
    "2,'62000000000','OCTA BUSINESS ACC'",
    "3,'Opening Balance',85000.00",
    "5,'Number','Date','Description1','Description2','Description3','Amount','Balance','Accrued Charges'",
  ];
  let n = 1;
  const add = (offset: number, d1: string, d2: string, amount: number) => {
    bal = cents(bal + amount);
    lines.push(`5,${n++},'${day(offset)}','${d1}','${d2}','',${amount.toFixed(2)},${bal.toFixed(2)},0.00`);
  };
  const [a, b, c, d] = open;
  if (a) add(-6, "FNB App Payment From", `${a.number} ${a.lines[0]?.description.split(" ")[0] ?? ""}`.trim(), balance(a));
  if (b) add(-5, "ADT Cash Deposit", `${b.number}`, balance(b));
  if (c) add(-4, "OZOW Payment", `Ref ${c.number}`, Math.min(balance(c), cents(balance(c) / 2)));
  if (supplier) {
    const s = data.suppliers.find((x) => x.id === supplier.supplierId);
    add(-3, "FNB App Payment To", `${s?.bankMatch ?? "SUPPLIER"} ${supplier.number}`, -supplierBalance(supplier));
  }
  add(-2, "#Monthly Account Fee", "", -195);
  add(-1, "Magtape Credit", "UNKNOWN DEPOSIT", d ? balance(d) : 1250);
  return lines.join("\r\n") + "\r\n";
}
