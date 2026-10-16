"use client";

import Link from "next/link";
import { useMemo, useState } from "react";
import { useBackoffice } from "./BackofficeContext";
import { canCreateOrders, canEdit } from "@/lib/backoffice/roles";
import { pendingDelivery } from "@/lib/backoffice/calc";
import { ButtonLink, Empty, Input, PageTitle, Select, StatusBadge, shortDate } from "./ui";
import { balance, CHANNEL_LABEL, docTotal, invoiceStatus, quoteStatus } from "@/lib/backoffice/calc";
import type { Document } from "@/lib/backoffice/types";
import { formatPrice } from "@/lib/format";

export function DocumentsList({ kind }: { kind: Document["kind"] }) {
  const { data, today, admin } = useBackoffice();
  const editable = canEdit(admin?.role, kind === "quote" ? "quotes" : "invoices") || (kind === "invoice" && canCreateOrders(admin?.role));
  const [q, setQ] = useState("");
  const [status, setStatus] = useState("all");
  const [channel, setChannel] = useState("all");

  const rows = useMemo(() => {
    if (!data) return [];
    const term = q.trim().toLowerCase();
    return data.documents
      .filter((d) => d.kind === kind)
      .map((d) => {
        const client = data.clients.find((c) => c.id === d.clientId);
        const st = kind === "invoice" ? invoiceStatus(d, today) : quoteStatus(d, today);
        return { d, client, st };
      })
      .filter(({ d, client, st }) =>
        (status === "all" || (status === "pending-delivery" ? pendingDelivery(d) : st === status)) &&
        (channel === "all" || d.channel === channel) &&
        (!term || [d.number, d.reference, client?.name, client?.company].some((v) => v?.toLowerCase().includes(term))))
      .sort((a, b) => b.d.date.localeCompare(a.d.date) || b.d.number.localeCompare(a.d.number));
  }, [data, kind, q, status, channel, today]);

  if (!data) return null;
  const statuses = kind === "invoice" ? ["unpaid", "part-paid", "overdue", "paid", "cancelled"] : ["draft", "sent", "accepted", "declined", "invoiced", "expired"];
  const label = kind === "invoice" ? "Invoices" : "Quotes & pro formas";
  const owing = rows.reduce((n, r) => n + (kind === "invoice" ? Math.max(0, balance(r.d)) : 0), 0);

  return (
    <>
      <PageTitle
        title={label}
        sub={kind === "invoice" ? `${rows.length} shown · ${formatPrice(owing)} still owed` : `${rows.length} shown`}
        actions={<>
          {editable && kind === "invoice" && <ButtonLink href="/admin/document/?new=invoice&cash=1">Cash sale</ButtonLink>}
          {editable && kind === "quote" && <ButtonLink href="/admin/document/?new=proforma">New pro forma</ButtonLink>}
          {editable && <ButtonLink href={`/admin/document/?new=${kind}`} tone="primary">New {kind}</ButtonLink>}
        </>}
      />
      <div className="mb-4 grid gap-3 sm:grid-cols-[1fr_auto_auto]">
        <Input type="search" placeholder="Search number, client or reference" value={q} onChange={(e) => setQ(e.target.value)} aria-label={`Search ${label.toLowerCase()}`} className="!mt-0" />
        <Select aria-label="Status" value={status} onChange={(e) => setStatus(e.target.value)} className="!mt-0">
          <option value="all">All statuses</option>
          {kind === "invoice" && <option value="pending-delivery">Not delivered yet</option>}
          {statuses.map((s) => <option key={s} value={s}>{s.replace("-", " ").replace(/^./, (c) => c.toUpperCase())}</option>)}
        </Select>
        <Select aria-label="Channel" value={channel} onChange={(e) => setChannel(e.target.value)} className="!mt-0">
          <option value="all">All channels</option>
          {Object.entries(CHANNEL_LABEL).map(([k, v]) => <option key={k} value={k}>{v}</option>)}
        </Select>
      </div>

      {rows.length === 0 ? <Empty>No {label.toLowerCase()} match these filters.</Empty> : (
        <>
          {/* Desktop table */}
          <div className="hidden overflow-x-auto border-2 border-ink bg-panel md:block">
            <table className="num w-full text-sm">
              <thead className="bg-ink text-paper">
                <tr>
                  {["Number", "Client", "Date", "Channel", "Total", kind === "invoice" ? "Balance" : "Valid until", "Status"].map((h, i) => (
                    <th key={h} className={`px-3 py-2.5 font-mono text-xs uppercase tracking-wider ${i >= 4 && i <= 5 ? "text-right" : "text-left"}`}>{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {rows.map(({ d, client, st }) => (
                  <tr key={d.id} className="border-t border-line hover:bg-paper-2">
                    <td className="px-3 py-2.5"><Link href={`/admin/document/?id=${d.id}`} className="font-bold underline-offset-2 hover:underline">{d.number}</Link></td>
                    <td className="px-3 py-2.5">{d.cashName ? `${d.cashName} (cash)` : client ? client.company || client.name : "—"}</td>
                    <td className="px-3 py-2.5 whitespace-nowrap">{shortDate(d.date)}</td>
                    <td className="px-3 py-2.5">{CHANNEL_LABEL[d.channel]}</td>
                    <td className="px-3 py-2.5 text-right">{formatPrice(docTotal(d))}</td>
                    <td className="px-3 py-2.5 text-right">{kind === "invoice" ? formatPrice(balance(d)) : shortDate(d.dueDate)}</td>
                    <td className="px-3 py-2.5"><StatusBadge status={st} /></td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          {/* Phone cards */}
          <ul className="space-y-2 md:hidden">
            {rows.map(({ d, client, st }) => (
              <li key={d.id}>
                <Link href={`/admin/document/?id=${d.id}`} className="block border-2 border-ink bg-panel p-3">
                  <div className="flex items-start justify-between gap-3">
                    <span className="min-w-0">
                      <span className="block truncate font-bold">{d.cashName ? `${d.cashName} (cash)` : client ? client.company || client.name : "—"}</span>
                      <span className="font-mono text-xs text-muted">{d.number} · {shortDate(d.date)} · {CHANNEL_LABEL[d.channel]}</span>
                    </span>
                    <StatusBadge status={st} />
                  </div>
                  <div className="num mt-2 flex justify-between text-sm">
                    <span>Total <strong>{formatPrice(docTotal(d))}</strong></span>
                    {kind === "invoice" && <span>Owing <strong>{formatPrice(balance(d))}</strong></span>}
                  </div>
                </Link>
              </li>
            ))}
          </ul>
        </>
      )}
    </>
  );
}
