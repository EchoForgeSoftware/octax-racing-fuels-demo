"use client";

import { useState, type FormEvent } from "react";
import { uid, useBackoffice } from "./BackofficeContext";
import { Button, Empty, Field, Input, PageTitle, Panel, Select, shortDate } from "./ui";
import { referralEarning } from "@/lib/backoffice/calc";
import { formatPrice } from "@/lib/format";
import type { Capacity, Referral, Rep } from "@/lib/backoffice/types";

/** Sales reps: each gets a sign-in that shows only the customers allocated to them. */
export function RepsPanel() {
  const { data, saveRep, today, mode } = useBackoffice();
  const [f, setF] = useState({ name: "", email: "", phone: "" });
  const [error, setError] = useState<string | null>(null);
  if (!data) return null;

  function add(e: FormEvent) {
    e.preventDefault();
    const email = f.email.trim().toLowerCase();
    if (!f.name.trim()) return setError("Enter the rep's name.");
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) return setError("Enter the rep's sign-in email.");
    if (data!.reps.some((r) => r.email.toLowerCase() === email)) return setError("A rep already uses that email.");
    saveRep({ id: uid("r"), name: f.name.trim(), email, phone: f.phone.trim(), active: true, createdAt: today });
    setF({ name: "", email: "", phone: "" });
    setError(null);
  }

  const toggle = (r: Rep) => saveRep({ ...r, active: !r.active });
  const counts = (id: string) => data.clients.filter((c) => c.repId === id).length;

  return (
    <Panel title={`Reps (${data.reps.filter((r) => r.active).length})`}>
      {data.reps.length > 0 && (
        <ul className="mb-4 divide-y divide-line">
          {data.reps.map((r) => (
            <li key={r.id} className={`flex flex-wrap items-center justify-between gap-x-4 gap-y-1 py-2 text-sm ${r.active ? "" : "opacity-60"}`}>
              <span><strong>{r.name}</strong> <span className="font-mono text-xs">{r.email}</span><span className="block text-xs text-muted">{counts(r.id)} client{counts(r.id) === 1 ? "" : "s"}{r.active ? "" : " · sign-in off"}</span></span>
              <button type="button" onClick={() => toggle(r)} className="font-mono text-xs uppercase tracking-wider underline hover:text-flare">{r.active ? "Turn off sign-in" : "Turn on sign-in"}</button>
            </li>
          ))}
        </ul>
      )}
      <form onSubmit={add} noValidate className="grid gap-3 sm:grid-cols-3">
        {error && <p role="alert" className="border-2 border-flare p-3 text-sm sm:col-span-3">{error}</p>}
        <Field label="Rep name"><Input value={f.name} onChange={(e) => setF({ ...f, name: e.target.value })} /></Field>
        <Field label="Sign-in email"><Input type="email" value={f.email} onChange={(e) => setF({ ...f, email: e.target.value })} autoComplete="off" /></Field>
        <Field label="Phone"><Input type="tel" value={f.phone} onChange={(e) => setF({ ...f, phone: e.target.value })} /></Field>
        <Button type="submit" tone="dark" className="sm:col-span-3 sm:justify-self-start">Add rep</Button>
      </form>
      <p className="mt-3 text-xs text-muted">
        Allocate clients to a rep on the client page. A rep signs in on the back office and sees only their own
        clients, their invoices and quotes, and their own sales figures, without cost or profit.
        {mode === "demo" ? " Demo: reps sign in with their email and the demo password." : " Each rep gets an email to set their own password."}
      </p>
    </Panel>
  );
}

const CAPACITIES: Capacity[] = ["Director", "Manager", "Accountant"];
const emptyBank = { holder: "", bank: "", account: "", branch: "", type: "" };

