"use client";

import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { useEffect, useMemo, useState } from "react";
import { uid, useBackoffice } from "./BackofficeContext";
import { Button, ButtonLink, Empty, Field, Input, Panel, Select, StatusBadge, Textarea, shortDate } from "./ui";
import { Icon } from "../Icon";
import {
  balance, cents, CHANNEL_LABEL, CLIENT_TYPE_LABEL, defaultsFor, docCost, docProfit, docSubtotal, docTotal,
  invoiceStatus, lineTotal, paid, priceFor, quoteStatus,
} from "@/lib/backoffice/calc";
import { cartCourier, DELIVERY_LABEL } from "@/lib/courier";
import { SignaturePad } from "./SignaturePad";
import { sellWarnings, stockLevels } from "@/lib/backoffice/stock";
import { defaultDelivery } from "./BackofficeContext";
import { deliveryRules } from "@/lib/delivery";
import { formatPrice } from "@/lib/format";
import type { Channel, Delivery, Document, DocLine, Payment } from "@/lib/backoffice/types";
import { canChangePrices, canCreateOrders, canEdit, canRecordPayments, canSeeProfit, canSignDelivery, canView } from "@/lib/backoffice/roles";

const METHODS: Payment["method"][] = ["eft", "cash", "card", "ozow", "other"];

