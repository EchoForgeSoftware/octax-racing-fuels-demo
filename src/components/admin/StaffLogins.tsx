"use client";

import { useCallback, useEffect, useState, type FormEvent } from "react";
import { callBackoffice } from "@/lib/backoffice/api";
import { ROLE_LABEL, type Role } from "@/lib/backoffice/roles";
import { useBackoffice } from "./BackofficeContext";
import { Button, Field, Input, Panel, Select } from "./ui";

type Login = { user_id: string; display_name: string; role: Role; active: boolean; email: string | null };

const ROLES: { value: Role; label: string }[] = [
  { value: "main", label: "Main admin (everything)" },
  { value: "viewer", label: "Orders, invoices and customers (no prices)" },
  { value: "accounts", label: "Accounts" },
  { value: "rep", label: "Sales rep (own customers)" },
];

/**
 * Live: main admins create staff logins here (confirmed straight away, no
 * email needed) and switch them off. Each person then changes the temporary
 * password under Change password.
 */
export function StaffLogins() {
  const { admin, data } = useBackoffice();
  const [staff, setStaff] = useState<Login[] | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [f, setF] = useState({ email: "", name: "", role: "viewer" as Role, password: "" });

  const run = useCallback(async (body: Record<string, unknown>) => {
    setBusy(true);
    setError(null);
    try {
      const reply = await callBackoffice<{ staff: Login[] }>(body);
      setStaff(reply.staff);
      return true;
    } catch (e) {
      setError(e instanceof Error ? e.message : "That didn't work. Try again.");
      return false;
    } finally {
      setBusy(false);
    }
  }, []);

  useEffect(() => { void run({ op: "staff" }); }, [run]);

  async function create(e: FormEvent) {
    e.preventDefault();
    setNotice(null);
    const email = f.email.trim().toLowerCase();
    if (await run({ op: "createLogin", ...f, email })) {
      setNotice(`Login ready for ${f.name.trim()} (${email}). Give them the temporary password in person or by phone, not on WhatsApp. They sign in at octa-boost.com/admin and change it under Change password.`);
      setF({ email: "", name: "", role: "viewer", password: "" });
    }
  }

  const reps = data?.reps.filter((r) => r.active) ?? [];
  return (
    <Panel title="Staff logins">
      <p className="mb-3 text-sm text-ink-soft">Create a back-office login for someone: it works straight away, no confirmation email needed. Customers still sign up on the website themselves.</p>
      {error && <p role="alert" className="mb-3 border-2 border-flare p-3 text-sm">{error}</p>}
      {notice && <p role="status" className="mb-3 border-2 border-ink bg-lime p-3 text-sm">{notice}</p>}
      {staff === null ? <p className="text-sm text-muted">{busy ? "Loading…" : ""}</p> : (
        <ul className="divide-y divide-line">
          {staff.map((s) => (
            <li key={s.user_id} className={`flex flex-wrap items-center justify-between gap-3 py-2 text-sm ${s.active ? "" : "opacity-60"}`}>
              <span>
                <strong>{s.display_name}</strong>{admin?.id === s.user_id && <span className="ml-2 bg-lime px-1.5 py-0.5 font-mono text-[0.65rem] uppercase">You</span>}
                <span className="block break-all text-ink-soft">{ROLE_LABEL[s.role]} · <span className="font-mono text-xs">{s.email ?? "—"}</span></span>
              </span>
              {admin?.id !== s.user_id && (
                <Button disabled={busy} onClick={() => void run({ op: "setStaffActive", userId: s.user_id, active: !s.active })}>{s.active ? "Switch off" : "Switch on"}</Button>
              )}
            </li>
          ))}
        </ul>
      )}
      <form onSubmit={create} className="mt-4 grid gap-3 border-t-2 border-ink pt-4 sm:grid-cols-2" noValidate>
        <h3 className="font-display text-lg sm:col-span-2">Create or fix a login</h3>
        <Field label="Email" hint="Their OCTA email, e.g. zuan@octa-boost.com."><Input type="email" autoComplete="off" value={f.email} onChange={(e) => setF({ ...f, email: e.target.value })} /></Field>
        <Field label="Name"><Input value={f.name} onChange={(e) => setF({ ...f, name: e.target.value })} /></Field>
        <Field label="Role">
          <Select value={f.role} onChange={(e) => setF({ ...f, role: e.target.value as Role })}>
            {ROLES.map((r) => <option key={r.value} value={r.value}>{r.label}</option>)}
          </Select>
        </Field>
        <Field label="Temporary password" hint="At least 12 characters. They change it after signing in.">
          <Input type="text" autoComplete="new-password" value={f.password} onChange={(e) => setF({ ...f, password: e.target.value })} />
        </Field>
        {f.role === "rep" && <p className="text-xs text-muted sm:col-span-2">Reps: add them under Sales reps first with the same email{reps.length ? "" : " (none yet)"}.</p>}
        <p className="text-xs text-muted sm:col-span-2">If the email already has an account (for example stuck waiting for a confirmation email), this confirms it and sets the new password.</p>
        <div className="sm:col-span-2"><Button type="submit" tone="primary" disabled={busy}>{busy ? "Working…" : "Create login"}</Button></div>
      </form>
    </Panel>
  );
}
