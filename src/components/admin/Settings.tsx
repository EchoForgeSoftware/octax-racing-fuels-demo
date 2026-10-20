"use client";

import { MAX_ADMINS, ROLE_LABEL, STAFF } from "@/lib/backoffice/roles";
import Link from "next/link";
import { useState } from "react";
import { uid, useBackoffice } from "./BackofficeContext";
import { Button, Field, Input, PageTitle, Panel, Textarea } from "./ui";
import type { BusinessSettings, Rep } from "@/lib/backoffice/types";
import { asset } from "@/lib/site";
import { vatError } from "@/lib/vat";

export function SettingsAdmin() {
  const { data, saveSettings, reset, mode, admin, today } = useBackoffice();
  const [s, setS] = useState<BusinessSettings | null>(() => (data ? structuredClone(data.settings) : null));
  const [notice, setNotice] = useState<string | null>(null);
  if (!data || !s) return null;
  const set = (patch: Partial<BusinessSettings>) => setS({ ...s, ...patch });
  const setBank = (patch: Partial<BusinessSettings["bank"]>) => setS({ ...s, bank: { ...s.bank, ...patch } });

  function save() {
    const vat = s!.vatRegistered ? vatError(s!.vatNumber) : null;
    if (s!.vatRegistered && (!s!.vatNumber || vat)) return setNotice(vat ?? "Enter your VAT number, or untick VAT registered.");
    saveSettings({ ...s!, next: data!.settings.next });
    setNotice("Settings saved. New PDFs use these details.");
  }

  return (
    <>
      <PageTitle title="Settings" sub="Business details printed on quotes, invoices and statements." actions={<Button tone="primary" onClick={save}>Save settings</Button>} />
      {notice && <p role="status" className="mb-4 border-2 border-ink bg-lime p-3 text-sm">{notice}</p>}
      <Panel title="Online ordering" className="mb-6">
        <label className="flex items-start gap-3 text-sm">
          <input type="checkbox" checked={s.onlineOrdering === true} onChange={(e) => set({ onlineOrdering: e.target.checked })} className="mt-0.5 h-5 w-5 accent-[var(--color-ink)]" />
          <span>
            <strong>Customers can order and pay on the website</strong>
            <span className="block text-ink-soft">
              {s.onlineOrdering ? "Open: " : "Closed: "}
              orders are priced from Products &amp; pricing, checked on the server and appear under Invoices as unpaid website invoices.
              EFT orders are marked paid when you record the payment (or import the bank statement); Ozow payments are recorded automatically once Ozow is connected.
              Click Save settings after changing this.
            </span>
          </span>
        </label>
      </Panel>
      <div className="grid gap-6 xl:grid-cols-2">
        <Panel title="Business">
          <div className="grid gap-3 sm:grid-cols-2">
            <Field label="Registered name"><Input value={s.businessName} onChange={(e) => set({ businessName: e.target.value })} /></Field>
            <Field label="Trading as"><Input value={s.tradingAs} onChange={(e) => set({ tradingAs: e.target.value })} /></Field>
            <Field label="Company registration"><Input value={s.registration} onChange={(e) => set({ registration: e.target.value })} /></Field>
            <Field label="Phone"><Input value={s.phone} onChange={(e) => set({ phone: e.target.value })} /></Field>
            <Field label="Email" className="sm:col-span-2"><Input type="email" value={s.email} onChange={(e) => set({ email: e.target.value })} /></Field>
            <Field label="Business address" className="sm:col-span-2"><Textarea rows={2} value={s.address} onChange={(e) => set({ address: e.target.value })} /></Field>
          </div>
        </Panel>
        <Panel title="VAT and terms">
          <label className="flex items-start gap-3 text-sm">
            <input type="checkbox" checked={s.vatRegistered} onChange={(e) => set({ vatRegistered: e.target.checked })} className="mt-0.5 h-5 w-5 accent-[var(--color-ink)]" />
            <span><strong>Registered for VAT</strong><span className="block text-ink-soft">Off: documents are titled “Invoice” and say no VAT is charged. On: “Tax invoice” with the VAT included shown.</span></span>
          </label>
          <div className="mt-4 grid gap-3 sm:grid-cols-2">
            {s.vatRegistered && <Field label="VAT number"><Input inputMode="numeric" value={s.vatNumber} onChange={(e) => set({ vatNumber: e.target.value })} /></Field>}
            <Field label="Payment terms (days)"><Input type="number" min={0} value={s.paymentTermsDays} onChange={(e) => set({ paymentTermsDays: Math.max(0, Number(e.target.value)) })} /></Field>
            <Field label="Quotes valid for (days)"><Input type="number" min={1} value={s.quoteValidDays} onChange={(e) => set({ quoteValidDays: Math.max(1, Number(e.target.value)) })} /></Field>
            <Field label="Courier fee per pack (R)" hint="Used on the shop, cart, checkout and new invoices. Free-delivery quantities stay as per the policy."><Input type="number" min={0} step="1" value={s.courierFee ?? 200} onChange={(e) => set({ courierFee: Math.max(0, Math.round(Number(e.target.value))) })} /></Field>
            <Field label="Footer line" className="sm:col-span-2"><Input value={s.invoiceFooter} onChange={(e) => set({ invoiceFooter: e.target.value })} /></Field>
          </div>
        </Panel>
        <Panel title="Bank details on documents">
          <div className="grid gap-3 sm:grid-cols-2">
            <Field label="Account holder"><Input value={s.bank.holder} onChange={(e) => setBank({ holder: e.target.value })} /></Field>
            <Field label="Bank"><Input value={s.bank.bank} onChange={(e) => setBank({ bank: e.target.value })} /></Field>
            <Field label="Account number"><Input inputMode="numeric" value={s.bank.account} onChange={(e) => setBank({ account: e.target.value })} /></Field>
            <Field label="Branch code"><Input inputMode="numeric" value={s.bank.branch} onChange={(e) => setBank({ branch: e.target.value })} /></Field>
            <Field label="Account type" className="sm:col-span-2"><Input value={s.bank.type} onChange={(e) => setBank({ type: e.target.value })} /></Field>
          </div>
        </Panel>
        <Panel title="Reps"><p className="text-sm text-ink-soft">Reps, their details and referral commissions are on the <Link href="/admin/reps/" className="underline">Reps page</Link>.</p></Panel>
        <Panel title={`Admins (${STAFF.length} of ${MAX_ADMINS})`}>
          <ul className="divide-y divide-line">
            {STAFF.map((a) => (
              <li key={a.id} className="flex flex-wrap items-baseline justify-between gap-x-4 gap-y-1 py-2 text-sm">
                <span><strong>{a.name}</strong>{admin?.id === a.id && <span className="ml-2 bg-lime px-1.5 py-0.5 font-mono text-[0.65rem] uppercase">You</span>}</span>
                <span className="text-ink-soft">{ROLE_LABEL[a.role]} · <span className="font-mono text-xs">{a.email}</span></span>
              </li>
            ))}
          </ul>
          <p className="mt-3 text-xs text-muted">
            Four admin seats. Main admins can do everything. Danium sees invoices and customers
            only. Accounts handles supplier invoices, bank statements, customer balances and statements.
            Quotes, invoices and payments show who saved them. In the live setup each admin signs in with the email shown.
          </p>
        </Panel>
        <Panel title="Templates and data">
          <Button onClick={() => {const url=URL.createObjectURL(new Blob([JSON.stringify(data,null,2)],{type:"application/json"}));const link=document.createElement("a");link.href=url;link.download=mode==="demo"?"octa-demo-backup.json":`octa-backoffice-backup-${today}.json`;link.click();setTimeout(()=>URL.revokeObjectURL(url),10000);}}>{mode==="demo"?"Back up demo data":"Download a backup"}</Button>
          <p className="text-sm text-ink-soft">An Excel invoice and quote template in the same layout, for manual invoicing away from the website.</p>
          <a href={asset("/templates/octa-invoice-quote-template.xlsx")} download className="mt-3 inline-flex min-h-10 items-center border-2 border-ink bg-ink px-4 py-2 font-display text-sm uppercase text-paper hover:bg-lime hover:text-ink">
            Download Excel template
          </a>
          {mode === "demo" && (
            <div className="mt-6 border-t border-line pt-4">
              <p className="text-sm text-ink-soft">Start the demo again with the original sample clients, quotes and invoices.</p>
              <Button tone="danger" className="mt-3" onClick={() => { if (window.confirm("Reset all demo data in this browser?")) { reset(); setNotice("Demo data reset."); } }}>Reset demo data</Button>
            </div>
          )}
        </Panel>
        <RepSettings />
      </div>
    </>
  );
}

