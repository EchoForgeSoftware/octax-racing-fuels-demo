"use client";

import { createContext, useContext, useEffect, useMemo, useState, type ReactNode } from "react";
import type { User } from "@supabase/supabase-js";
import { accountsEnabled, getSupabase, type Profile } from "@/lib/supabase";
import { asset, INDEXABLE } from "@/lib/site";
import { allowCustomerDemo, DEMO_EMAIL, DEMO_USER_ID, DEMO_SESSION_KEY, demoCredentialsMatch, initialDemoProfile } from "@/lib/customerDemo";

type Result = { error: string | null };

type AuthState = {
  demo?: boolean;
  enabled: boolean;
  ready: boolean;
  user: User | null;
  profile: Profile | null;
  /** True after arriving from a password-reset email link. */
  recovering: boolean;
  signIn: (email: string, password: string, captchaToken?: string) => Promise<Result>;
  signUp: (name: string, email: string, password: string, captchaToken?: string) => Promise<Result & { needsConfirmation: boolean }>;
  signOut: () => Promise<Result>;
  sendPasswordReset: (email: string, captchaToken?: string) => Promise<Result>;
  updatePassword: (password: string) => Promise<Result>;
  saveProfile: (fields: Omit<Profile, "id">) => Promise<Result>;
};

const NOT_CONNECTED = "Customer accounts are not connected yet. You can still browse products and build your cart.";
const AuthCtx = createContext<AuthState | null>(null);

/** Friendlier wording for the Supabase errors customers are most likely to hit. */
function friendly(message: string): string {
  const m = message.toLowerCase();
  if (m.includes("invalid login")) return "That email and password don't match. Check them or reset your password.";
  if (m.includes("email not confirmed")) return "Confirm your email first: open the link we sent you, then sign in.";
  if (m.includes("already registered")) return "There is already an account with that email. Sign in or reset your password.";
  if (m.includes("password should be")) return "Use a password of at least 12 characters.";
  if (m.includes("captcha")) return "Please complete a fresh security check and try again.";
  if (m.includes("rate limit")) return "Too many attempts. Wait a minute and try again.";
  return message;
}

async function safely<T>(action: () => Promise<T>, fallback: T): Promise<T> {
  try { return await action(); } catch { return fallback; }
}

const CONNECTION_ERROR = "We couldn't connect. Check your connection and try again.";
const authRedirect = (path: string) => new URL(asset(path), window.location.origin).href;

export function AuthProvider({ children }: { children: ReactNode }) {
  const [demo, setDemo] = useState(false);
  useEffect(() => {
    setDemo(allowCustomerDemo(process.env.NEXT_PUBLIC_CUSTOMER_DEMO, window.location.hostname, accountsEnabled, INDEXABLE, process.env.NEXT_PUBLIC_DEMO_HOSTS));
  }, []);
  return demo ? <LocalDemoProvider>{children}</LocalDemoProvider> : <ConnectedAuthProvider>{children}</ConnectedAuthProvider>;
}

function LocalDemoProvider({ children }: { children: ReactNode }) {
  const [ready, setReady] = useState(false);
  const [signedIn, setSignedIn] = useState(false);
  const [profile, setProfile] = useState<Profile>(initialDemoProfile);
  useEffect(() => {
    try {
      const saved = JSON.parse(sessionStorage.getItem(DEMO_SESSION_KEY) || "null");
      if (saved?.signedIn === true) setSignedIn(true);
      if (saved?.profile?.id === DEMO_USER_ID) {
        const clean = initialDemoProfile();
        for (const key of ["full_name", "phone", "company", "vat_number", "address", "city", "postcode"] as const) {
          if (typeof saved.profile[key] === "string") clean[key] = saved.profile[key].slice(0, key === "address" ? 500 : 200);
        }
        setProfile(clean);
      }
    } catch { /* Storage is optional; this demo also works in memory. */ }
    setReady(true);
  }, []);
  useEffect(() => {
    if (!ready) return;
    try { sessionStorage.setItem(DEMO_SESSION_KEY, JSON.stringify({ signedIn, profile })); } catch { /* In-memory fallback. */ }
  }, [signedIn, profile, ready]);
  const user: User | null = signedIn ? { id: DEMO_USER_ID, email: DEMO_EMAIL, app_metadata: {}, user_metadata: { full_name: "Alex Demo" }, aud: "local-demo", created_at: "2026-10-01T00:00:00Z" } : null;
  const unavailable = async () => ({ error: "This local demo does not create accounts, send reset emails or change passwords. Use the sample sign-in shown above." });
  const api: AuthState = {
    demo: true, enabled: true, ready, user, profile: signedIn ? profile : null, recovering: false,
    signIn: async (email, password) => {
      if (!demoCredentialsMatch(email, password)) return { error: "Use the demo email and password shown above." };
      setSignedIn(true); return { error: null };
    },
    signOut: async () => { setSignedIn(false); return { error: null }; },
    signUp: async () => ({ ...await unavailable(), needsConfirmation: false }),
    sendPasswordReset: unavailable, updatePassword: unavailable,
    saveProfile: async fields => {
      if (!signedIn) return { error: "Sign in to the demo first." };
      setProfile({ ...fields, id: DEMO_USER_ID }); return { error: null };
    },
  };
  return <AuthCtx.Provider value={api}>
    <div role="note" className="border-b-2 border-ink bg-lime px-5 py-3 text-center text-sm text-ink">
      <strong>DEMO MODE</strong> · Sample data only. No real orders, payments or emails. Changes stay in this browser.
      {" "}<a href={asset("/admin/")} className="font-bold underline">Open back office demo</a>
    </div>
    {children}
  </AuthCtx.Provider>;
}

