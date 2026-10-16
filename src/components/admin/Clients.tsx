"use client";

import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { useEffect, useMemo, useState } from "react";
import { useBackoffice } from "./BackofficeContext";
import { canCreateOrders, canEdit, canView } from "@/lib/backoffice/roles";
import { ClientAccount } from "./ClientAccount";
import { Button, ButtonLink, Empty, Field, Input, PageTitle, Panel, Select, StatTile, StatusBadge, Textarea, shortDate } from "./ui";
import { addDays, balance, CLIENT_TYPE_LABEL, clientSummary, defaultsFor, docTotal, invoiceStatus, priceFor, quoteStatus, statement } from "@/lib/backoffice/calc";
import type { Client, ClientType, PriceTier } from "@/lib/backoffice/types";
import { formatPrice } from "@/lib/format";
import { vatError } from "@/lib/vat";

const TYPES = Object.keys(CLIENT_TYPE_LABEL) as ClientType[];

export function ClientsList() {
  const { data, admin } = useBackoffice();
  const [q, setQ] = useState("");
  const [type, setType] = useState<ClientType | "all">("all");
  const [rep, setRep] = useState("all");
  const rows = useMemo(() => {
    if (!data) return [];
    const term = q.trim().toLowerCase();
    return data.clients
      .filter((c) => rep === "all" || (rep === "none" ? !c.repId : c.repId === rep))
      .filter((c) => (type === "all" || c.type === type) && (!term || [c.name, c.company, c.email, c.phone, c.city].some((v) => v.toLowerCase().includes(term))))
      .map((c) => ({ c, s: clientSummary(c.id, data.documents) }))
      .sort((a, b) => b.s.spent - a.s.spent);
  }, [data, q, type, rep]);
  if (!data) return null;
  const repName = (id?: string | null) => data.reps.find((r) => r.id === id)?.name;

  return (
    <>
      <PageTitle title="Clients" sub="Agents, bulk buyers, private and cash customers, and website customers." actions={canEdit(admin?.role, "clients") ? <ButtonLink tone="primary" href="/admin/client/?new=1">Add client</ButtonLink> : undefined} />
      <div className="mb-4 grid gap-3 sm:grid-cols-[1fr_auto]">
        <div className="flex gap-2">
          <Input type="search" placeholder="Search name, company, email, phone or town" value={q} onChange={(e) => setQ(e.target.value)} aria-label="Search clients" className="!mt-0 min-w-0 flex-1" />
          {admin?.role !== "rep" && data.reps.length > 0 && (
            <Select aria-label="Rep" value={rep} onChange={(e) => setRep(e.target.value)} className="!mt-0 w-auto">
              <option value="all">All reps</option>
              {data.reps.map((r) => <option key={r.id} value={r.id}>{r.name}</option>)}
              <option value="none">No rep</option>
            </Select>
          )}
        </div>
        <div className="flex flex-wrap gap-1" role="group" aria-label="Client type">
          {(["all", ...TYPES] as const).map((t) => (
            <button key={t} type="button" aria-pressed={type === t} onClick={() => setType(t)}
              className={`min-h-10 border-2 border-ink px-3 font-mono text-xs font-bold uppercase tracking-wider ${type === t ? "bg-ink text-lime" : "hover:bg-lime"}`}>
              {t === "all" ? "All" : CLIENT_TYPE_LABEL[t]}
            </button>
          ))}
        </div>
      </div>
      {rows.length === 0 ? <Empty>No clients match.</Empty> : (
        <ul className="grid gap-3 md:grid-cols-2 xl:grid-cols-3">
          {rows.map(({ c, s }) => (
            <li key={c.id}>
              <Link href={`/admin/client/?id=${c.id}`} className="block h-full border-2 border-ink bg-panel p-4 transition-colors hover:bg-paper-2">
                <div className="flex items-start justify-between gap-3">
                  <span className="min-w-0">
                    <span className="block truncate font-display text-lg leading-tight">{c.company || c.name}</span>
                    {c.company && <span className="block truncate text-sm text-ink-soft">{c.name}</span>}
                  </span>
                  <span className="shrink-0 bg-ink px-2 py-0.5 font-mono text-[0.65rem] font-bold uppercase tracking-wider text-lime">{CLIENT_TYPE_LABEL[c.type]}</span>
                </div>
                <dl className="num mt-4 grid grid-cols-2 gap-2 text-sm">
                  <div><dt className="text-xs text-muted">Total spent</dt><dd className="font-bold">{formatPrice(s.spent)}</dd></div>
                  <div><dt className="text-xs text-muted">Owing</dt><dd className={`font-bold ${s.outstanding > 0 ? "text-flare" : ""}`}>{formatPrice(s.outstanding)}</dd></div>
                </dl>
                <p className="mt-2 text-xs text-muted">
                  {c.type === "private" && <strong className="text-ink">{c.cash ? "Cash · " : "Key customer · "}</strong>}
                  {repName(c.repId) ? `Rep: ${repName(c.repId)} · ` : ""}{s.invoices} invoices · {s.quotes} quotes{s.lastActivity ? ` · last ${shortDate(s.lastActivity)}` : ""}
                </p>
              </Link>
            </li>
          ))}
        </ul>
      )}
    </>
  );
}

