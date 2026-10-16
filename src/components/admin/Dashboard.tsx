"use client";

import Link from "next/link";
import { useMemo, useState } from "react";
import { useBackoffice } from "./BackofficeContext";
import { ButtonLink, PageTitle, Panel, Select, StatTile, StatusBadge, shortDate } from "./ui";
import { CHANNEL_COLOR, SalesChart } from "./SalesChart";
import { breakdown, dashboard, docTotal, invoiceStatus, pendingOrders, type Period } from "@/lib/backoffice/calc";
import { DELIVERY_LABEL } from "@/lib/courier";
import { formatPrice } from "@/lib/format";
import { canSeeProfit, canEdit, canCreateOrders } from "@/lib/backoffice/roles";

const PERIODS: { id: Period; label: string }[] = [
  { id: "month", label: "This month" },
  { id: "30d", label: "Last 30 days" },
  { id: "year", label: "This year" },
  { id: "all", label: "All time" },
];

export function AdminDashboard() {
  const { data, today, admin } = useBackoffice();
  const profitVisible = canSeeProfit(admin?.role);
  const [period, setPeriod] = useState<Period>("year");
  const d = useMemo(() => (data ? dashboard(data, period, today) : null), [data, period, today]);
  const b = useMemo(() => (data ? breakdown(data, period, today) : null), [data, period, today]);
  if (!data || !d || !b) return null;
  const isRep = admin?.role === "rep";
  const share = (v: number) => (d.turnover > 0 ? `${Math.round((v / d.turnover) * 100)}% of turnover` : "No sales yet");
  const recent = [...data.documents].filter((x) => x.kind === "invoice").sort((a, b) => b.date.localeCompare(a.date) || b.number.localeCompare(a.number)).slice(0, 6);
  const clientName = (id: string) => { const c = data.clients.find((x) => x.id === id); return c ? c.company || c.name : "Unknown client"; };
  const docName = (doc: (typeof data.documents)[number]) => (doc.cashName ? `${doc.cashName} (cash)` : clientName(doc.clientId));

  return (
    <>
      <PageTitle
        title={isRep ? `${admin?.name ?? "Rep"}: your figures` : "Dashboard"}
        sub={profitVisible ? "Invoiced sales and gross profit on goods. Courier counts in turnover, and is excluded from goods margin." : "Sales and outstanding balances for your assigned customers."}
        actions={!canEdit(admin?.role, "invoices") && canCreateOrders(admin?.role) ? (
          <ButtonLink href="/admin/document/?new=invoice" tone="primary">New order</ButtonLink>
        ) : canEdit(admin?.role, "invoices") ? <>
          <ButtonLink href="/admin/document/?new=invoice&cash=1" tone="ghost">Cash sale</ButtonLink>
          <ButtonLink href="/admin/document/?new=quote" tone="dark">New quote</ButtonLink>
          <ButtonLink href="/admin/document/?new=invoice" tone="primary">New invoice</ButtonLink>
        </> : undefined}
      />

      <div className="mb-4 flex items-center gap-3">
        <label htmlFor="period" className="kicker text-ink-soft">Period</label>
        <Select id="period" value={period} onChange={(e) => setPeriod(e.target.value as Period)} className="!mt-0 w-auto">
          {PERIODS.map((p) => <option key={p.id} value={p.id}>{p.label}</option>)}
        </Select>
      </div>

      <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
        <div className="sm:col-span-2"><StatTile hero label="Total turnover" value={formatPrice(d.turnover)} sub={`${d.invoices} invoice${d.invoices === 1 ? "" : "s"} · incl. courier`} /></div>
        {profitVisible && <StatTile label="Gross profit on goods" value={formatPrice(d.profit)} sub={`${d.margin}% margin · excludes overheads and courier costs`} />}
        <StatTile label="Owed to you" value={formatPrice(d.outstanding)} sub={`Collected this period: ${formatPrice(d.collected)}`} />
        <StatTile label="Website sales" value={formatPrice(d.byChannel.website)} sub={share(d.byChannel.website)} accent={CHANNEL_COLOR.website} />
        <StatTile label="Private sales" value={formatPrice(d.byChannel.private)} sub={`Key customers ${formatPrice(b.keyPrivate)} · cash ${formatPrice(b.cash.total)}${b.bulk ? ` · bulk ${formatPrice(b.bulk)}` : ""}`} accent={CHANNEL_COLOR.private} />
        <StatTile label="Agent sales" value={formatPrice(d.byChannel.agent)} sub={share(d.byChannel.agent)} accent={CHANNEL_COLOR.agent} />
        <StatTile label="Open quotes" value={String(d.openQuotes)} sub="Draft or sent, not yet answered" />
      </div>

      {profitVisible && <><h2 className="mb-3 mt-6 font-display text-xl">Money out</h2>
      <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
        <StatTile label="Supplier invoices" value={formatPrice(d.expenses)} sub="Loaded on the Suppliers page, this period" />
        <div className="sm:col-span-2"><StatTile label="Invoiced sales less supplier bills" value={formatPrice(d.afterExpenses)} sub="Comparison of invoices and bills, not cash flow or accounting profit" /></div>
        <StatTile label="Owed to suppliers" value={formatPrice(d.owedToSuppliers)} sub={<Link href="/admin/suppliers/" className="underline">Open suppliers</Link>} />
      </div></>}

      <PendingOrders docs={data.documents} name={docName} today={today} />

      <div className="mt-6 grid gap-6 lg:grid-cols-2 xl:grid-cols-3">
        {!isRep && (
          <Panel title="Sales by rep" action={<Link href="/admin/clients/" className="font-mono text-xs font-bold uppercase tracking-wider underline hover:text-flare">Allocate clients</Link>}>
            {b.byRep.length === 0 ? <p className="text-sm text-ink-soft">No reps yet. Add reps under Settings, then pick a rep on each client.</p> : (
              <table className="num w-full text-sm">
                <thead><tr className="border-b-2 border-ink text-left font-mono text-xs uppercase tracking-wider"><th className="py-2 pr-2">Rep</th><th className="py-2 pr-2 text-right">Clients</th><th className="py-2 pr-2 text-right">Sales</th><th className="py-2 text-right">Owing</th></tr></thead>
                <tbody>
                  {b.byRep.map((r) => (
                    <tr key={r.repId ?? "none"} className="border-b border-line">
                      <td className={`py-2 pr-2 ${r.repId ? "font-bold" : "text-muted"}`}>{r.name}</td>
                      <td className="py-2 pr-2 text-right">{r.clients}</td>
                      <td className="py-2 pr-2 text-right font-bold">{formatPrice(r.turnover)}</td>
                      <td className={`py-2 text-right ${r.owing > 0 ? "text-flare" : ""}`}>{formatPrice(r.owing)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </Panel>
        )}
        <Panel title="Agents">
          {b.agents.length === 0 ? <p className="text-sm text-ink-soft">No agents yet. Open a client and press <strong>Agent</strong>.</p> : (
            <ul className="divide-y divide-line">
              {b.agents.map((a) => (
                <li key={a.client.id}>
                  <Link href={`/admin/client/?id=${a.client.id}`} className="flex items-center justify-between gap-3 py-2 hover:bg-paper-2">
                    <span className="min-w-0 truncate font-bold">{a.client.company || a.client.name}</span>
                    <span className="num shrink-0 text-right text-sm"><strong>{formatPrice(a.spent)}</strong>{a.owing > 0 && <span className="block text-xs text-flare">owes {formatPrice(a.owing)}</span>}</span>
                  </Link>
                </li>
              ))}
            </ul>
          )}
        </Panel>
        <Panel title={`Cash sales · ${formatPrice(b.cash.total)}`}>
          {b.cash.sales.length === 0 ? <p className="text-sm text-ink-soft">No cash sales in this period.</p> : (
            <ul className="divide-y divide-line">
              {b.cash.sales.slice(0, 8).map((s) => (
                <li key={s.doc.id}>
                  <Link href={`/admin/document/?id=${s.doc.id}`} className="grid grid-cols-[1fr_auto] gap-x-3 py-2 hover:bg-paper-2">
                    <span className="truncate font-bold">{s.name}</span>
                    <span className="num font-bold">{formatPrice(s.total)}</span>
                    <span className="font-mono text-xs text-muted">{s.doc.number} · {shortDate(s.doc.date)}</span>
                  </Link>
                </li>
              ))}
            </ul>
          )}
        </Panel>
      </div>

      <div className="mt-6 grid gap-6 xl:grid-cols-[1.4fr_1fr]">
        <Panel title="Turnover by channel, last 6 months">
          <SalesChart months={d.months} />
        </Panel>
        <Panel title="Recent invoices" action={<Link href="/admin/invoices/" className="font-mono text-xs font-bold uppercase tracking-wider underline hover:text-flare">All invoices</Link>}>
          <ul className="divide-y divide-line">
            {recent.map((doc) => (
              <li key={doc.id}>
                <Link href={`/admin/document/?id=${doc.id}`} className="flex items-center justify-between gap-3 py-2.5 hover:bg-paper-2">
                  <span className="min-w-0">
                    <span className="block truncate font-bold">{docName(doc)}</span>
                    <span className="font-mono text-xs text-muted">{doc.number} · {shortDate(doc.date)}</span>
                  </span>
                  <span className="shrink-0 text-right">
                    <span className="num block font-bold">{formatPrice(docTotal(doc))}</span>
                    <StatusBadge status={invoiceStatus(doc, today)} />
                  </span>
                </Link>
              </li>
            ))}
          </ul>
        </Panel>
      </div>
    </>
  );
}

/** Orders sold but not yet delivered and signed for, oldest first, so no sold stock goes untracked. */
function PendingOrders({ docs, name, today }: { docs: Parameters<typeof pendingOrders>[0]; name: (d: Parameters<typeof pendingOrders>[0][number]) => string; today: string }) {
  const pending = pendingOrders(docs);
  const age = (date: string) => Math.max(0, Math.round((Date.parse(today) - Date.parse(date)) / 86_400_000));
  return (
    <section aria-labelledby="pending-orders" className="mt-6 border-2 border-ink bg-panel">
      <div className="flex flex-wrap items-center justify-between gap-3 border-b-2 border-ink bg-lime px-4 py-3">
        <h2 id="pending-orders" className="font-display text-lg">Pending orders · {pending.length} not delivered</h2>
        <Link href="/admin/invoices/" className="font-mono text-xs font-bold uppercase tracking-wider underline hover:text-flare">All invoices</Link>
      </div>
      {pending.length === 0 ? <p className="p-4 text-sm text-ink-soft">Every order has been delivered and signed for.</p> : (
        <ul className="divide-y divide-line">
          {pending.map((d) => (
            <li key={d.id}>
              <Link href={`/admin/document/?id=${d.id}`} className="grid gap-x-4 gap-y-1 px-4 py-3 hover:bg-paper-2 sm:grid-cols-[1fr_auto] sm:items-center">
                <span className="min-w-0">
                  <span className="font-bold">{name(d)}</span> <span className="font-mono text-xs text-muted">{d.number}</span>
                  <span className="block text-xs text-ink-soft">
                    {d.delivery ? DELIVERY_LABEL[d.delivery.method] : "Delivery"} · {d.channel === "website" ? "Website order" : d.createdBy ? `Taken by ${d.createdBy}` : "Private sale"} · {shortDate(d.date)}
                  </span>
                </span>
                <span className="num flex items-center gap-3 text-sm sm:justify-end">
                  <strong>{formatPrice(docTotal(d))}</strong>
                  <span className={`px-2 py-0.5 font-mono text-[0.68rem] font-bold uppercase tracking-wider ${age(d.date) > 3 ? "bg-flare text-paper" : "bg-paper-2"}`}>
                    {age(d.date) === 0 ? "Today" : `${age(d.date)} day${age(d.date) === 1 ? "" : "s"}`}
                  </span>
                </span>
              </Link>
            </li>
          ))}
        </ul>
      )}
    </section>
  );
}