export function DocumentEditor() {
  const params = useSearchParams();
  const router = useRouter();
  const bo = useBackoffice();
  const { data, today } = bo;
  const id = params.get("id");
  const newParam = params.get("new");
  const proforma = newParam === "proforma";
  const newKind = (proforma ? "quote" : newParam) as Document["kind"] | null;
  const cash = params.get("cash") === "1";

  const existing = useMemo(() => data?.documents.find((d) => d.id === id) ?? null, [data, id]);
  const [doc, setDoc] = useState<Document | null>(null);
  const [autoCourier, setAutoCourier] = useState(!id && !cash);
  const [paidNow, setPaidNow] = useState(cash);
  const [paidMethod, setPaidMethod] = useState<Payment["method"]>(cash ? "cash" : "eft");
  const [errors, setErrors] = useState<string[]>([]);
  const [notice, setNotice] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  // Load the document once (or start a new one) when the data is ready.
  useEffect(() => {
    if (!data) return;
    // Load the document in the address; follow links from one document to another.
    if (existing) { if (doc?.id !== existing.id) { setDoc(structuredClone(existing)); setAutoCourier(false); } return; }
    if (doc) return;
    if (newKind === "invoice" || newKind === "quote") {
      const clientId = params.get("client") ?? (cash ? data.clients.find((c) => c.id === "c-cash")?.id ?? "" : "");
      setDoc({ ...bo.newDocument(newKind, clientId), ...(proforma ? { proforma: true } : {}) });
    }
  }, [data, existing, newKind, cash, params, doc, bo]);

  const client = data?.clients.find((c) => c.id === doc?.clientId) ?? null;
  const catalogue = useMemo(() => data?.catalogue.filter((i) => i.active) ?? [], [data]);
  const stock = useMemo(() => (data ? stockLevels(data, today) : []), [data, today]);

  // Keep courier in step with the lines while automatic.
  useEffect(() => {
    if (!doc || !autoCourier) return;
    // Collected orders carry no delivery charge; local and courier deliveries use the courier rates (adjust by hand if agreed).
    if (doc.delivery?.method === "collect") { if (doc.courier !== 0) setDoc({ ...doc, courier: 0 }); return; }
    const lines = doc.lines.flatMap((l) => {
      const item = data?.catalogue.find((i) => i.sku === l.sku);
      return item ? [{ size: item.size, qty: l.qty }] : [];
    });
    const fee = cartCourier(lines, null, data?.settings.courierFee).fee;
    if (fee !== doc.courier) setDoc({ ...doc, courier: fee });
  }, [doc, autoCourier, data]);

  if (!data) return null;
  if (id && !existing) return <Empty>That document wasn't found. <Link href="/admin/invoices/" className="underline">Back to invoices</Link></Empty>;
  if (!doc) return <Empty>Choose what to create: <Link className="underline" href="/admin/document/?new=invoice">invoice</Link> or <Link className="underline" href="/admin/document/?new=quote">quote</Link>.</Empty>;

  // The stored copy of the document on screen (found by its own id, so it is right even before the address updates).
  const stored = data.documents.find((x) => x.id === doc.id) ?? null;
  const saved = !!stored;
  const isQuote = doc.kind === "quote";
  const role = bo.admin?.role;
  const area = isQuote ? "quotes" : "invoices";
  const takingOrder = !saved && !isQuote && canCreateOrders(role);
  if (!canView(role, area) || (!saved && !canEdit(role, area) && !takingOrder)) return <Empty>This isn&apos;t part of your access. <Link href="/admin/invoices/" className="underline">Back to invoices</Link></Empty>;
  const viewOnly = !canEdit(role, area) && !takingOrder;
  // Only main admins set prices; order takers use the client's list or agreed prices.
  const priceLocked = !canChangePrices(role);
  const showProfit = canSeeProfit(role);
  const status = isQuote ? quoteStatus(doc, today) : invoiceStatus(doc, today);
  const locked = viewOnly || (!isQuote ? doc.cancelled || paid(doc) > 0 : !!doc.linkedId);
  const set = (patch: Partial<Document>) => setDoc({ ...doc, ...patch });
  const setLine = (lineId: string, patch: Partial<DocLine>) => set({ lines: doc.lines.map((l) => (l.id === lineId ? { ...l, ...patch } : l)) });

  function chooseClient(clientId: string) {
    const c = data!.clients.find((x) => x.id === clientId);
    // Re-price catalogue lines for the newly chosen client.
    const lines = doc!.lines.map((l) => {
      const item = data!.catalogue.find((i) => i.sku === l.sku);
      const price = item ? priceFor(item, c ?? null) : null;
      return price !== null ? { ...l, unitPrice: price } : l;
    });
    set({ clientId, lines, channel: c ? defaultsFor(c.type).channel : doc!.channel,
      ...(doc!.kind === "invoice" && doc!.delivery?.status !== "delivered" ? { delivery: defaultDelivery(c, deliveryRules(data?.settings).localArea) } : {}) });
  }

  function addProduct(sku: string) {
    const item = data!.catalogue.find((i) => i.sku === sku);
    if (!item) return;
    const existingLine = doc!.lines.find((l) => l.sku === sku);
    if (existingLine) return setLine(existingLine.id, { qty: existingLine.qty + 1 });
    set({ lines: [...doc!.lines, { id: uid("l"), sku, description: `${item.productName} — ${item.size}`, qty: 1, unitPrice: priceFor(item, client) ?? 0, unitCost: item.cost ?? 0 }] });
  }

  function validate(): boolean {
    const e: string[] = [];
    if (!doc!.clientId) e.push("Choose a client.");
    if (!doc!.lines.length) e.push("Add at least one line.");
    if (doc!.lines.length > 100 || doc!.lines.some(l => l.description.length > 500) || doc!.notes.length > 4000) e.push("Use up to 100 lines, 500 characters per description and 4,000 characters of notes.");
    if (doc!.lines.some((l) => !l.description.trim())) e.push("Every line needs a description.");
    if (doc!.lines.some((l) => !Number.isFinite(l.qty) || !Number.isFinite(l.unitPrice) || !Number.isFinite(l.unitCost) || !(l.qty > 0) || !(l.unitPrice >= 0) || l.unitCost < 0)) e.push("Enter valid quantities, prices and costs.");
    if (!Number.isFinite(doc!.courier) || doc!.courier < 0) e.push("Enter a valid courier amount.");
    if (!doc!.date || !doc!.dueDate || doc!.dueDate < doc!.date) e.push("Check the document and due/expiry dates.");
    if (cash && !doc!.cashName?.trim()) e.push("Enter the cash customer's name.");
    if (doc!.lines.some((l) => l.unitPrice === 0)) e.push("A line has no price yet (on-quotation items need a price).");
    setErrors(e);
    return e.length === 0;
  }

  function save() {
    if (!validate()) return;
    const result = bo.saveDocument({ ...doc!, lines: doc!.lines.map((l) => ({ ...l, unitPrice: cents(l.unitPrice), qty: Math.round(l.qty * 1000) / 1000 })) }, !saved && !isQuote && paidNow ? { paidMethod } : undefined);
    // A sale paid on the spot is recorded with the invoice (also for Danium and reps).
    setNotice(`${isQuote ? "Quote" : "Invoice"} ${result.number} saved.`);
    if (!saved) router.replace(`/admin/document/?id=${result.id}`);
    // Show the saved document straight away; the URL catches up asynchronously in the static export.
    setDoc(structuredClone(result));
    setAutoCourier(false);
  }

  async function pdf(mode: "download" | "share" | "email") {
    if (!saved) return setErrors(["Save first, then download or send."]);
    setBusy(true);
    try {
      const lib = await import("@/lib/backoffice/pdf");
      const bytes = await lib.documentPdf(stored!, client, data!.settings, today);
      const name = `${stored!.number}-${(client?.company || client?.name || "client").replace(/[^a-z0-9]+/gi, "-")}.pdf`;
      const title = `${lib.documentTitle(stored!, data!.settings)} ${stored!.number}`;
      if (mode === "share" && await lib.sharePdf(bytes, name, title)) return;
      lib.downloadPdf(bytes, name);
      if (mode === "email" && client?.email) {
        const body = `Hi ${client.name.split(" ")[0] || "there"},\n\nPlease find ${isQuote ? "our quote" : "your invoice"} ${stored!.number} attached (total ${formatPrice(docTotal(stored!))}).\n${isQuote ? "" : `\nPlease use ${stored!.number} as the payment reference.\n`}\nKind regards,\n${data!.settings.tradingAs}`;
        window.location.href = `mailto:${client.email}?subject=${encodeURIComponent(`${title} from ${data!.settings.tradingAs}`)}&body=${encodeURIComponent(body)}`;
        setNotice("PDF downloaded and an email draft opened. Attach the downloaded PDF before sending.");
      }
    } catch {
      setErrors(["The PDF could not be created. Check the document details and try again."]);
    } finally {
      setBusy(false);
    }
  }

  function convert() {
    const inv = bo.convertQuote(doc!.id);
    if (inv) { setDoc(structuredClone(inv)); setAutoCourier(false); router.push(`/admin/document/?id=${inv.id}`); }
  }

  const clientsByType = Object.entries(CLIENT_TYPE_LABEL).map(([type, label]) => ({ label, clients: data.clients.filter((c) => c.type === type) }));

  return (
    <>
      <div className="mb-6 flex flex-wrap items-end justify-between gap-4">
        <div>
          <Link href={isQuote ? "/admin/quotes/" : "/admin/invoices/"} className="font-mono text-xs uppercase tracking-wider text-muted hover:text-ink">← {isQuote ? "Quotes" : "Invoices"}</Link>
          <h1 className="mt-2 flex flex-wrap items-center gap-3 font-display text-[clamp(1.8rem,5vw,2.6rem)] leading-none">
            {saved ? doc.number : `New ${isQuote ? (doc.proforma ? "pro forma invoice" : "quote") : cash ? "cash sale" : "invoice"}`}
            {saved && <StatusBadge status={status} />}
          </h1>
        </div>
        {saved && (
          <div className="flex flex-wrap gap-2">
            <Button onClick={() => pdf("download")} disabled={busy}>Download PDF</Button>
            <Button onClick={() => pdf("share")} disabled={busy} className="sm:hidden">Share PDF</Button>
            <Button onClick={() => pdf("email")} disabled={busy || !client?.email} title={client?.email ? undefined : "This client has no email address"}>Prepare email</Button>
            {isQuote && !doc.linkedId && !viewOnly && <Button tone="primary" onClick={convert}>Convert to invoice</Button>}
            {isQuote && doc.linkedId && <ButtonLink tone="dark" href={`/admin/document/?id=${doc.linkedId}`}>Open invoice</ButtonLink>}
            {!isQuote && doc.linkedId && <ButtonLink href={`/admin/document/?id=${doc.linkedId}`}>From quote</ButtonLink>}
          </div>
        )}
      </div>

      {notice && <p role="status" className="mb-4 border-2 border-ink bg-lime p-3 text-sm">{notice}</p>}
      {errors.length > 0 && <ul role="alert" className="mb-4 list-inside list-disc border-2 border-flare p-3 text-sm">{errors.map((e) => <li key={e}>{e}</li>)}</ul>}
      {locked && <p className="mb-4 border-2 border-dashed border-ink bg-paper-2 p-3 text-sm">{viewOnly ? `View only: ${bo.admin?.name} can open and download this ${isQuote ? "quote" : "invoice"} but not change it.` : isQuote ? "This quote has been invoiced, so it can't be changed." : doc.cancelled ? "This invoice is cancelled. Restore it to make changes." : "Payments are recorded on this invoice, so its lines are locked. Remove the payments to edit, or cancel and re-issue."}</p>}

      <div className="grid gap-6 xl:grid-cols-[1fr_22rem]">
        <div className="space-y-6">
          <Panel title="Client and details">
            <div className="grid gap-4 sm:grid-cols-2">
              <Field label="Client" className="sm:col-span-2">
                <Select value={doc.clientId} disabled={locked} onChange={(e) => chooseClient(e.target.value)}>
                  <option value="">Choose a client…</option>
                  {clientsByType.map((g) => g.clients.length > 0 && (
                    <optgroup key={g.label} label={g.label}>
                      {g.clients.map((c) => <option key={c.id} value={c.id}>{c.company ? `${c.company} — ${c.name}` : c.name}</option>)}
                    </optgroup>
                  ))}
                </Select>
              </Field>
              {client && (
                <p className="text-xs text-ink-soft sm:col-span-2">
                  {CLIENT_TYPE_LABEL[client.type]} · prices on the <strong>{client.tier}</strong> list{Object.keys(client.prices).length ? ` with ${Object.keys(client.prices).length} agreed price${Object.keys(client.prices).length === 1 ? "" : "s"}` : ""}.{" "}
                  <Link href={`/admin/client/?id=${client.id}`} className="underline">Open client</Link>
                </p>
              )}
              {client?.cash && (
                <Field label="Cash customer name" hint="Listed with the invoice number and amount under cash sales." className="sm:col-span-2">
                  <Input value={doc.cashName ?? ""} disabled={locked} onChange={(e) => set({ cashName: e.target.value })} placeholder={client.id === "c-cash" ? "e.g. Walk-in: Kobus" : client.name} />
                </Field>
              )}
              <Field label="Date"><Input type="date" value={doc.date} disabled={locked} onChange={(e) => set({ date: e.target.value })} /></Field>
              {(cash || doc.cashName) && <Field label="Cash customer name"><Input value={doc.cashName ?? ""} maxLength={200} disabled={locked} onChange={e => set({cashName:e.target.value})}/></Field>}
              <Field label={isQuote ? "Valid until" : "Due date"}><Input type="date" value={doc.dueDate} disabled={locked} onChange={(e) => set({ dueDate: e.target.value })} /></Field>
              <Field label="Sales channel" hint="Counts towards this dashboard total.">
                <Select value={doc.channel} disabled={locked} onChange={(e) => set({ channel: e.target.value as Channel })}>
                  {Object.entries(CHANNEL_LABEL).map(([k, v]) => <option key={k} value={k}>{v}</option>)}
                </Select>
              </Field>
              <Field label="Reference" hint="Website order no. or the client's order no."><Input value={doc.reference} disabled={locked} onChange={(e) => set({ reference: e.target.value })} /></Field>
              {isQuote && (
                <Field label="Quote status">
                  <Select value={doc.quoteState} disabled={!!doc.linkedId} onChange={(e) => set({ quoteState: e.target.value as Document["quoteState"] })}>
                    {["draft", "sent", "accepted", "declined"].map((s) => <option key={s} value={s}>{s[0].toUpperCase() + s.slice(1)}</option>)}
                  </Select>
                </Field>
              )}
            </div>
          </Panel>

          <Panel title="Lines">
            {!locked && (
              <div className="mb-4 flex flex-wrap gap-2">
                <Select aria-label="Add a product" value="" onChange={(e) => { if (e.target.value) addProduct(e.target.value); }} className="!mt-0 w-auto min-w-0 flex-1">
                  <option value="">Add a product…</option>
                  {catalogue.map((i) => (
                    <option key={i.sku} value={i.sku}>
                      {i.productName} — {i.size} · {priceFor(i, client) === null ? "price on quote" : formatPrice(priceFor(i, client)!)}
                    </option>
                  ))}
                </Select>
                {!priceLocked && (
                  <Button onClick={() => set({ lines: [...doc.lines, { id: uid("l"), sku: null, description: "", qty: 1, unitPrice: 0, unitCost: 0 }] })}>
                    <Icon name="plus" size={14} /> Custom line
                  </Button>
                )}
              </div>
            )}
            {doc.lines.length === 0 ? <Empty>No lines yet. Add a product or a custom line.</Empty> : (
              <ul className="space-y-3">
                {doc.lines.map((l) => (
                  <li key={l.id} className="grid gap-2 border-2 border-line p-3 sm:grid-cols-[1fr_5rem_8rem_7rem_auto] sm:items-end">
                    <Field label="Description"><Input value={l.description} disabled={locked || !!l.sku} onChange={(e) => setLine(l.id, { description: e.target.value })} /></Field>
                    <Field label="Qty"><Input type="number" min={1} step="1" inputMode="numeric" value={l.qty} disabled={locked} onChange={(e) => setLine(l.id, { qty: Number(e.target.value) })} /></Field>
                    <Field label="Unit price"><Input type="number" min={0} step="0.01" inputMode="decimal" value={l.unitPrice} disabled={locked || priceLocked} onChange={(e) => setLine(l.id, { unitPrice: Number(e.target.value) })} /></Field>
                    <div className="num pb-2 text-right font-bold sm:text-right">{formatPrice(lineTotal(l))}</div>
                    {!locked && (
                      <button type="button" onClick={() => set({ lines: doc.lines.filter((x) => x.id !== l.id) })} aria-label={`Remove ${l.description || "line"}`} className="grid h-10 w-10 place-items-center justify-self-end border-2 border-transparent text-muted hover:border-ink hover:text-flare">
                        <Icon name="close" size={16} />
                      </button>
                    )}
                    {!locked && l.sku && sellWarnings(stock.find((s) => s.sku === l.sku), l.qty).map((w) => (
                      <p key={w} className="bg-[oklch(0.92_0.1_95)] px-2 py-1 text-xs font-bold sm:col-span-5">Stock: {w}</p>
                    ))}
                    {showProfit && l.unitCost > 0 && l.unitPrice < l.unitCost && (
                      <p role="alert" className="border-2 border-flare bg-flare/10 px-2 py-1 text-xs font-bold text-flare sm:col-span-5">
                        Price under cost: {formatPrice(l.unitPrice)} sells below the {formatPrice(l.unitCost)} cost.
                      </p>
                    )}
                    {!l.sku && !locked && (
                      <Field label="Cost per unit (for profit)" className="sm:col-span-2"><Input type="number" min={0} step="0.01" value={l.unitCost} onChange={(e) => setLine(l.id, { unitCost: Number(e.target.value) })} /></Field>
                    )}
                  </li>
                ))}
              </ul>
            )}
            <div className="mt-4 grid gap-4 sm:grid-cols-2">
              <Field label="Courier" hint={autoCourier ? "Worked out from the courier rules." : "Entered by hand."}>
                <Input type="number" min={0} step="0.01" value={doc.courier} disabled={locked || autoCourier} onChange={(e) => set({ courier: Number(e.target.value) })} />
              </Field>
              <label className="flex items-center gap-3 self-center text-sm">
                <input type="checkbox" checked={autoCourier} disabled={locked} onChange={(e) => setAutoCourier(e.target.checked)} className="h-5 w-5 accent-[var(--color-ink)]" />
                Calculate courier automatically
              </label>
              <Field label="Notes on the document" className="sm:col-span-2"><Textarea rows={3} value={doc.notes} disabled={locked} onChange={(e) => set({ notes: e.target.value })} /></Field>
            </div>
          </Panel>
        </div>

        <div className="space-y-6">
          <Panel title="Totals">
            <dl className="num space-y-2 text-sm">
              <div className="flex justify-between"><dt>Subtotal</dt><dd>{formatPrice(docSubtotal(doc))}</dd></div>
              <div className="flex justify-between"><dt>Courier</dt><dd>{doc.courier > 0 ? formatPrice(doc.courier) : "Free"}</dd></div>
              <div className="flex justify-between border-t-2 border-ink pt-2 text-base font-bold"><dt>Total</dt><dd>{formatPrice(docTotal(doc))}</dd></div>
              {!isQuote && saved && <div className="flex justify-between"><dt>Paid</dt><dd>{formatPrice(paid(doc))}</dd></div>}
              {!isQuote && saved && <div className="flex justify-between font-bold text-flare"><dt>Balance due</dt><dd>{formatPrice(balance(doc))}</dd></div>}
            </dl>
            <p className="mt-3 text-xs text-muted">{data.settings.vatRegistered ? "Prices include VAT at 15%." : "No VAT charged (not VAT-registered)."}</p>
            {showProfit && <div className="num mt-4 border-t border-line pt-3 text-xs text-ink-soft">
              <p className="flex justify-between"><span>Cost of goods</span><span>{formatPrice(docCost(doc))}</span></p>
              <p className="flex justify-between font-bold text-ink"><span>Profit on goods</span><span>{formatPrice(docProfit(doc))}</span></p>
              <p className="mt-1">Only main admins see cost and profit. They never appear on the PDF.</p>
            </div>}
            {!locked && (
              <>
                {!saved && !isQuote && (
                  <div className="mt-4 space-y-2 border-t border-line pt-3">
                    <label className="flex items-center gap-3 text-sm">
                      <input type="checkbox" checked={paidNow} onChange={(e) => setPaidNow(e.target.checked)} className="h-5 w-5 accent-[var(--color-ink)]" />
                      Paid in full now
                    </label>
                    {paidNow && (
                      <Select aria-label="Payment method" value={paidMethod} onChange={(e) => setPaidMethod(e.target.value as Payment["method"])}>
                        {METHODS.map((m) => <option key={m} value={m}>{m.toUpperCase()}</option>)}
                      </Select>
                    )}
                  </div>
                )}
                <Button tone="primary" className="mt-4 w-full" onClick={save}>{saved ? "Save changes" : `Save ${isQuote ? "quote" : "invoice"}`}</Button>
              </>
            )}
          </Panel>

          {!isQuote && (saved ? stored!.delivery : doc.delivery) && (
            <DeliveryPanel doc={saved ? stored! : doc} saved={saved} canSign={canSignDelivery(role)} isMain={role === "main"}
              onMethod={(method) => set({ delivery: { ...(doc.delivery ?? { status: "pending" }), method } as Delivery })}
              onChange={() => setDoc(null)} />
          )}
          {!isQuote && saved && <Payments doc={stored!} canPay={canRecordPayments(role)} onChange={() => setDoc(null)} />}

          {!isQuote && saved && !viewOnly && (
            <Button tone={doc.cancelled ? "ghost" : "danger"} className="w-full" disabled={!doc.cancelled && paid(doc) > 0}
              onClick={() => { bo.setCancelled(doc.id, !doc.cancelled); setDoc(null); }}>
              {doc.cancelled ? "Restore invoice" : "Cancel invoice"}
            </Button>
          )}
        </div>
      </div>
    </>
  );
}

