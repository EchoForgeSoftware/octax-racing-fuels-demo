"use client";

import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { useEffect, useState, type FormEvent, type ReactNode } from "react";
import { useAuth } from "../AuthContext";
import { Icon } from "../Icon";
import { BotCheck, useBotCheck } from "../BotCheck";
import { DEMO_EMAIL, DEMO_PASSWORD } from "@/lib/customerDemo";

const inputClass =
  "mt-1.5 w-full border-2 border-ink bg-paper-2 px-3 py-2.5 text-base outline-none transition-colors focus:bg-panel aria-[invalid=true]:border-flare";
const buttonClass =
  "flex w-full items-center justify-center gap-2 border-2 border-ink bg-flare px-5 py-3.5 font-display uppercase text-paper transition-colors hover:bg-ink disabled:cursor-wait disabled:opacity-60";

export function AuthCard({ title, intro, children }: { title: string; intro?: ReactNode; children: ReactNode }) {
  const { enabled, demo } = useAuth();
  return (
    <div className="mx-auto max-w-md border-2 border-ink bg-panel p-6 shadow-[10px_10px_0_0_var(--color-lime)] sm:p-8">
      <h1 className="font-display text-[clamp(2rem,7vw,3rem)] leading-none">{title}</h1>
      {intro && <div className="mt-3 text-ink-soft">{intro}</div>}
      {demo && <div className="mt-5 border-2 border-ink bg-lime p-3 text-sm"><strong>Try the demo customer</strong><p className="mt-2 break-all">Email: <span className="font-mono">{DEMO_EMAIL}</span></p><p>Password: <span className="font-mono">{DEMO_PASSWORD}</span></p><p className="mt-2 text-xs">Sample data only. Registration and password-reset emails require the live account service.</p></div>}
      {!enabled && (
        <p className="mt-5 border-2 border-dashed border-ink bg-paper-2 p-3 text-sm text-ink-soft">
          Customer accounts are being switched on. Until then you can browse products and build your cart.
        </p>
      )}
      <div className="mt-6">{children}</div>
    </div>
  );
}

function TextField({ name, label, type = "text", autoComplete, error, defaultValue }: {
  name: string;
  label: string;
  type?: string;
  autoComplete?: string;
  error?: string;
  defaultValue?: string;
}) {
  return (
    <div>
      <label htmlFor={name} className="kicker text-ink-soft">{label}</label>
      <input
        id={name}
        name={name}
        type={type}
        autoComplete={autoComplete}
        maxLength={type === "password" ? 128 : 254}
        defaultValue={defaultValue}
        aria-invalid={!!error}
        aria-describedby={error ? `${name}-err` : undefined}
        className={inputClass}
      />
      {error && <p id={`${name}-err`} className="mt-1.5 font-mono text-xs text-flare">{error}</p>}
    </div>
  );
}

function Notice({ tone, children }: { tone: "error" | "ok"; children: ReactNode }) {
  return (
    <p
      role={tone === "error" ? "alert" : "status"}
      className={`border-2 p-3 text-sm ${tone === "error" ? "border-flare bg-flare/5 text-ink" : "border-ink bg-lime text-ink"}`}
    >
      {children}
    </p>
  );
}

const emailOk = (v: string) => /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(v);

export function LoginForm() {
  const bot = useBotCheck();
  const { signIn, user, ready, enabled, demo } = useAuth();
  const router = useRouter();
  const params = useSearchParams();
  // Only permit known local destinations; never pass arbitrary query input to
  // the router (which also accepts executable and external URLs).
  const next = params.get("next") === "/checkout/" ? "/checkout/" : "/account/";
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    if (ready && user) router.replace(next);
  }, [ready, user, next, router]);

  async function onSubmit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const data = new FormData(e.currentTarget);
    const email = String(data.get("email") ?? "").trim();
    const password = String(data.get("password") ?? "");
    if (!emailOk(email) || !password) return setError("Enter your email and password.");
    if ((!demo && bot.pending) || busy) return;
    setBusy(true);
    const { error } = await signIn(email, password, bot.token || undefined);
    bot.reset();
    setBusy(false);
    if (error) return setError(error);
    router.push(next);
  }

  return (
    <form onSubmit={onSubmit} noValidate className="space-y-5">
      {error && <Notice tone="error">{error}</Notice>}
      <TextField name="email" label="Email" type="email" autoComplete="email" />
      <TextField name="password" label="Password" type="password" autoComplete="current-password" />
      <div className="flex justify-end">
        <Link href="/account/forgot-password/" className="font-mono text-xs uppercase tracking-wider text-ink-soft underline hover:text-flare">
          Forgot password?
        </Link>
      </div>
      {!demo && <BotCheck key={bot.attempt} action="login" onToken={bot.setToken} />}
      <button type="submit" disabled={busy || !enabled || !ready || (!demo && bot.pending)} className={buttonClass}>
        {busy ? "Signing in…" : "Sign in"} <Icon name="arrow" size={16} />
      </button>
      <p className="text-center text-sm text-ink-soft">
        New here?{" "}
        <Link href="/account/register/" className="font-bold text-ink underline hover:text-flare">Create an account</Link>
      </p>
    </form>
  );
}

