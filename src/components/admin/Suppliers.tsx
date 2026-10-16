"use client";

import { useMemo, useState, type FormEvent } from "react";
import { useBackoffice, uid } from "./BackofficeContext";
import { Button, Empty, Field, Input, PageTitle, Panel, Select, StatTile, StatusBadge, Textarea, shortDate } from "./ui";
import { Icon } from "../Icon";
import { addDays, cents, supplierBalance, supplierPaid, supplierStatus } from "@/lib/backoffice/calc";
import type { Attachment, ExpenseCategory, Payment, Supplier, SupplierInvoice } from "@/lib/backoffice/types";
import { formatPrice } from "@/lib/format";
import { vatError } from "@/lib/vat";
import { StockBookIn, StockControl } from "./Stock";

export const EXPENSE_LABEL: Record<ExpenseCategory, string> = {
  stock: "Stock (fuel, additives)", packaging: "Packaging and labels", courier: "Courier", marketing: "Marketing", rent: "Rent and premises", other: "Other",
};
const METHODS: Payment["method"][] = ["eft", "cash", "card", "other"];
/** The demo keeps files in this browser's storage, which only holds a few MB in total. */
const DEMO_FILE_LIMIT = 900 * 1024;

export function SuppliersAdmin() {
  const { data, today } = useBackoffice();
  const [loading, setLoading] = useState(false);
  const [addingSupplier, setAddingSupplier] = useState(false);
  const [supplierFilter, setSupplierFilter] = useState("all");
  const [statusFilter, setStatusFilter] = useState("open");
  const [tab, setTab] = useState<"suppliers" | "invoices" | "bookin" | "stock">("invoices");
  const [bookFrom, setBookFrom] = useState<{ supplierId: string; supplierInvoiceId: string } | null>(null);

  const rows = useMemo(() => {
    if (!data) return [];
    return data.supplierInvoices
      .filter((i) => supplierFilter === "all" || i.supplierId === supplierFilter)
      .filter((i) => {
        const s = supplierStatus(i, today);
        return statusFilter === "all" || (statusFilter === "open" ? s !== "paid" : s === statusFilter);
      })
      .sort((a, b) => b.date.localeCompare(a.date));
  }, [data, supplierFilter, statusFilter, today]);

  if (!data) return null;
  const month = today.slice(0, 7);
  const owed = data.supplierInvoices.reduce((n, i) => n + Math.max(0, supplierBalance(i)), 0);
  const billedMonth = data.supplierInvoices.filter((i) => i.date.startsWith(month)).reduce((n, i) => n + i.amount, 0);
  const paidMonth = data.supplierInvoices.flatMap((i) => i.payments).filter((p) => p.date.startsWith(month)).reduce((n, p) => n + p.amount, 0);
  const overdue = data.supplierInvoices.filter((i) => supplierStatus(i, today) === "overdue").length;

  return (
    <>
      <PageTitle
        title="Suppliers"
        sub="Suppliers, their invoices, stock booked in from them, and stock control. Bank statement payments are matched on the Bank page."
        actions={<>
          <Button onClick={() => { setTab("suppliers"); setAddingSupplier(true); }}>Add supplier</Button>
          <Button tone="primary" onClick={() => { setTab("invoices"); setLoading(true); }} disabled={!data.suppliers.length}>Load supplier invoice</Button>
        </>}
      />
      <div className="mb-6 flex overflow-x-auto border-b-2 border-ink" role="tablist" aria-label="Suppliers and stock">
        {([["suppliers", "Suppliers"], ["invoices", "Supplier invoices"], ["bookin", "Stock book-in"], ["stock", "Stock control"]] as const).map(([k, label]) => (
          <button key={k} type="button" role="tab" aria-selected={tab === k} onClick={() => { setTab(k); if (k !== "bookin") setBookFrom(null); }}
            className={`-mb-0.5 shrink-0 border-2 border-b-0 px-4 py-2 font-mono text-xs font-bold uppercase tracking-wider ${tab === k ? "border-ink bg-panel" : "border-transparent text-muted hover:text-ink"}`}>
            {label}
          </button>
        ))}
      </div>
      {tab === "bookin" && <StockBookIn key={bookFrom?.supplierInvoiceId ?? "new"} supplierId={bookFrom?.supplierId} supplierInvoiceId={bookFrom?.supplierInvoiceId} />}
      {tab === "stock" && <StockControl />}
      {(tab === "suppliers" || tab === "invoices") && <>
      <div className="mb-6 grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
        <StatTile label="Owed to suppliers" value={formatPrice(owed)} sub={overdue ? `${overdue} overdue` : "Nothing overdue"} />
        <StatTile label="Billed this month" value={formatPrice(billedMonth)} sub="Supplier invoices dated this month" />
        <StatTile label="Paid this month" value={formatPrice(paidMonth)} />
        <StatTile label="Suppliers" value={String(data.suppliers.length)} />
      </div>

      {addingSupplier && <SupplierForm supplier={null} onDone={() => setAddingSupplier(false)} />}
      {loading && <InvoiceForm onDone={() => setLoading(false)} />}

      <div className="grid gap-6">
        {tab === "invoices" && <section aria-labelledby="supplier-invoices">
          <div className="mb-3 flex flex-wrap items-end justify-between gap-3">
            <h2 id="supplier-invoices" className="font-display text-xl">Supplier invoices</h2>
            <div className="flex flex-wrap gap-2">
              <Select aria-label="Supplier" value={supplierFilter} onChange={(e) => setSupplierFilter(e.target.value)} className="!mt-0 w-auto">
                <option value="all">All suppliers</option>
                {data.suppliers.map((s) => <option key={s.id} value={s.id}>{s.name}</option>)}
              </Select>
              <Select aria-label="Status" value={statusFilter} onChange={(e) => setStatusFilter(e.target.value)} className="!mt-0 w-auto">
                <option value="open">Still to pay</option>
                <option value="overdue">Overdue</option>
                <option value="paid">Paid</option>
                <option value="all">All</option>
              </Select>
            </div>
          </div>
          {rows.length === 0 ? <Empty>No supplier invoices match.</Empty> : (
            <ul className="space-y-3">{rows.map((i) => <InvoiceRow key={i.id} invoice={i} onBookIn={() => { setBookFrom({ supplierId: i.supplierId, supplierInvoiceId: i.id }); setTab("bookin"); }} />)}</ul>
          )}
        </section>}

        {tab === "suppliers" && <section aria-labelledby="supplier-list">
          <h2 id="supplier-list" className="mb-3 font-display text-xl">Supplier list</h2>
          {data.suppliers.length === 0 ? <Empty>Add your first supplier.</Empty> : (
            <ul className="grid gap-3 md:grid-cols-2 xl:grid-cols-3">{data.suppliers.map((s) => <SupplierRow key={s.id} supplier={s} />)}</ul>
          )}
        </section>}
      </div>
      </>}
    </>
  );
}

