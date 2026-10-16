"use client";

import { useEffect, type ReactNode } from "react";
import { CUSTOMER_TYPE_LABEL, PROVINCES, emptyAddress, type Address, type CustomerProfile, type PortalUser } from "@/lib/backoffice/customerForm";
import { SignaturePad } from "./admin/SignaturePad";

export type Contact = { name: string; email: string; phone: string; company: string; vat: string };

const input = "mt-1 block w-full border-2 border-ink bg-panel px-3 py-2.5 text-base outline-none focus-visible:bg-lime/30 disabled:opacity-60";

function F({ label, hint, children, wide = false }: { label: string; hint?: string; children: ReactNode; wide?: boolean }) {
  return (
    <label className={`block ${wide ? "sm:col-span-2" : ""}`}>
      <span className="font-mono text-[0.7rem] font-bold uppercase tracking-wider">{label}</span>
      {children}
      {hint && <span className="mt-1 block text-xs text-muted">{hint}</span>}
    </label>
  );
}

function Section({ n, title, children }: { n: number; title: string; children: ReactNode }) {
  return (
    <fieldset className="border-t-2 border-ink pt-4">
      <legend className="pr-3 font-display text-lg uppercase">{n}. {title}</legend>
      <div className="mt-3 grid gap-3 sm:grid-cols-2">{children}</div>
    </fieldset>
  );
}

function AddressFields({ value, onChange, required }: { value: Address; onChange: (a: Address) => void; required?: boolean }) {
  const set = (patch: Partial<Address>) => onChange({ ...value, ...patch });
  return (
    <>
      <F label={`Street address${required ? " *" : ""}`} wide><input className={input} value={value.street} onChange={(e) => set({ street: e.target.value })} autoComplete="street-address" /></F>
      <F label="Suburb / area"><input className={input} value={value.suburb} onChange={(e) => set({ suburb: e.target.value })} /></F>
      <F label={`City / town${required ? " *" : ""}`}><input className={input} value={value.city} onChange={(e) => set({ city: e.target.value })} autoComplete="address-level2" /></F>
      <F label="Postal code"><input className={input} value={value.postcode} inputMode="numeric" onChange={(e) => set({ postcode: e.target.value })} autoComplete="postal-code" /></F>
      <F label="Province">
        <select className={input} value={value.province} onChange={(e) => set({ province: e.target.value })}>
          <option value="">Choose…</option>
          {PROVINCES.map((p) => <option key={p}>{p}</option>)}
        </select>
      </F>
    </>
  );
}

/**
 * The ZRG-X Customer Information Form: customer type, business details, primary
 * contact, addresses, authorised buyers (portal users), extra information and the
 * signed declaration. `office` shows the office-use section (back office only).
 */
