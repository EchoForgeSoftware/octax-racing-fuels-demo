"use client";

import { useState } from "react";
import { useBackoffice } from "./BackofficeContext";
import { Button } from "./ui";
import { CustomerInfoForm, type Contact } from "../CustomerInfoForm";
import { accountEmails, emptyProfile, profileErrors, type CustomerProfile } from "@/lib/backoffice/customerForm";
import type { Client } from "@/lib/backoffice/types";
import { vatError } from "@/lib/vat";

/** Customer Information Form on the client page: for private sales (quote, pro forma, invoice) that open an account. */
export function ClientAccount({ client, onSaved }: { client: Client; onSaved: (c: Client) => void }) {
  const bo = useBackoffice();
  const [contact, setContact] = useState<Contact>({ name: client.name, email: client.email, phone: client.phone, company: client.company, vat: client.vat });
  const [profile, setProfile] = useState<CustomerProfile>(() => client.profile ?? {
    ...emptyProfile(client.company ? "company" : "individual"),
    registeredName: client.company, mobile: client.phone,
    delivery: { street: client.address, suburb: "", city: client.city, postcode: "", province: "" },
  });
  const [errors, setErrors] = useState<string[]>([]);
  const [notice, setNotice] = useState<string | null>(null);

  function save() {
    const e = profileErrors(profile, contact);
    const vat = vatError(contact.vat);
    if (vat) e.push(vat);
    setErrors(e);
    setNotice(null);
    if (e.length) return;
    const saved = bo.saveCustomerProfile(client.id, contact, profile);
    if (saved) { onSaved(saved); setNotice(`Saved. ${accountEmails(saved).length} sign-in email(s) can now see this account's prices and history.`); }
  }

  async function pdf() {
    const lib = await import("@/lib/backoffice/pdf");
    const current: Client = { ...client, name: contact.name, email: contact.email, phone: contact.phone, company: contact.company, vat: contact.vat, profile };
    lib.downloadPdf(await lib.customerFormPdf(current, bo.data!.settings), `Customer-Information-Form-${(contact.company || contact.name).replace(/[^a-z0-9]+/gi, "-")}.pdf`);
  }

  return (
    <div className="border-2 border-ink bg-panel p-4">
      <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
        <div>
          <h2 className="font-display text-lg">Customer information form</h2>
          <p className="text-sm text-ink-soft">For customers who want to become permanent (account) customers.</p>
        </div>
        <Button onClick={pdf}>Download form PDF</Button>
      </div>
      {notice && <p role="status" className="mb-4 border-2 border-ink bg-lime p-3 text-sm">{notice}</p>}
      <CustomerInfoForm contact={contact} profile={profile} onContact={setContact} onProfile={setProfile} office={bo.admin?.role === "main"} today={bo.today} />
      {errors.length > 0 && <ul role="alert" className="mt-4 list-inside list-disc border-2 border-flare p-3 text-sm">{errors.map((x) => <li key={x}>{x}</li>)}</ul>}
      <Button tone="primary" className="mt-4 w-full sm:w-auto" onClick={save}>Save customer form</Button>
    </div>
  );
}
