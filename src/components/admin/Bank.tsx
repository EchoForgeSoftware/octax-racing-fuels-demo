"use client";

import { useMemo, useState } from "react";
import { useBackoffice, type AllocationTarget, type ImportResult } from "./BackofficeContext";
import { Button, Empty, Field, Input, PageTitle, Select, StatTile, shortDate } from "./ui";
import { allocationLabel, bankSummary, sampleFnbCsv, suggestions } from "@/lib/backoffice/bank";
import { balance, supplierBalance } from "@/lib/backoffice/calc";
import type { BankTxn } from "@/lib/backoffice/types";
import { formatPrice } from "@/lib/format";
import { EXPENSE_LABEL } from "./Suppliers";

const OTHER: { value: string; label: string; money: "in" | "out" | "both" }[] = [
  { value: "other:income", label: "Other income", money: "in" },
  { value: "other:transfer", label: "Transfer between accounts", money: "both" },
  { value: "other:fees", label: "Bank fees", money: "out" },
  ...Object.entries(EXPENSE_LABEL).map(([k, v]) => ({ value: `other:${k}`, label: `Expense: ${v}`, money: "out" as const })),
];

export function BankAdmin() {
  const bo = useBackoffice();
  const { data, today, mode } = bo;
  const [result, setResult] = useState<(ImportResult & { file: string }) | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [filter, setFilter] = useState<"open" | "done" | "all">("open");

  const txns = useMemo(() => {
    if (!data) return [];
    return data.bank
      .filter((t) => filter === "all" || (filter === "open" ? !t.allocation : !!t.allocation))
      .sort((a, b) => b.date.localeCompare(a.date));
  }, [data, filter]);

  if (!data) return null;
  const sum = bankSummary(data.bank);

  function load(file: string, text: string) {
    setError(null);
    const r = bo.importBank(file, text);
    if (r.added === 0 && r.duplicates === 0) setError("No transactions found. Use the CSV download from FNB online banking (not the PDF statement).");
    setResult({ ...r, file });
  }

  return (
    <>
      <PageTitle
        title="Bank"
        sub="Import FNB statements. Payments that quote an invoice number (EFT, cash deposit or Ozow) or a website order reference are allocated to that invoice automatically; the rest wait here for you."
      />

      <div className="mb-6 grid gap-4 lg:grid-cols-[1fr_20rem]">
        <section className="border-2 border-ink bg-panel p-4" aria-labelledby="import">
          <h2 id="import" className="font-display text-lg">Import a statement</h2>
          <Field label="FNB statement (CSV)" hint="FNB Online Banking → Accounts → Transaction History → pick the dates → Download → CSV. Importing the same lines twice is safe; repeats are skipped.">
            <Input type="file" accept=".csv,text/csv" onChange={async (e) => {
              const f = e.target.files?.[0];
              if (!f) return;
              if (f.size > 2 * 1024 * 1024) return setError("That file is too large for a statement CSV.");
              load(f.name, await f.text());
              e.target.value = "";
            }} />
          </Field>
          {mode === "demo" && (
            <Button className="mt-3" onClick={() => load("Sample FNB statement.csv", sampleFnbCsv(data, today))}>Try a sample FNB statement</Button>
          )}
          {error && <p role="alert" className="mt-3 border-2 border-flare p-3 text-sm">{error}</p>}
          {result && !error && (
            <p role="status" className="mt-3 border-2 border-ink bg-lime p-3 text-sm">
              <strong>{result.file}:</strong> {result.added} new line{result.added === 1 ? "" : "s"}, {result.auto} allocated automatically
              {result.duplicates ? `, ${result.duplicates} already imported` : ""}{result.skipped ? `, ${result.skipped} unreadable` : ""}.
            </p>
          )}
        </section>
        <div className="grid grid-cols-2 gap-3">
          <StatTile label="Money in" value={formatPrice(sum.in)} />
          <StatTile label="Money out" value={formatPrice(sum.out)} />
          <StatTile label="To allocate" value={String(sum.unallocated)} sub={sum.unallocated ? "Lines waiting for you" : "All lines allocated"} />
          <StatTile label="Bank balance" value={sum.closing === null ? "—" : formatPrice(sum.closing)} sub="From the latest line" />
        </div>
      </div>

      <div className="mb-3 flex flex-wrap items-end justify-between gap-3">
        <h2 className="font-display text-xl">Statement lines</h2>
        <div className="flex border-2 border-ink" role="group" aria-label="Show">
          {([["open", "To allocate"], ["done", "Allocated"], ["all", "All"]] as const).map(([k, label]) => (
            <button key={k} type="button" aria-pressed={filter === k} onClick={() => setFilter(k)}
              className={`px-3 py-2 font-mono text-xs font-bold uppercase tracking-wider ${filter === k ? "bg-ink text-lime" : "hover:bg-lime"}`}>{label}</button>
          ))}
        </div>
      </div>
      {txns.length === 0 ? (
        <Empty>{data.bank.length === 0 ? "No statements imported yet." : filter === "open" ? "Everything is allocated." : "No lines to show."}</Empty>
      ) : (
        <ul className="divide-y divide-line border-2 border-ink bg-panel">
          {txns.map((t) => <TxnRow key={t.id} txn={t} />)}
        </ul>
      )}
    </>
  );
}