/** Reps page: each rep's details for the referral documents, and their referral commissions. Reps see only their own. */
export function RepsAdmin() {
  const { data, admin } = useBackoffice();
  if (!data) return null;
  const isMain = admin?.role === "main";
  return (
    <>
      <PageTitle
        title={admin?.role === "rep" ? "My details & commission" : "Reps"}
        sub="Rep details (ID, address and bank account) fill the Referral Commission Agreement and the Acknowledgement of Payment. Mark a commission paid once the EFT has gone through."
      />
      {isMain && <div className="mb-6"><RepsPanel /></div>}
      {data.reps.length === 0 ? <Empty>No reps yet.</Empty> : (
        <div className="space-y-6">{data.reps.map((r) => <RepCard key={r.id} rep={r} />)}</div>
      )}
    </>
  );
}

function RepCard({ rep }: { rep: Rep }) {
  const bo = useBackoffice();
  const { data, admin } = bo;
  const canEditDetails = admin?.role === "main" || (admin?.role === "rep" && admin.repId === rep.id);
  const [f, setF] = useState({ idNumber: rep.idNumber ?? "", address: rep.address ?? "", phone: rep.phone, bank: { ...emptyBank, ...rep.bank } });
  const [saved, setSaved] = useState(false);
  const [adding, setAdding] = useState(false);
  if (!data) return null;
  const referrals = data.referrals.filter((r) => r.repId === rep.id);
  const setBank = (patch: Partial<typeof emptyBank>) => setF({ ...f, bank: { ...f.bank, ...patch } });

  function save(e: FormEvent) {
    e.preventDefault();
    bo.saveRepDetails(rep.id, { idNumber: f.idNumber.trim(), address: f.address.trim(), phone: f.phone.trim(), bank: { holder: f.bank.holder.trim(), bank: f.bank.bank.trim(), account: f.bank.account.replace(/\s/g, ""), branch: f.bank.branch.trim(), type: f.bank.type.trim() } });
    setSaved(true);
  }

  return (
    <section className="border-2 border-ink bg-panel" aria-label={rep.name}>
      <div className="flex flex-wrap items-center justify-between gap-3 border-b-2 border-ink px-4 py-3">
        <h2 className="font-display text-xl">{rep.name}</h2>
        <span className="font-mono text-xs">{rep.email}</span>
      </div>
      <div className="grid gap-6 p-4 xl:grid-cols-[1fr_1.3fr]">
        <form onSubmit={save} noValidate>
          <h3 className="mb-2 font-mono text-xs font-bold uppercase tracking-wider">Details for the documents</h3>
          <fieldset disabled={!canEditDetails} className="grid gap-3 sm:grid-cols-2">
            <Field label="ID / passport number"><Input value={f.idNumber} onChange={(e) => setF({ ...f, idNumber: e.target.value })} autoComplete="off" /></Field>
            <Field label="Phone"><Input type="tel" value={f.phone} onChange={(e) => setF({ ...f, phone: e.target.value })} /></Field>
            <Field label="Address" className="sm:col-span-2"><Input value={f.address} onChange={(e) => setF({ ...f, address: e.target.value })} /></Field>
            <Field label="Account holder"><Input value={f.bank.holder} onChange={(e) => setBank({ holder: e.target.value })} autoComplete="off" /></Field>
            <Field label="Bank"><Input value={f.bank.bank} onChange={(e) => setBank({ bank: e.target.value })} autoComplete="off" /></Field>
            <Field label="Account number"><Input inputMode="numeric" value={f.bank.account} onChange={(e) => setBank({ account: e.target.value })} autoComplete="off" /></Field>
            <Field label="Branch code"><Input inputMode="numeric" value={f.bank.branch} onChange={(e) => setBank({ branch: e.target.value })} autoComplete="off" /></Field>
            <Field label="Account type" className="sm:col-span-2"><Input value={f.bank.type} onChange={(e) => setBank({ type: e.target.value })} placeholder="e.g. Cheque, Savings" /></Field>
          </fieldset>
          {canEditDetails && (
            <div className="mt-3 flex items-center gap-3">
              <Button type="submit" tone="dark">Save details</Button>
              {saved && <span role="status" className="text-sm">Saved.</span>}
            </div>
          )}
        </form>
        <div>
          <div className="mb-2 flex flex-wrap items-center justify-between gap-2">
            <h3 className="font-mono text-xs font-bold uppercase tracking-wider">Referral commissions</h3>
            {admin?.role === "main" && <Button onClick={() => setAdding((a) => !a)}>{adding ? "Close" : "New referral"}</Button>}
          </div>
          {adding && <ReferralForm rep={rep} onDone={() => setAdding(false)} />}
          {referrals.length === 0 ? <p className="text-sm text-ink-soft">No referrals yet.</p> : (
            <ul className="space-y-3">{referrals.map((r) => <ReferralRow key={r.id} referral={r} rep={rep} />)}</ul>
          )}
        </div>
      </div>
    </section>
  );
}

