"use client";

import { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState, type ReactNode } from "react";
import { accountsEnabled } from "@/lib/supabase";
import { INDEXABLE } from "@/lib/site";
import { allowCustomerDemo } from "@/lib/customerDemo";
import { ADMIN_SESSION_KEY, demoAdminById, demoAdminMatch, type Admin, loadBackoffice, onBackofficeChange, resetBackoffice, saveBackoffice } from "@/lib/backoffice/local";
import { addDays, defaultsFor, todaySA } from "@/lib/backoffice/calc";
import type { BackofficeData, Client, Document, Supplier } from "@/lib/backoffice/types";
import { ActionError, ACTION_NAMES, defaultDelivery, runAction, type ActionName, type Actions, type Env } from "@/lib/backoffice/actions";
import { scopeBackoffice } from "@/lib/backoffice/scope";
import { BackofficeError, callBackoffice } from "@/lib/backoffice/api";
import { useAuth } from "../AuthContext";

export { defaultDelivery };
export type { AllocationTarget, ImportResult } from "@/lib/backoffice/actions";

/** demo: sample records in this browser. live: the business database through the back-office server. */
type Mode = "loading" | "demo" | "live" | "unavailable";

/** Why a live back office can't show records right now. */
export type LiveIssue = { kind: "notStaff" | "notSetUp" | "offline"; message: string };

type BackofficeState = Actions & {
  mode: Mode;
  signedIn: boolean;
  /** The admin signed in on this device. */
  admin: Admin | null;
  data: BackofficeData | null;
  today: string;
  /** Demo sign-in (sample passwords). */
  signIn: (email: string, password: string) => string | null;
  /** Live sign-in with the staff member's own account. */
  liveSignIn: (email: string, password: string) => Promise<string | null>;
  signOut: () => void;
  /** Live: someone is signed in to the website, but the records aren't showing yet (or can't). */
  authEmail: string | null;
  liveIssue: LiveIssue | null;
  /** Live: changes still on their way to the server, and the last save that failed. */
  saving: boolean;
  syncError: string | null;
  dismissSyncError: () => void;
  reload: () => void;
  newClient: (type: Client["type"]) => Client;
  newDocument: (kind: Document["kind"], clientId?: string) => Document;
  newSupplier: () => Supplier;
  /** A supplier invoice's stored file as a data URL. */
  openFile: (invoiceId: string) => Promise<string | null>;
  reset: () => void;
};

const Ctx = createContext<BackofficeState | null>(null);

export const uid = (prefix: string) => `${prefix}-${crypto.randomUUID().slice(0, 8)}`;

type LoadReply = { admin: Admin; data: BackofficeData | null; needsSetup: boolean };

/**
 * Back-office state. Every change runs through the shared actions
 * (lib/backoffice/actions.ts): in the demo on this browser's sample records;
 * live, first on this screen's copy (so the page updates at once) and then on
 * the server, which checks the staff member's role again and saves. The
 * server's answer replaces the local copy.
 */