export function CustomerInfoForm({ contact, profile, onContact, onProfile, office = false, today }: {
  contact: Contact; profile: CustomerProfile;
  onContact: (c: Contact) => void; onProfile: (p: CustomerProfile) => void;
  office?: boolean; today: string;
}) {
  const set = (patch: Partial<CustomerProfile>) => onProfile({ ...profile, ...patch });
  const setC = (patch: Partial<Contact>) => onContact({ ...contact, ...patch });
  const business = profile.customerType !== "individual";
  const users: PortalUser[] = profile.portalUsers.length ? profile.portalUsers : [{ name: contact.name, email: contact.email, mobile: profile.mobile }];
  // The primary contact is the first authorised buyer unless changed: keep it in the saved form, not just on screen.
  useEffect(() => {
    if (!profile.portalUsers.length && contact.email.trim()) onProfile({ ...profile, portalUsers: [{ name: contact.name, email: contact.email, mobile: profile.mobile }] });
  }, [profile, contact, onProfile]);
  const setUser = (i: number, patch: Partial<PortalUser>) => set({ portalUsers: users.map((u, j) => (j === i ? { ...u, ...patch } : u)) });
  const decl = profile.declaration ?? { name: contact.name, capacity: profile.contactPosition, place: "", date: today, signature: null };
  const setDecl = (patch: Partial<NonNullable<CustomerProfile["declaration"]>>) => set({ declaration: { ...decl, ...patch } });

  return (
    <div className="space-y-6">
      <Section n={1} title="Customer type *">
        <div className="flex flex-wrap gap-2 sm:col-span-2" role="radiogroup" aria-label="Customer type">
          {(Object.keys(CUSTOMER_TYPE_LABEL) as CustomerProfile["customerType"][]).map((t) => (
            <button key={t} type="button" role="radio" aria-checked={profile.customerType === t} onClick={() => set({ customerType: t })}
              className={`min-h-11 border-2 border-ink px-4 font-mono text-xs font-bold uppercase tracking-wider ${profile.customerType === t ? "bg-ink text-lime" : "hover:bg-lime"}`}>
              {CUSTOMER_TYPE_LABEL[t]}
            </button>
          ))}
        </div>
      </Section>

      {business && (
        <Section n={2} title="Company / business details">
          <F label="Registered company / business name *" wide><input className={input} value={profile.registeredName || contact.company} onChange={(e) => { set({ registeredName: e.target.value }); setC({ company: e.target.value }); }} autoComplete="organization" /></F>
          <F label="Trading name (if different)"><input className={input} value={profile.tradingName} onChange={(e) => set({ tradingName: e.target.value })} /></F>
          <F label="Company registration number"><input className={input} value={profile.registrationNumber} onChange={(e) => set({ registrationNumber: e.target.value })} /></F>
          <F label="VAT registration number" hint="Optional: 10 digits starting with 4."><input className={input} value={contact.vat} inputMode="numeric" onChange={(e) => setC({ vat: e.target.value })} /></F>
          <F label="Industry / nature of business"><input className={input} value={profile.industry} onChange={(e) => set({ industry: e.target.value })} /></F>
        </Section>
      )}

      <Section n={business ? 3 : 2} title="Primary contact person *">
        <F label="Full name *"><input className={input} value={contact.name} onChange={(e) => setC({ name: e.target.value })} autoComplete="name" /></F>
        <F label="Position / job title"><input className={input} value={profile.contactPosition} onChange={(e) => set({ contactPosition: e.target.value })} autoComplete="organization-title" /></F>
        <F label="Email address *"><input className={input} type="email" value={contact.email} onChange={(e) => setC({ email: e.target.value })} autoComplete="email" /></F>
        <F label="Mobile number *"><input className={input} type="tel" value={profile.mobile} onChange={(e) => { set({ mobile: e.target.value }); setC({ phone: e.target.value }); }} autoComplete="tel" /></F>
        <F label="Landline number"><input className={input} type="tel" value={profile.landline} onChange={(e) => set({ landline: e.target.value })} /></F>
        <F label="Preferred contact method">
          <select className={input} value={profile.preferredContact} onChange={(e) => set({ preferredContact: e.target.value as CustomerProfile["preferredContact"] })}>
            <option value="">Choose…</option><option value="email">Email</option><option value="whatsapp">WhatsApp</option><option value="call">Call</option>
          </select>
        </F>
      </Section>

      <Section n={business ? 4 : 3} title="Addresses">
        <p className="font-bold sm:col-span-2">Physical / delivery address *</p>
        <AddressFields value={profile.delivery} onChange={(delivery) => set({ delivery })} required />
        <label className="flex items-center gap-3 text-sm sm:col-span-2">
          <input type="checkbox" checked={profile.billing !== null} onChange={(e) => set({ billing: e.target.checked ? emptyAddress() : null })} className="h-5 w-5 accent-[var(--color-ink)]" />
          Billing address is different
        </label>
        {profile.billing && <AddressFields value={profile.billing} onChange={(billing) => set({ billing })} />}
      </Section>

      <Section n={business ? 5 : 4} title="Authorised buyers / portal users *">
        <p className="text-sm text-ink-soft sm:col-span-2">
          People allowed to place orders on this account. Each one gets an email to set their own password, then signs in with their own
          email and sees the account&apos;s prices and history. Up to five; more can be added later in writing.
        </p>
        <div className="space-y-3 sm:col-span-2">
          {users.map((u, i) => (
            <div key={i} className="grid gap-2 border-2 border-line p-3 sm:grid-cols-[1fr_1fr_10rem_auto] sm:items-end">
              <F label={`${i + 1}. Full name *`}><input className={input} value={u.name} onChange={(e) => setUser(i, { name: e.target.value })} /></F>
              <F label="Email (sign-in) *"><input className={input} type="email" value={u.email} onChange={(e) => setUser(i, { email: e.target.value })} /></F>
              <F label="Mobile"><input className={input} type="tel" value={u.mobile} onChange={(e) => setUser(i, { mobile: e.target.value })} /></F>
              {users.length > 1 && (
                <button type="button" onClick={() => set({ portalUsers: users.filter((_, j) => j !== i) })} className="min-h-11 font-mono text-xs uppercase tracking-wider text-muted underline hover:text-flare">Remove</button>
              )}
            </div>
          ))}
          {users.length < 5 && (
            <button type="button" onClick={() => set({ portalUsers: [...users, { name: "", email: "", mobile: "" }] })} className="min-h-11 border-2 border-ink px-4 font-mono text-xs font-bold uppercase tracking-wider hover:bg-lime">
              Add authorised buyer
            </button>
          )}
        </div>
      </Section>

      <Section n={business ? 6 : 5} title="Additional information">
        <F label="How did you hear about us?"><input className={input} value={profile.heardAbout} onChange={(e) => set({ heardAbout: e.target.value })} /></F>
        <F label="Estimated monthly purchase volume (optional)"><input className={input} value={profile.monthlyVolume} onChange={(e) => set({ monthlyVolume: e.target.value })} placeholder="e.g. 4 × 210L drums" /></F>
        <F label="Special delivery or account notes" wide><textarea className={input} rows={3} value={profile.accountNotes} onChange={(e) => set({ accountNotes: e.target.value })} /></F>
      </Section>

      <Section n={business ? 7 : 6} title="Declaration & authorisation *">
        <ul className="list-inside list-disc space-y-1 text-sm text-ink-soft sm:col-span-2">
          <li>The information provided in this form is true and correct.</li>
          <li>I am authorised to open an account and nominate portal users on behalf of the customer.</li>
          <li>The persons listed above are authorised to place orders and make purchases.</li>
          <li>Access to the customer portal is subject to ZRG-X (PTY) LTD&apos;s terms and conditions.</li>
          <li>I will notify ZRG-X (PTY) LTD in writing of any changes to authorised users or contact details.</li>
        </ul>
        <F label="Full name *"><input className={input} value={decl.name} onChange={(e) => setDecl({ name: e.target.value })} /></F>
        <F label="Position / capacity"><input className={input} value={decl.capacity} onChange={(e) => setDecl({ capacity: e.target.value })} /></F>
        <F label="Signed at (town)"><input className={input} value={decl.place} onChange={(e) => setDecl({ place: e.target.value })} /></F>
        <F label="Date"><input className={input} type="date" value={decl.date} onChange={(e) => setDecl({ date: e.target.value })} /></F>
        <div className="sm:col-span-2">
          {decl.signature ? (
            <div>
              <img src={decl.signature} alt={`Signature of ${decl.name}`} className="h-24 w-full border-2 border-ink bg-white object-contain" />
              <button type="button" onClick={() => setDecl({ signature: null })} className="mt-2 font-mono text-xs uppercase tracking-wider text-muted underline hover:text-flare">Sign again</button>
            </div>
          ) : <SignaturePad onChange={(signature) => setDecl({ signature })} label="Sign here *" />}
        </div>
      </Section>

      {office && (
        <Section n={8} title="For office use only">
          <F label="Account number allocated"><input className={input} value={profile.office.accountNumber} onChange={(e) => set({ office: { ...profile.office, accountNumber: e.target.value } })} /></F>
          <F label="Date received"><input className={input} type="date" value={profile.office.receivedDate} onChange={(e) => set({ office: { ...profile.office, receivedDate: e.target.value } })} /></F>
          <F label="Portal access activated by"><input className={input} value={profile.office.activatedBy} onChange={(e) => set({ office: { ...profile.office, activatedBy: e.target.value } })} /></F>
          <F label="Date activated"><input className={input} type="date" value={profile.office.activatedDate} onChange={(e) => set({ office: { ...profile.office, activatedDate: e.target.value } })} /></F>
          <F label="Notes" wide><input className={input} value={profile.office.notes} onChange={(e) => set({ office: { ...profile.office, notes: e.target.value } })} /></F>
        </Section>
      )}
    </div>
  );
}