function ReferralForm({ rep, onDone }: { rep: Rep; onDone: () => void }) {
  const bo = useBackoffice();
  const { data, today, admin } = bo;
  const [f, setF] = useState({ clientId: data?.clients.find((c) => c.repId === rep.id)?.id ?? data?.clients[0]?.id ?? "", percent: "5", contactPerson: "", contactDetails: "", nature: "", agreementDate: today, signatory: admin?.name ?? "", capacity: "Director" as Capacity });
  const [error, setError] = useState<string | null>(null);
  if (!data) return null;
  const client = data.clients.find((c) => c.id === f.clientId);

  function submit(e: FormEvent) {
    e.preventDefault();
    const percent = Number(f.percent);
    if (!client) return setError("Choose the referred client.");
    if (!(percent > 0 && percent <= 50)) return setError("Enter a commission percentage between 0 and 50.");
    if (!f.signatory.trim()) return setError("Enter who signs for the company.");
    bo.saveReferral({
      id: uid("rf"), repId: rep.id, clientId: client.id, percent: Math.round(percent * 100) / 100,
      contactPerson: f.contactPerson.trim() || client.name, contactDetails: f.contactDetails.trim() || [client.email, client.phone].filter(Boolean).join(" · "),
      nature: f.nature.trim(), agreementDate: f.agreementDate, signatory: { name: f.signatory.trim(), capacity: f.capacity }, paid: null, createdAt: today,
    });
    onDone();
  }

  return (
    <form onSubmit={submit} noValidate className="mb-4 border-2 border-ink p-3">
      {error && <p role="alert" className="mb-2 border-2 border-flare p-2 text-sm">{error}</p>}
      <div className="grid gap-3 sm:grid-cols-2">
        <Field label="Referred client" className="sm:col-span-2">
          <Select value={f.clientId} onChange={(e) => setF({ ...f, clientId: e.target.value })}>
            {data.clients.map((c) => <option key={c.id} value={c.id}>{c.company || c.name}</option>)}
          </Select>
        </Field>
        <Field label="Commission %"><Input type="number" min={0.1} max={50} step="0.1" value={f.percent} onChange={(e) => setF({ ...f, percent: e.target.value })} /></Field>
        <Field label="Agreement date"><Input type="date" value={f.agreementDate} onChange={(e) => setF({ ...f, agreementDate: e.target.value })} /></Field>
        <Field label="Client contact person"><Input value={f.contactPerson} onChange={(e) => setF({ ...f, contactPerson: e.target.value })} placeholder={client?.name} /></Field>
        <Field label="Client contact details"><Input value={f.contactDetails} onChange={(e) => setF({ ...f, contactDetails: e.target.value })} placeholder={client?.email} /></Field>
        <Field label="Nature of business / product" className="sm:col-span-2"><Input value={f.nature} onChange={(e) => setF({ ...f, nature: e.target.value })} /></Field>
        <Field label="Signs for the company"><Input value={f.signatory} onChange={(e) => setF({ ...f, signatory: e.target.value })} /></Field>
        <Field label="Capacity">
          <Select value={f.capacity} onChange={(e) => setF({ ...f, capacity: e.target.value as Capacity })}>
            {CAPACITIES.map((c) => <option key={c} value={c}>{c}</option>)}
          </Select>
        </Field>
      </div>
      <div className="mt-3 flex justify-end gap-2"><Button onClick={onDone}>Cancel</Button><Button type="submit" tone="primary">Save referral</Button></div>
    </form>
  );
}