function TxnRow({ txn }: { txn: BankTxn }) {
  const bo = useBackoffice();
  const data = bo.data!;
  const [choice, setChoice] = useState("");
  const isIn = txn.amount > 0;
  const suggested = suggestions(txn, data);
  const suggestedIds = new Set(suggested.map((s) => s.id));
  const clientName = (id: string) => { const c = data.clients.find((x) => x.id === id); return c ? c.company || c.name : "Client"; };
  const supplierName = (id: string) => data.suppliers.find((x) => x.id === id)?.name ?? "Supplier";

  const openInvoices = data.documents.filter((d) => d.kind === "invoice" && !d.cancelled && balance(d) > 0.004 && txn.amount <= balance(d) + 0.004 && !suggestedIds.has(d.id));
  const openBills = data.supplierInvoices.filter((i) => supplierBalance(i) > 0.004 && -txn.amount <= supplierBalance(i) + 0.004 && !suggestedIds.has(i.id));

  function allocate() {
    if (!choice) return;
    const [kind, id] = choice.split(":");
    const target: AllocationTarget = kind === "invoice" ? { kind: "invoice", docId: id, method: /ozow/i.test(txn.description) ? "ozow" : /cash/i.test(txn.description) ? "cash" : "eft" }
      : kind === "supplier" ? { kind: "supplier", invoiceId: id }
      : { kind: "other", category: id as Extract<AllocationTarget, { kind: "other" }>["category"], note: "" };
    bo.allocateTxn(txn.id, target);
    setChoice("");
  }

  return (
    <li className="grid gap-3 p-4 md:grid-cols-[6.5rem_1fr_8rem_minmax(14rem,22rem)] md:items-center">
      <span className="num font-mono text-xs uppercase text-muted">{shortDate(txn.date)}</span>
      <span className="min-w-0 break-words text-sm">{txn.description || "(no description)"}</span>
      <span className={`num font-bold md:text-right ${isIn ? "" : "text-flare"}`}>{isIn ? "+" : "−"}{formatPrice(Math.abs(txn.amount))}</span>
      {txn.allocation ? (
        <span className="flex flex-wrap items-center gap-2 text-sm md:justify-end">
          <span className="bg-lime px-2 py-0.5 font-mono text-[0.68rem] font-bold uppercase tracking-wider">{txn.allocation.auto ? "Auto" : "Allocated"}</span>
          <span>{allocationLabel(txn.allocation, data)}</span>
          <button type="button" onClick={() => bo.unallocateTxn(txn.id)} className="font-mono text-xs uppercase tracking-wider text-muted underline hover:text-flare">Undo</button>
        </span>
      ) : (
        <span className="flex gap-2">
          <Select aria-label={`Allocate ${txn.description}`} value={choice} onChange={(e) => setChoice(e.target.value)} className="!mt-0 min-w-0 flex-1">
            <option value="">Allocate to…</option>
            {suggested.length > 0 && (
              <optgroup label="Exact amount owing">
                {isIn
                  ? data.documents.filter((d) => suggestedIds.has(d.id)).map((d) => <option key={d.id} value={`invoice:${d.id}`}>{d.number} · {clientName(d.clientId)}</option>)
                  : data.supplierInvoices.filter((i) => suggestedIds.has(i.id)).map((i) => <option key={i.id} value={`supplier:${i.id}`}>{supplierName(i.supplierId)} · {i.number}</option>)}
              </optgroup>
            )}
            {isIn && openInvoices.length > 0 && (
              <optgroup label="Open invoices">
                {openInvoices.map((d) => <option key={d.id} value={`invoice:${d.id}`}>{d.number} · {clientName(d.clientId)} · owes {formatPrice(balance(d))}</option>)}
              </optgroup>
            )}
            {!isIn && openBills.length > 0 && (
              <optgroup label="Supplier invoices">
                {openBills.map((i) => <option key={i.id} value={`supplier:${i.id}`}>{supplierName(i.supplierId)} · {i.number} · {formatPrice(supplierBalance(i))}</option>)}
              </optgroup>
            )}
            <optgroup label="Other">
              {OTHER.filter((o) => o.money === "both" || (o.money === "in") === isIn).map((o) => <option key={o.value} value={o.value}>{o.label}</option>)}
            </optgroup>
          </Select>
          <Button tone="dark" onClick={allocate} disabled={!choice}>Allocate</Button>
        </span>
      )}
    </li>
  );
}