function RepSettings() {
  const { data, saveRep, today, mode } = useBackoffice();
  const [editing, setEditing] = useState<Rep | null>(null);
  const [error, setError] = useState("");
  if (!data) return null;
  function save() {
    if (!editing) return;
    const email = editing.email.trim().toLowerCase();
    if (!editing.name.trim() || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) return setError("Enter the rep's name and email.");
    if (data!.reps.some(r => r.id !== editing.id && r.email.toLowerCase() === email) || STAFF.some(s => s.demoEmail === email)) return setError("That email is already in use.");
    saveRep({ ...editing, name: editing.name.trim(), email }); setEditing(null); setError("");
  }
  return <Panel title="Sales reps" action={<Button onClick={() => setEditing({id:uid("r"), name:"", email:"", phone:"", active:true, createdAt:today})}>Add rep</Button>}>
    <p className="mb-3 text-sm text-muted">Assign customers to reps in the client record. A rep sees only their assigned customers, quotes, invoices and sales figures. {mode === "demo" ? "Use sample details in this demo." : "The rep signs in with this email: they create their account on the website's Sign in page, confirm it, then open the back office."}</p>
    <ul className="divide-y divide-line">{data.reps.map(r => <li key={r.id} className="flex flex-wrap items-center justify-between gap-3 py-3"><span><strong>{r.name}</strong><span className="block break-all text-sm text-muted">{r.email} · {r.active ? "Active" : "Inactive"}</span></span><Button onClick={() => {setEditing({...r});setError("");}}>Edit rep</Button></li>)}</ul>
    {editing && <div className="mt-4 space-y-3 border-t-2 border-ink pt-4">
      <Field label="Rep name"><Input maxLength={200} value={editing.name} onChange={e=>setEditing({...editing,name:e.target.value})}/></Field>
      <Field label="Rep sign-in email"><Input type="email" maxLength={254} value={editing.email} onChange={e=>setEditing({...editing,email:e.target.value})}/></Field>
      <Field label="Rep phone"><Input type="tel" maxLength={50} value={editing.phone} onChange={e=>setEditing({...editing,phone:e.target.value})}/></Field>
      <label className="flex items-center gap-3 text-sm"><input type="checkbox" checked={editing.active} onChange={e=>setEditing({...editing,active:e.target.checked})}/>Active rep</label>
      {error && <p role="alert" className="text-sm text-flare">{error}</p>}
      <div className="flex gap-3"><Button tone="primary" onClick={save}>Save rep</Button><Button onClick={()=>setEditing(null)}>Cancel</Button></div>
    </div>}
  </Panel>;
}