function ReferralRow({ referral, rep }: { referral: Referral; rep: Rep }) {
  const bo = useBackoffice();
  const { data, today, admin } = bo;
  const [busy, setBusy] = useState(false);
  if (!data) return null;
  const client = data.clients.find((c) => c.id === referral.clientId) ?? null;
  const name = client ? client.company || client.name : "Client";
  const earning = referralEarning(referral, data.documents, data.settings.vatRegistered);
  const missing = [!rep.idNumber && "ID number", !rep.address && "address", !rep.bank?.account && "bank account"].filter(Boolean) as string[];

  async function download(kind: "agreement" | "payment") {
    setBusy(true);
    try {
      const lib = await import("@/lib/backoffice/pdf");
      const bytes = kind === "agreement"
        ? await lib.referralAgreementPdf(referral, rep, client, data!.settings)
        : await lib.paymentAcknowledgementPdf(referral, rep, client, data!.settings);
      lib.downloadPdf(bytes, `${kind === "agreement" ? "Referral-Agreement" : "Payment-Acknowledgement"}-${rep.name.replace(/[^a-z0-9]+/gi, "-")}-${name.replace(/[^a-z0-9]+/gi, "-")}.pdf`);
    } finally { setBusy(false); }
  }

  function markPaid() {
    if (!earning.invoice) return;
    bo.setReferralPaid(referral.id, { date: today, amount: earning.amount, netValue: earning.netValue, invoiceId: earning.invoice.id, reference: `Client referral commission – ${name}` });
  }

  const status = referral.paid ? `Paid ${formatPrice(referral.paid.amount)} on ${shortDate(referral.paid.date)}`
    : earning.earned ? `Earned ${formatPrice(earning.amount)} · pay by ${shortDate(earning.dueBy!)}`
    : earning.invoice ? `Waiting for ${earning.invoice.number} to be paid in full`
    : "No sale yet";

  return (
    <li className="border-2 border-line p-3">
      <div className="flex flex-wrap items-start justify-between gap-2">
        <span><strong>{name}</strong> <span className="text-sm text-muted">· {referral.percent}% · agreed {shortDate(referral.agreementDate)} · signed by {referral.signatory.name} ({referral.signatory.capacity})</span></span>
        <span className={`px-2 py-0.5 font-mono text-[0.68rem] font-bold uppercase tracking-wider ${referral.paid ? "bg-lime" : earning.earned ? "bg-flare text-paper" : "bg-paper-2"}`}>{status}</span>
      </div>
      {earning.invoice && !referral.paid && (
        <p className="num mt-1 text-xs text-ink-soft">{earning.invoice.number}: net value {formatPrice(earning.netValue)} (excl. courier{data.settings.vatRegistered ? " and VAT" : ""}) × {referral.percent}% = {formatPrice(earning.amount)}</p>
      )}
      {missing.length > 0 && <p className="mt-1 text-xs text-flare">Still blank on the documents: {missing.join(", ")}.</p>}
      <div className="mt-2 flex flex-wrap gap-2">
        <Button onClick={() => download("agreement")} disabled={busy}>Agreement PDF</Button>
        {referral.paid && <Button onClick={() => download("payment")} disabled={busy}>Payment acknowledgement PDF</Button>}
        {admin?.role === "main" && !referral.paid && <Button tone="primary" onClick={markPaid} disabled={!earning.earned} title={earning.earned ? undefined : "The client's first invoice must be paid in full first"}>Paid</Button>}
        {admin?.role === "main" && referral.paid && <button type="button" onClick={() => bo.setReferralPaid(referral.id, null)} className="font-mono text-xs uppercase tracking-wider text-muted underline hover:text-flare">Undo paid</button>}
      </div>
    </li>
  );
}