function Payments({ doc, canPay, onChange }: { doc: Document; canPay: boolean; onChange: () => void }) {
  const bo = useBackoffice();
  const owing = balance(doc);
  const [amount, setAmount] = useState(String(owing));
  const [date, setDate] = useState(bo.today);
  const [method, setMethod] = useState<Payment["method"]>("eft");
  const [note, setNote] = useState("");
  useEffect(() => setAmount(String(balance(doc))), [doc]);

  return (
    <Panel title="Payments">
      {doc.payments.length === 0 ? <p className="text-sm text-ink-soft">No payments recorded yet.</p> : (
        <ul className="num divide-y divide-line text-sm">
          {doc.payments.map((p) => (
            <li key={p.id} className="flex items-center justify-between gap-2 py-2">
              <span>{shortDate(p.date)} · {p.method.toUpperCase()}{p.note ? ` · ${p.note}` : ""}{p.by ? ` · by ${p.by}` : ""}</span>
              <span className="flex items-center gap-2 font-bold">{formatPrice(p.amount)}
                {canPay && <button type="button" onClick={() => { bo.removePayment(doc.id, p.id); onChange(); }} aria-label="Remove payment" className="text-muted hover:text-flare"><Icon name="close" size={14} /></button>}
              </span>
            </li>
          ))}
        </ul>
      )}
      {canPay && !doc.cancelled && owing > 0 && (
        <form className="mt-4 grid grid-cols-2 gap-3 border-t border-line pt-3" onSubmit={(e) => {
          e.preventDefault();
          const value = cents(Number(amount));
          if (value > 0 && value <= owing) { bo.recordPayment(doc.id, { date, amount: value, method, note: note.trim() }); setNote(""); onChange(); }
        }}>
          <Field label="Amount"><Input type="number" min={0.01} max={owing} step="0.01" value={amount} onChange={(e) => setAmount(e.target.value)} /></Field>
          <Field label="Date"><Input type="date" value={date} onChange={(e) => setDate(e.target.value)} /></Field>
          <Field label="Method"><Select value={method} onChange={(e) => setMethod(e.target.value as Payment["method"])}>{METHODS.map((m) => <option key={m} value={m}>{m.toUpperCase()}</option>)}</Select></Field>
          <Field label="Note"><Input value={note} onChange={(e) => setNote(e.target.value)} placeholder="Optional" /></Field>
          <Button type="submit" tone="dark" className="col-span-2">Record payment</Button>
        </form>
      )}
    </Panel>
  );
}