function SupplierRow({ supplier }: { supplier: Supplier }) {
  const { data } = useBackoffice();
  const [open, setOpen] = useState(false);
  const owing = data!.supplierInvoices.filter((i) => i.supplierId === supplier.id).reduce((n, i) => n + Math.max(0, supplierBalance(i)), 0);
  return (
    <li className="border-2 border-ink bg-panel">
      <button type="button" onClick={() => setOpen((o) => !o)} aria-expanded={open} className="flex w-full items-center justify-between gap-3 p-3 text-left hover:bg-paper-2">
        <span className="min-w-0"><span className="block truncate font-bold">{supplier.name}</span>{supplier.contact && <span className="text-xs text-muted">{supplier.contact}</span>}</span>
        <span className="num shrink-0 text-sm">{owing > 0 ? <span className="text-flare">owe {formatPrice(owing)}</span> : "Paid up"}</span>
      </button>
      {open && <div className="border-t-2 border-ink p-3"><SupplierForm supplier={supplier} onDone={() => setOpen(false)} /></div>}
    </li>
  );
}

function SupplierForm({ supplier, onDone }: { supplier: Supplier | null; onDone: () => void }) {
  const bo = useBackoffice();
  const [s, setS] = useState<Supplier>(() => supplier ?? bo.newSupplier());
  const [error, setError] = useState<string | null>(null);
  const set = (patch: Partial<Supplier>) => setS({ ...s, ...patch });
  function submit(e: FormEvent) {
    e.preventDefault();
    if (!s.name.trim()) return setError("Enter the supplier's name.");
    if (s.email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(s.email)) return setError("Check the email address.");
    const vat = vatError(s.vat);
    if (vat) return setError(vat);
    bo.saveSupplier({ ...s, name: s.name.trim(), vat: s.vat.replace(/[\s-]/g, ""), bankMatch: s.bankMatch.trim().toUpperCase() });
    onDone();
  }
  return (
    <form onSubmit={submit} noValidate className={supplier ? "" : "mb-6 border-2 border-ink bg-panel p-4"}>
      {!supplier && <h2 className="mb-3 font-display text-xl">Add supplier</h2>}
      {error && <p role="alert" className="mb-3 border-2 border-flare p-3 text-sm">{error}</p>}
      <div className={`grid gap-3 ${supplier ? "" : "sm:grid-cols-2 lg:grid-cols-3"}`}>
        <Field label="Supplier name"><Input value={s.name} onChange={(e) => set({ name: e.target.value })} /></Field>
        <Field label="Contact person"><Input value={s.contact} onChange={(e) => set({ contact: e.target.value })} /></Field>
        <Field label="Email"><Input type="email" value={s.email} onChange={(e) => set({ email: e.target.value })} /></Field>
        <Field label="Phone"><Input type="tel" value={s.phone} onChange={(e) => set({ phone: e.target.value })} /></Field>
        <Field label="VAT number" hint="Optional."><Input inputMode="numeric" value={s.vat} onChange={(e) => set({ vat: e.target.value })} /></Field>
        <Field label="Name on bank statement" hint="Words FNB shows for payments to them, for matching."><Input value={s.bankMatch} onChange={(e) => set({ bankMatch: e.target.value })} /></Field>
        <Field label="Notes" className={supplier ? "" : "sm:col-span-2 lg:col-span-3"}><Textarea rows={2} value={s.notes} onChange={(e) => set({ notes: e.target.value })} /></Field>
      </div>
      <div className="mt-3 flex justify-end gap-2">
        <Button onClick={onDone}>Cancel</Button>
        <Button type="submit" tone="primary">{supplier ? "Save" : "Add supplier"}</Button>
      </div>
    </form>
  );
}

