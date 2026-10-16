"use client";

import { useMemo, useState, type FormEvent } from "react";
import { uid, useBackoffice } from "./BackofficeContext";
import { Button, Empty, Field, Input, Panel, Select, StatTile, Textarea, shortDate } from "./ui";
import { cents } from "@/lib/backoffice/calc";
import { effectiveCost, exVat, inclVat, stockLevels, stockLosses, unitProfit, WARNING_LABEL, type StockLevel } from "@/lib/backoffice/stock";
import { formatPrice } from "@/lib/format";

/** Book stock in: product, quantity, cost (ex or incl VAT), batch, expiry and the selling price, with a live profit check. */
export function StockBookIn({ supplierId: presetSupplier = "", supplierInvoiceId: presetInvoice = "", onDone }: { supplierId?: string; supplierInvoiceId?: string; onDone?: () => void }) {
  const bo = useBackoffice();
  const { data, today, admin } = bo;
  const items = useMemo(() => data?.catalogue.filter((i) => i.active && !i.comingSoon) ?? [], [data]);
  const [sku, setSku] = useState(items[0]?.sku ?? "");
  const item = items.find((i) => i.sku === sku);
  const [f, setF] = useState({ date: today, qty: "", supplierId: presetSupplier, supplierInvoiceId: presetInvoice, batchNumber: "", expiryDate: "", notes: "" });
  const [costBasis, setCostBasis] = useState<"ex" | "incl">("ex");
  const [cost, setCost] = useState("");
  const [sell, setSell] = useState(item?.retail?.toString() ?? "");
  const [updateCost, setUpdateCost] = useState(true);
  const [updatePrice, setUpdatePrice] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);
  if (!data) return null;
  const vatRegistered = data.settings.vatRegistered;
  const set = (patch: Partial<typeof f>) => setF({ ...f, ...patch });

  const entered = Number(cost);
  const ex = cost === "" || !(entered >= 0) ? null : costBasis === "ex" ? cents(entered) : exVat(entered);
  const incl = ex === null ? null : costBasis === "incl" ? cents(entered) : inclVat(ex);
  const realCost = ex === null || incl === null ? null : vatRegistered ? ex : incl;
  const sellPrice = sell === "" ? null : cents(Number(sell));
  const check = realCost === null ? null : unitProfit(sellPrice, realCost);
  const qty = Math.round(Number(f.qty));
  const invoices = data.supplierInvoices.filter((i) => !f.supplierId || i.supplierId === f.supplierId);

  function choose(next: string) {
    setSku(next);
    setSell(items.find((i) => i.sku === next)?.retail?.toString() ?? "");
  }

  function submit(e: FormEvent) {
    e.preventDefault();
    setNotice(null);
    if (!item) return setError("Choose the product.");
    if (!(qty > 0)) return setError("Enter how many units came in.");
    if (ex === null || incl === null) return setError("Enter the cost per unit.");
    if (f.expiryDate && f.expiryDate <= f.date) return setError("The expiry date must be after the book-in date.");
    bo.bookInStock({
      id: uid("sb"), sku: item.sku, date: f.date, supplierId: f.supplierId || null, supplierInvoiceId: f.supplierInvoiceId || null,
      batchNumber: f.batchNumber.trim(), expiryDate: f.expiryDate || null, qty, unitCostEx: ex, unitCostIncl: incl,
      sellPrice, notes: f.notes.trim(), createdAt: today,
    }, { updateCost, updatePrice });
    setNotice(`Booked in ${qty} × ${item.productName} ${item.size}${f.batchNumber ? `, batch ${f.batchNumber}` : ""}.`);
    setF({ ...f, qty: "", batchNumber: "", expiryDate: "", notes: "" });
    setCost("");
    setError(null);
    onDone?.();
  }

  return (
    <form onSubmit={submit} noValidate className="border-2 border-ink bg-panel p-4">
      <h2 className="mb-3 font-display text-xl">Book stock in</h2>
      {error && <p role="alert" className="mb-3 border-2 border-flare p-3 text-sm">{error}</p>}
      {notice && <p role="status" className="mb-3 border-2 border-ink bg-lime p-3 text-sm">{notice}</p>}
      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        <Field label="Product" className="sm:col-span-2">
          <Select value={sku} onChange={(e) => choose(e.target.value)}>
            {items.map((i) => <option key={i.sku} value={i.sku}>{i.productName} — {i.size}</option>)}
          </Select>
        </Field>
        <Field label="Quantity in"><Input type="number" min={1} step="1" inputMode="numeric" value={f.qty} onChange={(e) => set({ qty: e.target.value })} /></Field>
        <Field label="Date booked in"><Input type="date" value={f.date} onChange={(e) => set({ date: e.target.value })} /></Field>
        <Field label="Supplier">
          <Select value={f.supplierId} onChange={(e) => set({ supplierId: e.target.value, supplierInvoiceId: "" })}>
            <option value="">Not linked</option>
            {data.suppliers.map((s) => <option key={s.id} value={s.id}>{s.name}</option>)}
          </Select>
        </Field>
        <Field label="Supplier invoice">
          <Select value={f.supplierInvoiceId} onChange={(e) => set({ supplierInvoiceId: e.target.value })}>
            <option value="">Not linked</option>
            {invoices.map((i) => <option key={i.id} value={i.id}>{i.number} · {shortDate(i.date)}</option>)}
          </Select>
        </Field>
        <Field label="Batch number"><Input value={f.batchNumber} onChange={(e) => set({ batchNumber: e.target.value })} autoComplete="off" /></Field>
        <Field label="Expiry date" hint="Leave empty if it doesn't expire."><Input type="date" value={f.expiryDate} onChange={(e) => set({ expiryDate: e.target.value })} /></Field>
      </div>

      <div className="mt-4 grid gap-4 border-t-2 border-ink pt-4 lg:grid-cols-[1fr_1fr_1.2fr]">
        <div>
          <div className="mb-1 flex items-center justify-between gap-2">
            <span className="text-sm font-bold">Cost per unit</span>
            <span className="flex border-2 border-ink" role="group" aria-label="Cost entered">
              {(["ex", "incl"] as const).map((b) => (
                <button key={b} type="button" aria-pressed={costBasis === b} onClick={() => {
                  // Switch the entered figure so the cost stays the same.
                  if (ex !== null && incl !== null) setCost(String(b === "ex" ? ex : incl));
                  setCostBasis(b);
                }} className={`px-2 py-1 font-mono text-[0.68rem] font-bold uppercase ${costBasis === b ? "bg-ink text-lime" : "hover:bg-lime"}`}>
                  {b === "ex" ? "Ex VAT" : "Incl VAT"}
                </button>
              ))}
            </span>
          </div>
          <Input type="number" min={0} step="0.01" inputMode="decimal" value={cost} onChange={(e) => setCost(e.target.value)} aria-label={`Cost per unit ${costBasis === "ex" ? "excluding" : "including"} VAT`} />
          <p className="num mt-1 text-xs text-ink-soft">
            {ex === null ? "Enter ex or incl VAT; the other is worked out at 15%." : `Ex VAT ${formatPrice(ex)} · Incl VAT ${formatPrice(incl!)}`}
          </p>
          <p className="mt-1 text-xs text-muted">{vatRegistered ? "VAT-registered: the ex-VAT cost counts." : "Not VAT-registered: the incl-VAT cost is your real cost."}</p>
        </div>
        <div>
          <Field label="Selling price per unit (R)" hint={item?.retail ? `Website price now ${formatPrice(item.retail)}.` : "Set the price you'll sell at."}>
            <Input type="number" min={0} step="0.01" inputMode="decimal" value={sell} onChange={(e) => setSell(e.target.value)} />
          </Field>
        </div>
        <div className={`border-2 p-3 ${check?.under ? "border-flare bg-flare/10" : "border-ink bg-paper-2"}`} aria-live="polite">
          {check === null ? <p className="text-sm text-ink-soft">Enter cost and selling price to see the profit.</p> : check.under ? (
            <p role="alert" className="font-bold text-flare">Price under cost: you lose {formatPrice(-check.profit)} on every unit.</p>
          ) : (
            <p className="num text-sm"><strong className="font-display text-2xl">{formatPrice(check.profit)}</strong> profit per unit · {check.margin}% margin
              {qty > 0 && <span className="block text-ink-soft">{formatPrice(cents(check.profit * qty))} on this delivery of {qty}</span>}</p>
          )}
        </div>
      </div>

      <div className="mt-4 flex flex-wrap items-center justify-between gap-3">
        <div className="flex flex-wrap gap-x-6 gap-y-2 text-sm">
          <label className="flex items-center gap-2"><input type="checkbox" checked={updateCost} onChange={(e) => setUpdateCost(e.target.checked)} className="h-5 w-5 accent-[var(--color-ink)]" /> Use this as the product&apos;s cost for profit</label>
          {admin?.role === "main" && (
            <label className="flex items-center gap-2"><input type="checkbox" checked={updatePrice} onChange={(e) => setUpdatePrice(e.target.checked)} className="h-5 w-5 accent-[var(--color-ink)]" /> Set the website price to this selling price</label>
          )}
        </div>
        <Button type="submit" tone="primary">Book in</Button>
      </div>
      <Field label="Notes" className="mt-3"><Textarea rows={2} value={f.notes} onChange={(e) => set({ notes: e.target.value })} /></Field>
    </form>
  );
}