export function ClientDetail() {
  const params = useSearchParams();
  const router = useRouter();
  const bo = useBackoffice();
  const { data, today } = bo;
  const id = params.get("id");
  const isNew = params.get("new") === "1";
  const stored = data?.clients.find((c) => c.id === id) ?? null;
  const [client, setClient] = useState<Client | null>(null);
  const [tab, setTab] = useState<"history" | "statement" | "pricing" | "account">("history");
  const role = bo.admin?.role;
  const editable = canEdit(role, "clients");
  const [errors, setErrors] = useState<string[]>([]);
  const [notice, setNotice] = useState<string | null>(null);
  const [from, setFrom] = useState(() => addDays(today, -90));
  const [to, setTo] = useState(today);

  useEffect(() => {
    if (!data || client) return;
    if (stored) setClient(structuredClone(stored));
    else if (isNew) setClient(bo.newClient("private"));
  }, [data, stored, isNew, client, bo]);

  if (!data) return null;
  if (isNew && !editable) return <Empty>Adding clients isn&apos;t part of your access. <Link className="underline" href="/admin/clients/">Back to clients</Link></Empty>;
  if (!client) return <Empty>Client not found. <Link className="underline" href="/admin/clients/">Back to clients</Link></Empty>;

  const saved = !!stored;
  const summary = clientSummary(client.id, data.documents);
  const docs = data.documents.filter((d) => d.clientId === client.id && canView(role, d.kind === "quote" ? "quotes" : "invoices")).sort((a, b) => b.date.localeCompare(a.date));
  const set = (patch: Partial<Client>) => setClient({ ...client, ...patch });

  /** Button changes (agent, cash, rep) save straight away. */
  function quick(patch: Partial<Client>) {
    setClient({ ...client!, ...patch });
    bo.patchClient(client!.id, patch);
    setNotice(patch.repId !== undefined ? (patch.repId ? `Allocated to ${data!.reps.find((r) => r.id === patch.repId)?.name}.` : "Removed from rep.") : "Saved.");
  }

  function save() {
    const e: string[] = [];
    if (!client!.name.trim() && !client!.company.trim()) e.push("Enter a name or company.");
    if (client!.email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(client!.email)) e.push("Check the email address.");
    const vat = vatError(client!.vat);
    if (vat) e.push(vat);
    setErrors(e);
    if (e.length) return;
    const result = bo.saveClient({ ...client!, vat: client!.vat.replace(/[\s-]/g, ""), linkedEmail: client!.linkedEmail.trim().toLowerCase() });
    setNotice("Client saved.");
    if (!saved) router.replace(`/admin/client/?id=${result.id}`);
  }

  async function statementPdf() {
    const lib = await import("@/lib/backoffice/pdf");
    const bytes = await lib.statementPdf(client!, data!.documents, data!.settings, from, to);
    lib.downloadPdf(bytes, `Statement-${(client!.company || client!.name).replace(/[^a-z0-9]+/gi, "-")}-${to}.pdf`);
  }

  const st = statement(client.id, data.documents, from, to);

  return (
    <>
      <div className="mb-6">
        <Link href="/admin/clients/" className="font-mono text-xs uppercase tracking-wider text-muted hover:text-ink">← Clients</Link>
        <h1 className="mt-2 font-display text-[clamp(1.8rem,5vw,2.6rem)] leading-none">{saved ? client.company || client.name : "New client"}</h1>
        {saved && editable && (
          <div className="mt-4 flex flex-wrap items-end gap-2">
            <QuickToggle on={client.type === "agent"} label="Agent" hint="Shows on the dashboard under Agents with what they spend"
              onClick={() => {
                const toAgent = client.type !== "agent";
                quick(toAgent ? { type: "agent", tier: "agent", cash: false } : { type: "private", tier: "retail", cash: false });
                // Straight to the agent's custom pricing table.
                if (toAgent) setTab("pricing");
              }} />
            {client.type === "private" && <>
              <QuickToggle on={!!client.cash} label="Cash" hint="Cash customer: sales list on the private cash account with name, invoice number and amount" onClick={() => quick({ cash: true })} />
              <QuickToggle on={!client.cash} label="Key customer" hint="Shows as a normal private sale" onClick={() => quick({ cash: false })} />
            </>}
            {data.reps.length > 0 && (
              <label className="ml-auto flex items-center gap-2 text-sm">
                <span className="font-mono text-xs font-bold uppercase tracking-wider">Rep</span>
                <Select value={client.repId ?? ""} onChange={(e) => quick({ repId: e.target.value || null })} className="!mt-0 w-auto">
                  <option value="">No rep</option>
                  {data.reps.filter((r) => r.active || r.id === client.repId).map((r) => <option key={r.id} value={r.id}>{r.name}</option>)}
                </Select>
              </label>
            )}
          </div>
        )}
        {saved && !editable && data.reps.find((r) => r.id === client.repId) && <p className="mt-2 text-sm text-ink-soft">Rep: {data.reps.find((r) => r.id === client.repId)!.name}</p>}
      </div>
      {notice && <p role="status" className="mb-4 border-2 border-ink bg-lime p-3 text-sm">{notice}</p>}
      {errors.length > 0 && <ul role="alert" className="mb-4 list-inside list-disc border-2 border-flare p-3 text-sm">{errors.map((x) => <li key={x}>{x}</li>)}</ul>}

      {saved && (
        <div className="mb-6 grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
          <StatTile label="Total spent" value={formatPrice(summary.spent)} sub="All invoices, incl. courier" />
          <StatTile label="Owing" value={formatPrice(summary.outstanding)} sub={summary.outstanding > 0 ? "Unpaid invoice balances" : "Fully paid up"} />
          <StatTile label="Invoices" value={String(summary.invoices)} sub={summary.lastActivity ? `Last activity ${shortDate(summary.lastActivity)}` : "No activity yet"} />
          <StatTile label="Quotes" value={String(summary.quotes)} />
        </div>
      )}

      {saved && editable && <Panel title="Customer allocation" className="mb-6">
        <div className="grid gap-4 sm:grid-cols-2">
          <Field label="Assigned sales rep"><Select value={client.repId ?? ""} onChange={e => { const patch={repId:e.target.value || null}; set(patch); bo.patchClient(client.id,patch); setNotice("Rep assignment saved."); }}><option value="">No rep assigned</option>{data.reps.filter(r=>r.active || r.id===client.repId).map(r=><option key={r.id} value={r.id}>{r.name}{r.active?"":" (inactive)"}</option>)}</Select></Field>
          <div><p className="kicker mb-2">Account type</p><div className="flex flex-wrap gap-2">
            {([{label:"Agent",type:"agent",cash:false},{label:"Cash customer",type:"private",cash:true},{label:"Key customer",type:"private",cash:false}] as const).map(option=><Button key={option.label} tone={client.type===option.type && Boolean(client.cash)===option.cash?"dark":"ghost"} onClick={()=>{const patch={type:option.type,cash:option.cash,tier:defaultsFor(option.type).tier};set(patch);bo.patchClient(client.id,patch);setNotice("Customer type and default price list saved.");}}>{option.label}</Button>)}
          </div></div>
        </div>
      </Panel>}

      <div className="grid gap-6 xl:grid-cols-[22rem_1fr]">
        <Panel title="Details">
          <fieldset disabled={!editable} className="space-y-3">
            <Field label="Client type">
              <Select value={client.type} onChange={(e) => { const type = e.target.value as ClientType; set({ type, tier: defaultsFor(type).tier }); }}>
                {TYPES.map((t) => <option key={t} value={t}>{CLIENT_TYPE_LABEL[t]}</option>)}
              </Select>
            </Field>
            <Field label="Contact name"><Input value={client.name} onChange={(e) => set({ name: e.target.value })} autoComplete="off" /></Field>
            <Field label="Company / shop"><Input value={client.company} onChange={(e) => set({ company: e.target.value })} autoComplete="off" /></Field>
            <Field label="Email"><Input type="email" value={client.email} onChange={(e) => set({ email: e.target.value })} autoComplete="off" /></Field>
            <Field label="Phone"><Input type="tel" value={client.phone} onChange={(e) => set({ phone: e.target.value })} autoComplete="off" /></Field>
            <Field label="VAT number" hint="Optional, 10 digits starting with 4."><Input inputMode="numeric" value={client.vat} onChange={(e) => set({ vat: e.target.value })} /></Field>
            <Field label="Address"><Input value={client.address} onChange={(e) => set({ address: e.target.value })} autoComplete="off" /></Field>
            <Field label="City / town"><Input value={client.city} onChange={(e) => set({ city: e.target.value })} autoComplete="off" /></Field>
            <Field label="Website login email" hint="When this customer signs in to the shop with this email, they see their prices.">
              <Input type="email" value={client.linkedEmail} onChange={(e) => set({ linkedEmail: e.target.value })} autoComplete="off" />
            </Field>
            <Field label="Notes (private)"><Textarea rows={3} value={client.notes} onChange={(e) => set({ notes: e.target.value })} /></Field>
            {editable && <Button tone="primary" className="w-full" onClick={save}>{saved ? "Save changes" : "Add client"}</Button>}
          </fieldset>
        </Panel>

        <div className="min-w-0">
          {!saved ? <Empty>Save the client to set prices and see quotes, invoices and statements.</Empty> : (
            <>
              {(canEdit(role, "invoices") || canEdit(role, "quotes")) && (
                <div className="mb-4 flex flex-wrap gap-2">
                  {canEdit(role, "invoices") && <ButtonLink tone="primary" href={`/admin/document/?new=invoice&client=${client.id}`}>New invoice</ButtonLink>}
                  {canEdit(role, "quotes") && <ButtonLink tone="dark" href={`/admin/document/?new=quote&client=${client.id}`}>New quote</ButtonLink>}
                </div>
              )}
              <div className="mb-4 flex border-b-2 border-ink" role="tablist" aria-label="Client records">
                {(["history", "statement", "pricing", "account"] as const).filter((t) => (t !== "pricing" || canEdit(role, "pricing")) && (t !== "account" || canCreateOrders(role))).map((t) => (
                  <button key={t} type="button" role="tab" aria-selected={tab === t} onClick={() => setTab(t)}
                    className={`-mb-0.5 border-2 border-b-0 px-4 py-2 font-mono text-xs font-bold uppercase tracking-wider ${tab === t ? "border-ink bg-panel" : "border-transparent text-muted hover:text-ink"}`}>
                    {t === "history" ? "Quotes & invoices" : t === "statement" ? "Statement" : t === "pricing" ? "Pricing" : client.profile ? "Customer form ✓" : "Customer form"}
                  </button>
                ))}
              </div>

              {tab === "history" && (docs.length === 0 ? <Empty>No quotes or invoices yet.</Empty> : (
                <ul className="divide-y divide-line border-2 border-ink bg-panel">
                  {docs.map((d) => (
                    <li key={d.id}>
                      <Link href={`/admin/document/?id=${d.id}`} className="flex flex-wrap items-center justify-between gap-3 px-4 py-3 hover:bg-paper-2">
                        <span><span className="font-bold">{d.number}</span> <span className="text-sm text-muted">· {d.kind === "quote" ? "Quote" : "Invoice"} · {shortDate(d.date)}</span></span>
                        <span className="num flex items-center gap-3 text-sm">
                          {formatPrice(docTotal(d))}
                          {d.kind === "invoice" && balance(d) > 0 && <span className="text-flare">owes {formatPrice(balance(d))}</span>}
                          <StatusBadge status={d.kind === "invoice" ? invoiceStatus(d, today) : quoteStatus(d, today)} />
                        </span>
                      </Link>
                    </li>
                  ))}
                </ul>
              ))}

              {tab === "statement" && (
                <Panel title="Statement" action={<Button tone="dark" onClick={statementPdf}>Download PDF</Button>}>
                  <div className="mb-4 grid grid-cols-2 gap-3 sm:max-w-md">
                    <Field label="From"><Input type="date" value={from} onChange={(e) => setFrom(e.target.value)} /></Field>
                    <Field label="To"><Input type="date" value={to} onChange={(e) => setTo(e.target.value)} /></Field>
                  </div>
                  <div className="overflow-x-auto">
                    <table className="num w-full min-w-[32rem] text-sm">
                      <thead><tr className="border-b-2 border-ink text-left font-mono text-xs uppercase tracking-wider">
                        <th className="py-2 pr-3">Date</th><th className="py-2 pr-3">Description</th><th className="py-2 pr-3 text-right">Charges</th><th className="py-2 pr-3 text-right">Payments</th><th className="py-2 text-right">Balance</th>
                      </tr></thead>
                      <tbody>
                        <tr className="border-b border-line"><td className="py-2 pr-3">{shortDate(from)}</td><td className="py-2 pr-3 font-bold">Opening balance</td><td /><td /><td className="py-2 text-right font-bold">{formatPrice(st.opening)}</td></tr>
                        {st.rows.map((r, i) => (
                          <tr key={i} className="border-b border-line">
                            <td className="py-2 pr-3 whitespace-nowrap">{shortDate(r.date)}</td>
                            <td className="py-2 pr-3">{r.description}</td>
                            <td className="py-2 pr-3 text-right">{r.debit ? formatPrice(r.debit) : ""}</td>
                            <td className="py-2 pr-3 text-right">{r.credit ? formatPrice(r.credit) : ""}</td>
                            <td className="py-2 text-right">{formatPrice(r.balance)}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                  <p className="num mt-3 text-right font-bold">{st.closing > 0 ? "Amount due" : "Balance"}: {formatPrice(st.closing)}</p>
                </Panel>
              )}

              {tab === "account" && canCreateOrders(role) && <ClientAccount key={client.id} client={client} onSaved={(c) => setClient(c)} />}
              {tab === "pricing" && canEdit(role, "pricing") && client.type === "agent" && Object.keys(client.prices).length === 0 && (
                <p className="mb-3 border-2 border-ink bg-lime p-3 text-sm"><strong>Agent:</strong> type this agent&apos;s own prices in the <em>Agreed price</em> column, then Save prices. Empty rows use the agent list.</p>
              )}
              {tab === "pricing" && canEdit(role, "pricing") && <ClientPricing client={client} onChange={(c) => { setClient(c); bo.saveClient(c); setNotice("Prices saved. The customer sees them next time they sign in."); }} />}
            </>
          )}
        </div>
      </div>
    </>
  );
}

function ClientPricing({ client, onChange }: { client: Client; onChange: (c: Client) => void }) {
  const { data, today } = useBackoffice();
  const [sent, setSent] = useState<string | null>(null);
  const [draft, setDraft] = useState<Record<string, string>>(() => Object.fromEntries(Object.entries(client.prices).map(([k, v]) => [k, String(v)])));
  if (!data) return null;
  const items = data.catalogue.filter((i) => i.active);

  /** PDF of this client's prices plus an email draft; their login shows the same prices. */
  async function sendList() {
    const lib = await import("@/lib/backoffice/pdf");
    const bytes = await lib.priceListPdf(client, data!.catalogue, data!.settings, today);
    const name = `OCTA-price-list-${(client.company || client.name).replace(/[^a-z0-9]+/gi, "-")}-${today}.pdf`;
    lib.downloadPdf(bytes, name);
    const to = client.email || client.linkedEmail;
    if (!to) return setSent("Price list PDF downloaded. This client has no email address to send it to.");
    const body = `Hi ${client.name.split(" ")[0] || "there"},\n\nPlease find your OCTA price list attached.${client.linkedEmail ? `\n\nWhen you sign in on the OCTA website with ${client.linkedEmail}, these prices show automatically in the shop and your cart.` : ""}\n\nKind regards,\n${data!.settings.tradingAs}`;
    window.location.href = `mailto:${to}?subject=${encodeURIComponent(`Your OCTA price list (${today})`)}&body=${encodeURIComponent(body)}`;
    setSent("Price list PDF downloaded and an email draft opened. Attach the PDF before sending.");
  }

  return (
    <Panel title="Pricing" action={<span className="flex flex-wrap gap-2">
      <Button onClick={sendList}>Send price list</Button>
      <Button tone="primary" onClick={() => {
        const prices = Object.fromEntries(Object.entries(draft).filter(([, v]) => Number(v) > 0).map(([k, v]) => [k, Math.round(Number(v) * 100) / 100]));
        onChange({ ...client, prices });
      }}>Save prices</Button>
    </span>}>
      {sent && <p role="status" className="mb-4 border-2 border-ink bg-lime p-3 text-sm">{sent}</p>}
      {!client.linkedEmail && <p className="mb-4 border-2 border-dashed border-ink p-3 text-sm">Add a <strong>website login email</strong> under Details so these prices show when this customer signs in to the shop.</p>}
      <div className="mb-4 max-w-xs">
        <Field label="Price list" hint="Agreed prices below override this list.">
          <Select value={client.tier} onChange={(e) => onChange({ ...client, tier: e.target.value as PriceTier })}>
            <option value="retail">Retail (website prices)</option>
            <option value="agent">Agent prices</option>
            <option value="bulk">Bulk prices</option>
          </Select>
        </Field>
      </div>
      <div className="overflow-x-auto">
        <table className="num w-full min-w-[34rem] text-sm">
          <thead><tr className="border-b-2 border-ink text-left font-mono text-xs uppercase tracking-wider">
            <th className="py-2 pr-3">Product</th><th className="py-2 pr-3 text-right">List price</th><th className="py-2 pr-3">Agreed price</th><th className="py-2 text-right">They pay</th>
          </tr></thead>
          <tbody>
            {items.map((i) => {
              const list = priceFor(i, { tier: client.tier, prices: {} });
              const agreed = Number(draft[i.sku]);
              return (
                <tr key={i.sku} className="border-b border-line">
                  <td className="py-2 pr-3">{i.productName} <span className="text-muted">· {i.size}</span></td>
                  <td className="py-2 pr-3 text-right">{list === null ? "On quote" : formatPrice(list)}</td>
                  <td className="py-2 pr-3">
                    <Input type="number" min={0} step="0.01" placeholder="Use list" aria-label={`Agreed price for ${i.productName} ${i.size}`} value={draft[i.sku] ?? ""} onChange={(e) => setDraft({ ...draft, [i.sku]: e.target.value })} className="!mt-0 w-32" />
                  </td>
                  <td className="py-2 text-right font-bold">
                    {agreed > 0 ? formatPrice(agreed) : list === null ? "On quote" : formatPrice(list)}
                    {i.cost !== null && (agreed > 0 ? agreed : list ?? Infinity) < i.cost && <span role="alert" className="block text-xs text-flare">Under cost ({formatPrice(i.cost)})</span>}
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </Panel>
  );
}

function QuickToggle({ on, label, hint, onClick }: { on: boolean; label: string; hint: string; onClick: () => void }) {
  return (
    <button type="button" aria-pressed={on} title={hint} onClick={onClick}
      className={`min-h-10 border-2 border-ink px-4 font-mono text-xs font-bold uppercase tracking-wider ${on ? "bg-ink text-lime" : "bg-panel hover:bg-lime"}`}>
      {on ? "✓ " : ""}{label}
    </button>
  );
}