export function RegisterForm() {
  const bot = useBotCheck();
  const { signUp, enabled, ready } = useAuth();
  const router = useRouter();
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [error, setError] = useState<string | null>(null);
  const [sentTo, setSentTo] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  async function onSubmit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const data = new FormData(e.currentTarget);
    const name = String(data.get("name") ?? "").trim();
    const email = String(data.get("email") ?? "").trim();
    const password = String(data.get("password") ?? "");
    const confirm = String(data.get("confirm") ?? "");
    const next: Record<string, string> = {};
    if (!name) next.name = "Enter your name.";
    if (!emailOk(email)) next.email = "Enter an email like name@example.com.";
    if (password.length < 12) next.password = "Use at least 12 characters.";
    if (confirm !== password) next.confirm = "The passwords don't match.";
    setErrors(next);
    setError(null);
    if (Object.keys(next).length) return;
    if (bot.pending || busy) return;
    setBusy(true);
    const res = await signUp(name, email, password, bot.token || undefined);
    bot.reset();
    setBusy(false);
    if (res.error) return setError(res.error);
    if (res.needsConfirmation) return setSentTo(email);
    router.push("/account/");
  }

  if (sentTo) {
    return (
      <Notice tone="ok">
        Check your inbox: we sent a confirmation link to <strong>{sentTo}</strong>. Open it to
        activate your account, then sign in.
      </Notice>
    );
  }

  return (
    <form onSubmit={onSubmit} noValidate className="space-y-5">
      {error && <Notice tone="error">{error}</Notice>}
      <TextField name="name" label="Full name" autoComplete="name" error={errors.name} />
      <TextField name="email" label="Email" type="email" autoComplete="email" error={errors.email} />
      <TextField name="password" label="Password (12+ characters)" type="password" autoComplete="new-password" error={errors.password} />
      <TextField name="confirm" label="Confirm password" type="password" autoComplete="new-password" error={errors.confirm} />
      <p className="text-xs text-muted">Read the <Link href="/privacy/" className="underline">privacy notice</Link> to see how account details are used.</p>
      <BotCheck key={bot.attempt} action="register" onToken={bot.setToken} />
      <button type="submit" disabled={busy || !enabled || !ready || bot.pending} className={buttonClass}>
        {busy ? "Creating account…" : "Create account"} <Icon name="arrow" size={16} />
      </button>
      <p className="text-center text-sm text-ink-soft">
        Already have an account?{" "}
        <Link href="/account/login/" className="font-bold text-ink underline hover:text-flare">Sign in</Link>
      </p>
    </form>
  );
}

export function ForgotPasswordForm() {
  const bot = useBotCheck();
  const { sendPasswordReset, enabled, ready } = useAuth();
  const [error, setError] = useState<string | null>(null);
  const [sentTo, setSentTo] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  async function onSubmit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const email = String(new FormData(e.currentTarget).get("email") ?? "").trim();
    if (!emailOk(email)) return setError("Enter the email you signed up with.");
    if (bot.pending || busy) return;
    setBusy(true);
    const res = await sendPasswordReset(email, bot.token || undefined);
    bot.reset();
    setBusy(false);
    if (res.error) return setError(res.error);
    setSentTo(email);
  }

  if (sentTo) {
    return (
      <Notice tone="ok">
        If there is an account for <strong>{sentTo}</strong>, a reset link is on its way. Open it
        to choose a new password.
      </Notice>
    );
  }

  return (
    <form onSubmit={onSubmit} noValidate className="space-y-5">
      {error && <Notice tone="error">{error}</Notice>}
      <TextField name="email" label="Email" type="email" autoComplete="email" />
      <BotCheck key={bot.attempt} action="reset" onToken={bot.setToken} />
      <button type="submit" disabled={busy || !enabled || !ready || bot.pending} className={buttonClass}>
        {busy ? "Sending…" : "Send reset link"} <Icon name="arrow" size={16} />
      </button>
      <p className="text-center text-sm text-ink-soft">
        Remembered it?{" "}
        <Link href="/account/login/" className="font-bold text-ink underline hover:text-flare">Sign in</Link>
      </p>
    </form>
  );
}

export function ResetPasswordForm() {
  const { updatePassword, user, ready, recovering, enabled } = useAuth();
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [error, setError] = useState<string | null>(null);
  const [done, setDone] = useState(false);
  const [busy, setBusy] = useState(false);

  async function onSubmit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const data = new FormData(e.currentTarget);
    const password = String(data.get("password") ?? "");
    const confirm = String(data.get("confirm") ?? "");
    const next: Record<string, string> = {};
    if (password.length < 12) next.password = "Use at least 12 characters.";
    if (confirm !== password) next.confirm = "The passwords don't match.";
    setErrors(next);
    if (Object.keys(next).length) return;
    setBusy(true);
    const res = await updatePassword(password);
    setBusy(false);
    if (res.error) return setError(res.error);
    setDone(true);
  }

  if (done) {
    return (
      <div className="space-y-5">
        <Notice tone="ok">Your password has been changed.</Notice>
        <Link href="/account/" className={buttonClass}>Go to my account <Icon name="arrow" size={16} /></Link>
      </div>
    );
  }

  // The reset link signs the customer in; without that session the link has expired.
  if (enabled && ready && !user && !recovering) {
    return (
      <div className="space-y-5">
        <Notice tone="error">This reset link has expired or was already used. Request a new one.</Notice>
        <Link href="/account/forgot-password/" className={buttonClass}>Send a new link <Icon name="arrow" size={16} /></Link>
      </div>
    );
  }

  return (
    <form onSubmit={onSubmit} noValidate className="space-y-5">
      {error && <Notice tone="error">{error}</Notice>}
      <TextField name="password" label="New password (12+ characters)" type="password" autoComplete="new-password" error={errors.password} />
      <TextField name="confirm" label="Confirm new password" type="password" autoComplete="new-password" error={errors.confirm} />
      <button type="submit" disabled={busy || !enabled || !ready || !user} className={buttonClass}>
        {busy ? "Saving…" : "Set new password"} <Icon name="arrow" size={16} />
      </button>
    </form>
  );
}
