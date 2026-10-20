"use client";

import { useState, type FormEvent } from "react";
import { useAuth } from "../AuthContext";
import { useBackoffice } from "./BackofficeContext";
import { Button, Field, Input, PageTitle, Panel } from "./ui";

/** Every staff member replaces the temporary password from Staff logins with their own. */
export function ChangePassword() {
  const { mode, admin } = useBackoffice();
  const { updatePassword } = useAuth();
  const [pw, setPw] = useState({ next: "", again: "" });
  const [error, setError] = useState<string | null>(null);
  const [done, setDone] = useState(false);
  const [busy, setBusy] = useState(false);

  async function submit(e: FormEvent) {
    e.preventDefault();
    setDone(false);
    if (pw.next.length < 12) return setError("Use at least 12 characters.");
    if (pw.next !== pw.again) return setError("The two passwords don't match.");
    setBusy(true);
    const result = await updatePassword(pw.next);
    setBusy(false);
    if (result.error) return setError(result.error);
    setError(null);
    setDone(true);
    setPw({ next: "", again: "" });
  }

  return (
    <>
      <PageTitle title="Change password" sub={admin ? `Your back-office password (${admin.email || admin.name}).` : undefined} />
      <Panel className="max-w-lg">
        {mode !== "live" ? <p className="text-sm text-ink-soft">The demo uses the sample password shown on the sign-in page.</p> : (
          <form onSubmit={submit} className="space-y-4" noValidate>
            {error && <p role="alert" className="border-2 border-flare p-3 text-sm">{error}</p>}
            {done && <p role="status" className="border-2 border-ink bg-lime p-3 text-sm">Password changed. Use it next time you sign in.</p>}
            <Field label="New password" hint="At least 12 characters."><Input type="password" autoComplete="new-password" value={pw.next} onChange={(e) => setPw({ ...pw, next: e.target.value })} /></Field>
            <Field label="New password again"><Input type="password" autoComplete="new-password" value={pw.again} onChange={(e) => setPw({ ...pw, again: e.target.value })} /></Field>
            <Button type="submit" tone="primary" disabled={busy}>{busy ? "Saving…" : "Change password"}</Button>
          </form>
        )}
      </Panel>
    </>
  );
}