function readFile(file: File): Promise<Attachment> {
  return new Promise((resolve) => {
    const base = { name: file.name.slice(0, 120), type: file.type || "application/octet-stream", size: file.size };
    if (file.size > DEMO_FILE_LIMIT) return resolve({ ...base, dataUrl: null });
    const reader = new FileReader();
    reader.onload = () => resolve({ ...base, dataUrl: typeof reader.result === "string" ? reader.result : null });
    reader.onerror = () => resolve({ ...base, dataUrl: null });
    reader.readAsDataURL(file);
  });
}

function InvoiceForm({ onDone }: { onDone: () => void }) {
  const bo = useBackoffice();
  const { data, today } = bo;
  const [f, setF] = useState({ supplierId: data?.suppliers[0]?.id ?? "", number: "", date: today, dueDate: addDays(today, 30), category: "stock" as ExpenseCategory, amount: "", description: "" });
  const [file, setFile] = useState<Attachment | null>(null);
  const [error, setError] = useState<string | null>(null);
  const set = (patch: Partial<typeof f>) => setF({ ...f, ...patch });

  function submit(e: FormEvent) {
    e.preventDefault();
    const amount = cents(Number(f.amount));
    if (!f.supplierId) return setError("Choose the supplier.");
    if (!f.number.trim()) return setError("Enter the supplier's invoice number.");
    if (!(amount > 0)) return setError("Enter the invoice amount.");
    if (data?.supplierInvoices.some((i) => i.supplierId === f.supplierId && i.number.trim().toUpperCase() === f.number.trim().toUpperCase())) return setError("That invoice number is already loaded for this supplier.");
    bo.saveSupplierInvoice({ id: uid("si"), supplierId: f.supplierId, number: f.number.trim(), date: f.date, dueDate: f.dueDate, category: f.category, amount, description: f.description.trim(), attachment: file, payments: [], createdAt: today });
    onDone();
  }

  return (
    <form onSubmit={submit} noValidate className="mb-6 border-2 border-ink bg-panel p-4 shadow-[6px_6px_0_0_var(--color-lime)]">
      <h2 className="mb-3 font-display text-xl">Load supplier invoice</h2>
      {error && <p role="alert" className="mb-3 border-2 border-flare p-3 text-sm">{error}</p>}
      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        <Field label="Supplier" className="sm:col-span-2">
          <Select value={f.supplierId} onChange={(e) => set({ supplierId: e.target.value })}>
            {data?.suppliers.map((s) => <option key={s.id} value={s.id}>{s.name}</option>)}
          </Select>
        </Field>
        <Field label="Their invoice number"><Input value={f.number} onChange={(e) => set({ number: e.target.value })} /></Field>
        <Field label="Amount (R)"><Input type="number" min={0.01} step="0.01" inputMode="decimal" value={f.amount} onChange={(e) => set({ amount: e.target.value })} /></Field>
        <Field label="Invoice date"><Input type="date" value={f.date} onChange={(e) => set({ date: e.target.value, dueDate: addDays(e.target.value, 30) })} /></Field>
        <Field label="Due date"><Input type="date" value={f.dueDate} onChange={(e) => set({ dueDate: e.target.value })} /></Field>
        <Field label="Category" className="sm:col-span-2">
          <Select value={f.category} onChange={(e) => set({ category: e.target.value as ExpenseCategory })}>
            {Object.entries(EXPENSE_LABEL).map(([k, v]) => <option key={k} value={k}>{v}</option>)}
          </Select>
        </Field>
        <Field label="What it's for" className="sm:col-span-2"><Input value={f.description} onChange={(e) => set({ description: e.target.value })} placeholder="e.g. Ethanol 96%, 4 x 210L" /></Field>
        <Field label="Invoice file (PDF or photo)" className="sm:col-span-2" hint={file && !file.dataUrl ? "Demo keeps files under 900 KB only; the name is saved. The live system stores any size." : "Optional."}>
          <Input type="file" accept="application/pdf,image/*" onChange={async (e) => { const fl = e.target.files?.[0]; setFile(fl ? await readFile(fl) : null); }} />
        </Field>
      </div>
      <div className="mt-3 flex justify-end gap-2">
        <Button onClick={onDone}>Cancel</Button>
        <Button type="submit" tone="primary">Save invoice</Button>
      </div>
    </form>
  );
}