export function BackofficeProvider({ children }: { children: ReactNode }) {
  const auth = useAuth();
  const [mode, setMode] = useState<Mode>("loading");
  const [admin, setAdmin] = useState<Admin | null>(null);
  const [data, setData] = useState<BackofficeData | null>(null);
  const [storageError, setStorageError] = useState(false);
  const [liveIssue, setLiveIssue] = useState<LiveIssue | null>(null);
  const [saving, setSaving] = useState(0);
  const [syncError, setSyncError] = useState<string | null>(null);
  // Latest data, so actions can compute results (like a new invoice number) synchronously.
  const dataRef = useRef<BackofficeData | null>(null);
  const queue = useRef<Promise<void>>(Promise.resolve());
  const pending = useRef(0);
  const today = useMemo(() => todaySA(), []);
  const replace = useCallback((next: BackofficeData | null) => { dataRef.current = next; setData(next); }, []);

  useEffect(() => {
    const demo = allowCustomerDemo(process.env.NEXT_PUBLIC_CUSTOMER_DEMO, window.location.hostname, accountsEnabled, INDEXABLE, process.env.NEXT_PUBLIC_DEMO_HOSTS);
    if (!demo) return setMode(accountsEnabled ? "live" : "unavailable");
    const loaded = loadBackoffice();
    replace(loaded);
    try { setAdmin(demoAdminById(sessionStorage.getItem(ADMIN_SESSION_KEY), loaded.reps)); } catch { /* memory only */ }
    setMode("demo");
    return onBackofficeChange(() => replace(loadBackoffice()));
  }, [replace]);

  // ----- Live: load the signed-in staff member's records from the server.
  const loadLive = useCallback(async () => {
    try {
      let reply = await callBackoffice<LoadReply>({ op: "load" });
      // The first main admin to sign in sets up the catalogue and business details from the website.
      if (reply.needsSetup && reply.admin.role === "main") {
        const { emptyData } = await import("@/lib/backoffice/seed");
        reply = await callBackoffice<LoadReply>({ op: "init", data: emptyData() }).catch(() => callBackoffice<LoadReply>({ op: "load" }));
      }
      setAdmin(reply.admin);
      if (pending.current === 0) replace(reply.data);
      setLiveIssue(reply.data ? null : { kind: "notSetUp", message: "The back office is being set up. A main admin signs in first; then reload this page." });
    } catch (e) {
      const status = e instanceof BackofficeError ? e.status : 0;
      const message = e instanceof Error ? e.message : "The back office isn't available.";
      setAdmin(null);
      replace(null);
      setLiveIssue({ kind: status === 403 ? "notStaff" : "offline", message });
    }
  }, [replace]);

  const userId = auth.user?.id ?? null;
  useEffect(() => {
    if (mode !== "live" || !auth.ready) return;
    if (!userId) { setAdmin(null); replace(null); setLiveIssue(null); return; }
    setLiveIssue(null);
    void loadLive();
  }, [mode, auth.ready, userId, loadLive, replace]);

  // Pick up other staff members' changes when coming back to the tab, and every few minutes.
  useEffect(() => {
    if (mode !== "live" || !admin) return;
    const refresh = () => { if (pending.current === 0 && document.visibilityState === "visible") void loadLive(); };
    window.addEventListener("focus", refresh);
    const timer = window.setInterval(refresh, 180000);
    return () => { window.removeEventListener("focus", refresh); window.clearInterval(timer); };
  }, [mode, admin, loadLive]);

  /** Live: send one change to the server, in order. Its reply becomes the records once nothing else is waiting. */
  const send = useCallback((name: ActionName, args: unknown[], ids: string[]) => {
    pending.current += 1;
    setSaving(pending.current);
    queue.current = queue.current.then(async () => {
      let failed = false;
      try {
        const reply = await callBackoffice<{ data: BackofficeData }>({ op: "act", name, args, ids });
        if (pending.current === 1) replace(reply.data);
      } catch (e) {
        failed = true;
        setSyncError(`Not saved: ${e instanceof Error ? e.message : "try again."}`);
      }
      pending.current -= 1;
      setSaving(pending.current);
      // Show the server's records again so nothing unsaved stays on screen.
      if (failed && pending.current === 0) await loadLive();
    });
  }, [replace, loadLive]);

  /** Run an action on this screen's copy; live, also send it to the server. */
  const act = useCallback(<N extends ActionName>(name: N, args: Parameters<Actions[N]>): ReturnType<Actions[N]> => {
    if (!dataRef.current || !admin || (mode !== "demo" && mode !== "live")) throw new ActionError("Sign in to the back office first.");
    const ids: string[] = [];
    const env: Env = { today, uid: (prefix) => { const value = uid(prefix); ids.push(value); return value; } };
    const next = structuredClone(dataRef.current);
    const result = runAction(next, admin, name, args, env);
    replace(next);
    if (mode === "demo") setStorageError(!saveBackoffice(next));
    else send(name, args as unknown[], ids);
    return result;
  }, [admin, mode, today, replace, send]);

  // Reps see only their own customers and those customers' documents (live, the server already did this).
  const visible = useMemo(() => data ? scopeBackoffice(data, admin) : null, [data, admin]);

  const api = useMemo<BackofficeState>(() => {
    const actions = Object.fromEntries(ACTION_NAMES.map((name) => [name, (...args: unknown[]) => act(name, args as never)])) as unknown as Actions;
    return {
      ...actions,
      mode,
      signedIn: admin !== null,
      admin,
      data: visible,
      today,
      authEmail: mode === "live" ? auth.user?.email ?? null : null,
      liveIssue,
      saving: saving > 0,
      syncError,
      dismissSyncError: () => setSyncError(null),
      reload: () => { setLiveIssue(null); void loadLive(); },
      signIn(email, password) {
        if (mode !== "demo") return "Use your own staff email and password.";
        const match = demoAdminMatch(email, password, dataRef.current?.reps);
        if (!match) return "Use one of the demo admin emails and the password shown on this page.";
        try { sessionStorage.setItem(ADMIN_SESSION_KEY, match.id); } catch { /* memory only */ }
        setAdmin(match);
        return null;
      },
      async liveSignIn(email, password) {
        const { error } = await auth.signIn(email.trim(), password);
        return error;
      },
      signOut() {
        if (mode === "live") { void auth.signOut(); setAdmin(null); replace(null); return; }
        try { sessionStorage.removeItem(ADMIN_SESSION_KEY); } catch { /* memory only */ }
        setAdmin(null);
      },
      newClient(type) {
        return { id: uid("c"), type, name: "", company: "", email: "", phone: "", vat: "", address: "", city: "", notes: "",
          tier: defaultsFor(type).tier, prices: {}, linkedEmail: "", createdAt: today };
      },
      newDocument(kind, clientId = "") {
        const client = visible?.clients.find((c) => c.id === clientId);
        const days = kind === "quote" ? visible?.settings.quoteValidDays ?? 14 : visible?.settings.paymentTermsDays ?? 7;
        return { id: uid(kind === "quote" ? "q" : "i"), kind, number: "", clientId, date: today, dueDate: addDays(today, days),
          channel: client ? defaultsFor(client.type).channel : "private", lines: [], courier: 0, notes: "", reference: "",
          quoteState: "draft", linkedId: null, cancelled: false, payments: [], createdAt: today,
          ...(kind === "invoice" ? { delivery: defaultDelivery(client) } : {}) };
      },
      newSupplier() {
        return { id: uid("s"), name: "", contact: "", email: "", phone: "", vat: "", bankMatch: "", notes: "", createdAt: today };
      },
      async openFile(invoiceId) {
        const local = dataRef.current?.supplierInvoices.find((x) => x.id === invoiceId)?.attachment?.dataUrl;
        if (local || mode !== "live") return local ?? null;
        const file = await callBackoffice<{ dataUrl: string }>({ op: "file", invoiceId });
        return file.dataUrl;
      },
      reset() {
        if (mode !== "demo" || admin?.role !== "main") throw new ActionError("Only the demo can be reset.");
        replace(resetBackoffice());
      },
    };
  }, [act, mode, admin, visible, today, auth, liveIssue, saving, syncError, loadLive, replace]);

  return <Ctx.Provider value={api}>{storageError && <p role="alert" className="border-2 border-flare bg-paper p-4 text-sm">Browser storage is full or blocked. Changes are in memory only; keep this page open and export your work before leaving.</p>}{children}</Ctx.Provider>;
}

export function useBackoffice(): BackofficeState {
  const ctx = useContext(Ctx);
  if (!ctx) throw new Error("useBackoffice must be used inside BackofficeProvider");
  return ctx;
}