function ConnectedAuthProvider({ children }: { children: ReactNode }) {
  const [ready, setReady] = useState(!accountsEnabled);
  const [user, setUser] = useState<User | null>(null);
  const [profile, setProfile] = useState<Profile | null>(null);
  const [recovering, setRecovering] = useState(false);

  // Fetch outside onAuthStateChange: database calls inside that callback can
  // wait on the same auth lock. Cancel stale reads when the customer changes.
  const userId = user?.id;
  const fullName = user?.user_metadata?.full_name;
  useEffect(() => {
    const sb = getSupabase();
    setProfile(null);
    if (!sb || !userId) return;
    let active = true;
    const fallback: Profile = { id: userId, full_name: fullName ?? null, phone: null, company: null, vat_number: null, address: null, city: null, postcode: null };
    void safely(async () => {
      const { data } = await sb.from("profiles").select("*").eq("id", userId).maybeSingle();
      return (data as Profile | null) ?? fallback;
    }, fallback).then((value) => { if (active) setProfile(value); });
    return () => { active = false; };
  }, [userId, fullName]);

  useEffect(() => {
    const sb = getSupabase();
    if (!sb) return;
    let active = true;
    void sb.auth.getSession().then(({ data }) => {
      if (!active) return;
      setUser(data.session?.user ?? null);
    }).catch(() => { if (active) setUser(null); })
      .finally(() => { if (active) setReady(true); });
    const { data: sub } = sb.auth.onAuthStateChange((event, session) => {
      if (!active) return;
      if (event === "PASSWORD_RECOVERY") setRecovering(true);
      if (event === "SIGNED_OUT") setRecovering(false);
      setUser(session?.user ?? null);
    });
    return () => { active = false; sub.subscription.unsubscribe(); };
  }, []);

  const api = useMemo<AuthState>(() => ({
    enabled: accountsEnabled,
    ready,
    user,
    profile: profile?.id === user?.id ? profile : null,
    recovering,
    signIn: (email, password, captchaToken) => safely(async () => {
      const sb = getSupabase();
      if (!sb) return { error: NOT_CONNECTED };
      const { error } = await sb.auth.signInWithPassword({ email, password, options: { captchaToken } });
      return { error: error ? friendly(error.message) : null };
    }, { error: CONNECTION_ERROR }),
    signUp: (name, email, password, captchaToken) => safely(async () => {
      const sb = getSupabase();
      if (!sb) return { error: NOT_CONNECTED, needsConfirmation: false };
      const { data, error } = await sb.auth.signUp({
        email,
        password,
        options: { data: { full_name: name }, emailRedirectTo: authRedirect("/account/"), captchaToken },
      });
      return { error: error ? friendly(error.message) : null, needsConfirmation: !error && !data.session };
    }, { error: CONNECTION_ERROR, needsConfirmation: false }),
    signOut: () => safely(async () => {
      const sb = getSupabase();
      if (!sb) return { error: NOT_CONNECTED };
      const { error } = await sb.auth.signOut();
      if (error) return { error: friendly(error.message) };
      setRecovering(false);
      return { error: null };
    }, { error: CONNECTION_ERROR }),
    sendPasswordReset: (email, captchaToken) => safely(async () => {
      const sb = getSupabase();
      if (!sb) return { error: NOT_CONNECTED };
      const { error } = await sb.auth.resetPasswordForEmail(email, { redirectTo: authRedirect("/account/reset-password/"), captchaToken });
      return { error: error ? friendly(error.message) : null };
    }, { error: CONNECTION_ERROR }),
    updatePassword: (password) => safely(async () => {
      const sb = getSupabase();
      if (!sb) return { error: NOT_CONNECTED };
      const { error } = await sb.auth.updateUser({ password });
      if (!error) setRecovering(false);
      return { error: error ? friendly(error.message) : null };
    }, { error: CONNECTION_ERROR }),
    saveProfile: (fields) => safely(async () => {
      const sb = getSupabase();
      if (!sb || !user) return { error: NOT_CONNECTED };
      const row = { id: user.id, ...fields, updated_at: new Date().toISOString() };
      const { error } = await sb.from("profiles").upsert(row);
      if (!error) setProfile({ id: user.id, ...fields });
      return { error: error ? friendly(error.message) : null };
    }, { error: CONNECTION_ERROR }),
  }), [ready, user, profile, recovering]);

  return <AuthCtx.Provider value={api}>{children}</AuthCtx.Provider>;
}

export function useAuth(): AuthState {
  const ctx = useContext(AuthCtx);
  if (!ctx) throw new Error("useAuth must be used within AuthProvider");
  return ctx;
}