/** Delivery method and the goods-received sign-off, signed on screen by the client. */
function DeliveryPanel({ doc, saved, canSign, isMain, onMethod, onChange }: {
  doc: Document; saved: boolean; canSign: boolean; isMain: boolean;
  onMethod: (m: Delivery["method"]) => void; onChange: () => void;
}) {
  const bo = useBackoffice();
  const d = doc.delivery!;
  const [name, setName] = useState("");
  const [surname, setSurname] = useState("");
  const [date, setDate] = useState(bo.today);
  const [signature, setSignature] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const delivered = d.status === "delivered";

  function confirm() {
    if (!name.trim() || !surname.trim()) return setError("Enter the name and surname of the person receiving the goods.");
    if (!signature) return setError("Ask them to sign in the box.");
    bo.saveDelivery(doc.id, { method: d.method, status: "delivered", receivedName: name.trim(), receivedSurname: surname.trim(), receivedDate: date, signature });
    onChange();
  }

  return (
    <Panel title={delivered ? "Delivered" : "Delivery · pending"}>
      <Field label="Delivery method">
        <Select value={d.method} disabled={delivered || (saved && !isMain)} onChange={(e) => {
          const method = e.target.value as Delivery["method"];
          if (saved) { bo.saveDelivery(doc.id, { ...d, method }); onChange(); } else onMethod(method);
        }}>
          {(Object.keys(DELIVERY_LABEL) as Delivery["method"][]).map((m) => <option key={m} value={m}>{DELIVERY_LABEL[m]}</option>)}
        </Select>
      </Field>
      {delivered ? (
        <div className="mt-3 space-y-2 text-sm">
          <p>Received by <strong>{d.receivedName} {d.receivedSurname}</strong>{d.receivedDate ? ` on ${shortDate(d.receivedDate)}` : ""}{d.deliveredBy ? ` · with ${d.deliveredBy}` : ""}.</p>
          {d.signature && <img src={d.signature} alt={`Signature of ${d.receivedName} ${d.receivedSurname}`} className="h-20 w-full border border-line bg-white object-contain" />}
          {isMain && <button type="button" onClick={() => { bo.saveDelivery(doc.id, { method: d.method, status: "pending" }); onChange(); }} className="font-mono text-xs uppercase tracking-wider text-muted underline hover:text-flare">Reopen delivery</button>}
        </div>
      ) : !saved ? (
        <p className="mt-3 text-xs text-ink-soft">Save the invoice, then the client signs for the goods here on delivery or collection.</p>
      ) : canSign && !doc.cancelled ? (
        <div className="mt-4 space-y-3">
          <p className="font-mono text-xs font-bold uppercase tracking-wider">Goods received</p>
          {error && <p role="alert" className="border-2 border-flare p-2 text-sm">{error}</p>}
          <div className="grid grid-cols-2 gap-3">
            <Field label="Name"><Input value={name} onChange={(e) => setName(e.target.value)} autoComplete="off" /></Field>
            <Field label="Surname"><Input value={surname} onChange={(e) => setSurname(e.target.value)} autoComplete="off" /></Field>
          </div>
          <Field label="Date"><Input type="date" value={date} onChange={(e) => setDate(e.target.value)} /></Field>
          <SignaturePad onChange={setSignature} label="Client signs here" />
          <Button tone="primary" className="w-full" onClick={confirm}>Confirm goods received</Button>
          <p className="text-[0.65rem] leading-snug text-muted">The signature and names print on the invoice&apos;s delivery note with the OCTA use-at-own-risk notice.</p>
        </div>
      ) : (
        <p className="mt-3 text-sm text-ink-soft">Waiting for delivery.</p>
      )}
    </Panel>
  );
}