function InvoiceRow({ invoice, onBookIn }: { invoice: SupplierInvoice; onBookIn: () => void }) {
  const bo = useBackoffice();
  const { data, today } = bo;
  const [open, setOpen] = useState(false);
  const owing = supplierBalance(invoice);
  const [amount, setAmount] = useState(String(owing));
  const [date, setDate] = useState(today);
  const [method, setMethod] = useState<Payment["method"]>("eft");
  const supplier = data!.suppliers.find((s) => s.id === invoice.supplierId);
  const status = supplierStatus(invoice, today);

  return (
    <li className="border-2 border-ink bg-panel">
      <button type="button" onClick={() => setOpen((o) => !o)} aria-expanded={open} className="grid w-full gap-1 p-4 text-left hover:bg-paper-2 sm:grid-cols-[1fr_auto] sm:items-center">
        <span className="min-w-0">
          <span className="font-bold">{supplier?.name ?? "Supplier"}</span> <span className="text-muted">· {invoice.number}</span>
          <span className="block truncate text-sm text-ink-soft">{shortDate(invoice.date)} · {EXPENSE_LABEL[invoice.category]}{invoice.description ? ` · ${invoice.description}` : ""}</span>
        </span>
        <span className="num flex flex-wrap items-center gap-3 text-sm sm:justify-end">
          <strong>{formatPrice(invoice.amount)}</strong>
          {owing > 0 && owing < invoice.amount && <span className="text-flare">owe {formatPrice(owing)}</span>}
          <StatusBadge status={status} />
          {invoice.attachment && <span className="border border-ink px-1.5 font-mono text-[0.62rem] uppercase">File</span>}
        </span>
      </button>
      {open && (
        <div className="grid gap-4 border-t-2 border-ink p-4 lg:grid-cols-2">
          <div className="space-y-2 text-sm">
            <p>Due {shortDate(invoice.dueDate)} · loaded {shortDate(invoice.createdAt)}{invoice.createdBy ? ` by ${invoice.createdBy}` : ""}</p>
            {invoice.attachment ? (
              invoice.attachment.dataUrl
                ? <a href={invoice.attachment.dataUrl} download={invoice.attachment.name} className="inline-block border-b-2 border-ink font-mono text-xs uppercase tracking-wider hover:text-flare">Open {invoice.attachment.name}</a>
                : <p className="text-muted">File: {invoice.attachment.name} (not kept in the demo)</p>
            ) : <p className="text-muted">No file attached.</p>}
            <h3 className="pt-2 font-mono text-xs font-bold uppercase tracking-wider">Payments</h3>
            {invoice.payments.length === 0 ? <p className="text-ink-soft">None yet.</p> : (
              <ul className="num divide-y divide-line">
                {invoice.payments.map((p) => (
                  <li key={p.id} className="flex items-center justify-between gap-2 py-1.5">
                    <span>{shortDate(p.date)} · {p.method.toUpperCase()}{p.by ? ` · ${p.by}` : ""}</span>
                    <span className="flex items-center gap-2 font-bold">{formatPrice(p.amount)}
                      <button type="button" onClick={() => bo.removeSupplierPayment(invoice.id, p.id)} aria-label="Remove payment" className="text-muted hover:text-flare"><Icon name="close" size={14} /></button>
                    </span>
                  </li>
                ))}
              </ul>
            )}
            <p className="num">Paid {formatPrice(supplierPaid(invoice))} of {formatPrice(invoice.amount)}</p>
          </div>
          <div>
            {owing > 0 ? (
              <form className="grid grid-cols-2 gap-3" onSubmit={(e) => {
                e.preventDefault();
                const value = cents(Number(amount));
                if (value > 0 && value <= owing) bo.paySupplierInvoice(invoice.id, { date, amount: value, method, note: "" });
              }}>
                <Field label="Amount paid"><Input type="number" min={0.01} max={owing} step="0.01" value={amount} onChange={(e) => setAmount(e.target.value)} /></Field>
                <Field label="Date"><Input type="date" value={date} onChange={(e) => setDate(e.target.value)} /></Field>
                <Field label="Method"><Select value={method} onChange={(e) => setMethod(e.target.value as Payment["method"])}>{METHODS.map((m) => <option key={m} value={m}>{m.toUpperCase()}</option>)}</Select></Field>
                <Button type="submit" tone="dark" className="self-end">Record payment</Button>
              </form>
            ) : <p className="border-2 border-ink bg-lime p-3 text-sm font-bold">Paid in full.</p>}
            {(() => { const booked = (data!.stock ?? []).filter((b) => b.supplierInvoiceId === invoice.id); return (
              <div className="mt-4 border-t border-line pt-3 text-sm">
                <p className="mb-2">{booked.length ? `Stock booked in: ${booked.map((b) => `${b.qty} × ${b.sku}${b.batchNumber ? ` (${b.batchNumber})` : ""}`).join(", ")}` : "No stock booked in from this invoice yet."}</p>
                <Button tone="dark" onClick={onBookIn}>Book in stock</Button>
              </div>
            ); })()}
            {invoice.payments.length === 0 && (
              <Button tone="danger" className="mt-4" onClick={() => { if (window.confirm(`Remove supplier invoice ${invoice.number}?`)) bo.removeSupplierInvoice(invoice.id); }}>Remove invoice</Button>
            )}
          </div>
        </div>
      )}
    </li>
  );
}