/** Stock on hand per product with batches, warnings, value and the stock take. */
export function StockControl() {
  const bo = useBackoffice();
  const { data, today } = bo;
  const levels = useMemo(() => (data ? stockLevels(data, today) : []), [data, today]);
  const [counting, setCounting] = useState(false);
  if (!data) return null;
  const name = (sku: string) => { const i = data.catalogue.find((c) => c.sku === sku); return i ? `${i.productName} — ${i.size}` : sku; };
  const losses = stockLosses(data);
  const flagged = levels.filter((l) => l.warnings.length).length;

  return (
    <>
      <div className="mb-6 grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
        <StatTile label="Stock value" value={formatPrice(levels.reduce((n, l) => n + l.value, 0))} sub={data.settings.vatRegistered ? "At cost ex VAT" : "At cost incl VAT"} />
        <StatTile label="Units on hand" value={String(levels.reduce((n, l) => n + Math.max(0, l.onHand), 0))} />
        <StatTile label="Needs attention" value={String(flagged)} sub={flagged ? "Old, expiring or expired batches" : "No old or expiring stock"} />
        <StatTile label="Missing at stock take" value={formatPrice(losses.value)} sub={`${losses.units} unit${losses.units === 1 ? "" : "s"} short in total`} />
      </div>
      <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
        <h2 className="font-display text-xl">Stock on hand</h2>
        <Button tone={counting ? "ghost" : "dark"} onClick={() => setCounting((c) => !c)}>{counting ? "Close stock take" : "Start stock take"}</Button>
      </div>
      {counting && <StockTake levels={levels} name={name} onDone={() => setCounting(false)} />}
      {levels.length === 0 ? <Empty>No stock booked in yet. Use Stock book-in first.</Empty> : (
        <ul className="space-y-3">
          {levels.map((l) => (
            <li key={l.sku} className={`border-2 bg-panel ${l.warnings.some((w) => w === "expired") ? "border-flare" : "border-ink"}`}>
              <div className="grid gap-2 p-4 sm:grid-cols-[1fr_repeat(4,auto)] sm:items-center sm:gap-6">
                <span className="font-bold">{name(l.sku)}</span>
                <span className="num text-sm"><span className="block text-xs text-muted">On hand</span><strong className={`font-display text-2xl ${l.onHand < 0 ? "text-flare" : ""}`}>{l.onHand}</strong></span>
                <span className="num text-sm"><span className="block text-xs text-muted">In / sold</span>{l.bookedIn} / {l.sold}</span>
                <span className="num text-sm"><span className="block text-xs text-muted">Stock take</span>{l.adjusted === 0 ? "No difference" : <span className={l.adjusted < 0 ? "font-bold text-flare" : ""}>{l.adjusted > 0 ? "+" : ""}{l.adjusted}</span>}</span>
                <span className="num text-sm"><span className="block text-xs text-muted">Value</span>{formatPrice(l.value)}</span>
              </div>
              <table className="num w-full border-t border-line text-sm">
                <thead><tr className="text-left font-mono text-[0.68rem] uppercase tracking-wider text-muted"><th className="px-4 py-1.5">Batch</th><th className="px-2 py-1.5">In</th><th className="px-2 py-1.5">Expiry</th><th className="px-2 py-1.5 text-right">Left</th><th className="px-4 py-1.5">Check</th></tr></thead>
                <tbody>
                  {l.batches.map((b) => (
                    <tr key={b.id} className={`border-t border-line ${b.remaining <= 0 ? "text-muted" : ""}`}>
                      <td className="px-4 py-1.5 font-bold">{b.batchNumber || "—"}</td>
                      <td className="px-2 py-1.5 whitespace-nowrap">{shortDate(b.date)}</td>
                      <td className="px-2 py-1.5 whitespace-nowrap">{b.expiryDate ? shortDate(b.expiryDate) : "—"}</td>
                      <td className="px-2 py-1.5 text-right">{Math.max(0, b.remaining)} / {b.qty}</td>
                      <td className="px-4 py-1.5">
                        {b.warnings.map((w) => (
                          <span key={w} className={`mr-1 inline-block px-1.5 py-0.5 font-mono text-[0.62rem] font-bold uppercase ${w === "expired" ? "bg-flare text-paper" : "bg-[oklch(0.92_0.1_95)]"}`}>{WARNING_LABEL[w]}</span>
                        ))}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </li>
          ))}
        </ul>
      )}
      {data.stockCounts.length > 0 && (
        <Panel title="Stock take history" className="mt-6">
          <ul className="num divide-y divide-line text-sm">
            {[...data.stockCounts].sort((a, b) => b.date.localeCompare(a.date)).map((c) => (
              <li key={c.id} className="flex flex-wrap justify-between gap-2 py-2">
                <span>{shortDate(c.date)} · {name(c.sku)}{c.by ? ` · ${c.by}` : ""}{c.note ? ` · ${c.note}` : ""}</span>
                <span className={c.counted < c.expected ? "font-bold text-flare" : ""}>counted {c.counted} of {c.expected} ({c.counted - c.expected >= 0 ? "+" : ""}{c.counted - c.expected})</span>
              </li>
            ))}
          </ul>
        </Panel>
      )}
    </>
  );
}

function StockTake({ levels, name, onDone }: { levels: StockLevel[]; name: (sku: string) => string; onDone: () => void }) {
  const bo = useBackoffice();
  const [date, setDate] = useState(bo.today);
  const [counts, setCounts] = useState<Record<string, string>>({});
  const [note, setNote] = useState("");
  const entered = levels.filter((l) => counts[l.sku] !== undefined && counts[l.sku] !== "");

  function save() {
    if (!entered.length) return;
    bo.saveStockCount(entered.map((l) => ({ date, sku: l.sku, expected: l.onHand, counted: Math.max(0, Math.round(Number(counts[l.sku]))), note: note.trim() })));
    onDone();
  }

  return (
    <Panel title="Stock take" className="mb-6">
      <p className="mb-3 text-sm text-ink-soft">Count what is on the shelf and enter it. Differences are recorded, so missing or stolen stock shows straight away.</p>
      <div className="mb-3 grid gap-3 sm:grid-cols-[12rem_1fr]">
        <Field label="Count date"><Input type="date" value={date} onChange={(e) => setDate(e.target.value)} /></Field>
        <Field label="Note"><Input value={note} onChange={(e) => setNote(e.target.value)} placeholder="e.g. Month-end count" /></Field>
      </div>
      <table className="num w-full text-sm">
        <thead><tr className="border-b-2 border-ink text-left font-mono text-xs uppercase tracking-wider"><th className="py-2 pr-2">Product</th><th className="py-2 pr-2 text-right">System</th><th className="py-2 pr-2">Counted</th><th className="py-2 text-right">Difference</th></tr></thead>
        <tbody>
          {levels.map((l) => {
            const v = counts[l.sku];
            const diff = v === undefined || v === "" ? null : Math.round(Number(v)) - l.onHand;
            return (
              <tr key={l.sku} className="border-b border-line">
                <td className="py-2 pr-2">{name(l.sku)}</td>
                <td className="py-2 pr-2 text-right">{l.onHand}</td>
                <td className="py-2 pr-2"><Input type="number" min={0} step="1" inputMode="numeric" value={v ?? ""} onChange={(e) => setCounts({ ...counts, [l.sku]: e.target.value })} aria-label={`Counted ${name(l.sku)}`} className="!mt-0 w-24" /></td>
                <td className={`py-2 text-right font-bold ${diff !== null && diff < 0 ? "text-flare" : ""}`}>{diff === null ? "" : diff === 0 ? "OK" : `${diff > 0 ? "+" : ""}${diff}`}</td>
              </tr>
            );
          })}
        </tbody>
      </table>
      <div className="mt-3 flex justify-end gap-2">
        <Button onClick={onDone}>Cancel</Button>
        <Button tone="primary" onClick={save} disabled={!entered.length}>Save stock take ({entered.length})</Button>
      </div>
    </Panel>
  );
}

export { effectiveCost };
