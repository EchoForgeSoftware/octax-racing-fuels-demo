"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useEffect, useState, type FormEvent, type ReactNode } from "react";
import { BackofficeProvider, useBackoffice } from "./BackofficeContext";
import { OctaLogo } from "../brand/Wordmark";
import { Button, Field, Input } from "./ui";
import { BotCheck, useBotCheck } from "../BotCheck";
import { DEMO_ADMIN_PASSWORD } from "@/lib/backoffice/local";
import { ROLE_LABEL, STAFF, areaForPath, canView, homeFor, type Area } from "@/lib/backoffice/roles";

const NAV: { href: string; label: string; area: Area }[] = [
  { href: "/admin/", label: "Dashboard", area: "dashboard" },
  { href: "/admin/invoices/", label: "Invoices", area: "invoices" },
  { href: "/admin/quotes/", label: "Quotes", area: "quotes" },
  { href: "/admin/clients/", label: "Clients", area: "clients" },
  { href: "/admin/products/", label: "Products & pricing", area: "products" },
  { href: "/admin/suppliers/", label: "Suppliers", area: "suppliers" },
  { href: "/admin/bank/", label: "Bank", area: "bank" },
  { href: "/admin/reps/", label: "Reps", area: "reps" },
  { href: "/admin/settings/", label: "Settings", area: "settings" },
];

function active(pathname: string, href: string) {
  const path = pathname.replace(/\/?$/, "/");
  if (href === "/admin/") return path.endsWith("/admin/");
  if (href === "/admin/invoices/") return path.includes("/admin/invoices/");
  if (href === "/admin/suppliers/") return path.includes("/admin/suppliers/") || path.includes("/admin/supplier/");
  if (href === "/admin/clients/") return path.includes("/admin/clients/") || path.includes("/admin/client/");
  return path.includes(href);
}

export function AdminShell({ children }: { children: ReactNode }) {
  return (
    // data-flush-footer drops the shop layout's bottom padding; the back office fills the page.
    <div data-flush-footer>
      <BackofficeProvider>
        <Gate>{children}</Gate>
      </BackofficeProvider>
    </div>
  );
}

function Gate({ children }: { children: ReactNode }) {
  const { mode, admin, authEmail, liveIssue } = useBackoffice();
  const pathname = usePathname();
  const router = useRouter();
  const area = areaForPath(pathname);
  const blocked = !!admin && !!area && !canView(admin.role, area);
  // Staff without the dashboard start on the first page they may use.
  useEffect(() => {
    if (admin && blocked && area === "dashboard") router.replace(homeFor(admin.role));
  }, [admin, blocked, area, router]);
  if (mode === "loading") return <p className="p-10 font-mono text-sm uppercase tracking-wider text-muted">Loading back office…</p>;
  if (mode === "unavailable") return <Unavailable />;
  if (mode === "live" && liveIssue) return <LiveProblem />;
  if (mode === "live" && authEmail && !admin) return <p className="p-10 font-mono text-sm uppercase tracking-wider text-muted">Loading back office…</p>;
  if (!admin) return mode === "live" ? <LiveLogin /> : <Login />;
  if (blocked) {
    if (area === "dashboard") return null;
    return (
      <Frame>
        <div className="max-w-lg border-2 border-ink bg-panel p-6">
          <h1 className="font-display text-2xl">Not part of your access</h1>
          <p className="mt-2 text-sm text-ink-soft">{admin.name} has {ROLE_LABEL[admin.role].toLowerCase()} access. Ask a main admin if you need this page.</p>
          <Link href={homeFor(admin.role)} className="mt-4 inline-block border-b-2 border-ink pb-1 font-mono text-xs uppercase tracking-wider hover:text-flare">Go to your start page</Link>
        </div>
      </Frame>
    );
  }
  return <Frame>{children}</Frame>;
}

function Unavailable() {
  return (
    <div className="mx-auto max-w-xl px-4 py-20">
      <div className="border-2 border-ink bg-panel p-8 shadow-[10px_10px_0_0_var(--color-lime)]">
        <h1 className="font-display text-3xl">Back office</h1>
        <p className="mt-4 text-ink-soft">
          Staff sign-in, clients, quotes and invoices run on the business database, which is not
          connected yet. Once Supabase is set up, staff sign in here with their own accounts.
        </p>
        <Link href="/" className="mt-6 inline-block border-b-2 border-ink pb-1 font-mono text-xs uppercase tracking-wider hover:text-flare">Back to the shop</Link>
      </div>
    </div>
  );
}

/** Live: signed in to the website but no records to show (not staff, not set up yet, or no connection). */
function LiveProblem() {
  const { liveIssue, authEmail, signOut, reload } = useBackoffice();
  const title = liveIssue?.kind === "notStaff" ? "Not a back-office login" : liveIssue?.kind === "notSetUp" ? "Almost ready" : "Back office unavailable";
  return (
    <div className="min-h-screen bg-ink px-4 py-16">
      <div className="mx-auto max-w-md border-2 border-ink bg-panel p-6 shadow-[10px_10px_0_0_var(--color-lime)] sm:p-8">
        <OctaLogo className="h-12 w-auto" />
        <h1 className="mt-6 font-display text-3xl leading-none">{title}</h1>
        <p role="alert" className="mt-3 text-sm text-ink-soft">{liveIssue?.message}</p>
        {liveIssue?.kind === "notStaff" && (
          <p className="mt-3 text-sm text-ink-soft">
            You&apos;re signed in as <strong className="break-all">{authEmail}</strong>. Staff sign in with their OCTA email
            (for example name@octa-boost.com); reps with the email a main admin entered for them.
          </p>
        )}
        <div className="mt-6 flex flex-wrap gap-3">
          {liveIssue?.kind !== "notStaff" && <Button tone="primary" onClick={reload}>Try again</Button>}
          <Button onClick={signOut}>Sign out</Button>
        </div>
        <Link href="/" className="mt-6 inline-block font-mono text-xs uppercase tracking-wider text-muted hover:text-ink">← Back to the shop</Link>
      </div>
    </div>
  );
}

/** Live sign-in: each staff member's own website account (email confirmed). */
function LiveLogin() {
  const { liveSignIn } = useBackoffice();
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const bot = useBotCheck();
  async function onSubmit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    if (bot.pending || busy) return;
    const d = new FormData(e.currentTarget);
    setBusy(true);
    setError(await liveSignIn(String(d.get("email") ?? ""), String(d.get("password") ?? ""), bot.token || undefined));
    bot.reset();
    setBusy(false);
  }
  return (
    <div className="min-h-screen bg-ink px-4 py-16">
      <div className="mx-auto max-w-md border-2 border-ink bg-panel p-6 shadow-[10px_10px_0_0_var(--color-lime)] sm:p-8">
        <OctaLogo className="h-12 w-auto" />
        <h1 className="mt-6 font-display text-3xl leading-none">Back office</h1>
        <p className="mt-2 text-sm text-ink-soft">Staff and reps sign in with their own email and password.</p>
        <form onSubmit={onSubmit} className="mt-6 space-y-4" noValidate>
          {error && <p role="alert" className="border-2 border-flare p-3 text-sm">{error}</p>}
          <Field label="Email"><Input name="email" type="email" autoComplete="username" required /></Field>
          <Field label="Password"><Input name="password" type="password" autoComplete="current-password" required /></Field>
          <BotCheck key={bot.attempt} action="staff_login" onToken={bot.setToken} />
          <Button type="submit" tone="primary" className="w-full" disabled={busy || bot.pending}>{busy ? "Signing in…" : "Sign in"}</Button>
        </form>
        <div className="mt-5 border-t border-line pt-4 text-sm text-ink-soft">
          <p><strong>First time?</strong> Create your account on the <Link href="/account/" className="underline">Sign in page</Link> with your OCTA email, confirm it from the email we send, then come back here.</p>
          <p className="mt-2"><Link href="/account/" className="underline">Forgot your password?</Link></p>
        </div>
        <Link href="/" className="mt-6 inline-block font-mono text-xs uppercase tracking-wider text-muted hover:text-ink">← Back to the shop</Link>
      </div>
    </div>
  );
}

function Login() {
  const { signIn } = useBackoffice();
  const [error, setError] = useState<string | null>(null);
  function onSubmit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const d = new FormData(e.currentTarget);
    setError(signIn(String(d.get("email") ?? ""), String(d.get("password") ?? "")));
  }
  return (
    <div className="min-h-screen bg-ink px-4 py-16">
      <div className="mx-auto max-w-md border-2 border-ink bg-panel p-6 shadow-[10px_10px_0_0_var(--color-lime)] sm:p-8">
        <OctaLogo className="h-12 w-auto" />
        <h1 className="mt-6 font-display text-3xl leading-none">Back office</h1>
        <p className="mt-2 text-sm text-ink-soft">Quotes, invoices, clients, pricing and sales for OCTA Performance.</p>
        <div className="mt-5 border-2 border-ink bg-lime p-3 text-sm">
          <strong>Demo sign-in · 4 admins</strong>
          <ul className="mt-1 space-y-0.5">
            {STAFF.map((a) => (
              <li key={a.id} className="break-all">{a.name} <span className="text-ink/70">({ROLE_LABEL[a.role]})</span>: <span className="font-mono">{a.demoEmail}</span></li>
            ))}
          </ul>
          <p className="mt-1 break-all">Password (all): <span className="font-mono">{DEMO_ADMIN_PASSWORD}</span></p>
          <p className="mt-2 break-all">Sample rep: <span className="font-mono">rep@example.test</span> · same demo password.</p>
          <p className="mt-2 text-xs">Public demonstration only. Role screens are examples; do not enter real customer, supplier or banking records.</p>
        </div>
        <form onSubmit={onSubmit} className="mt-6 space-y-4" noValidate>
          {error && <p role="alert" className="border-2 border-flare p-3 text-sm">{error}</p>}
          <Field label="Email"><Input name="email" type="email" autoComplete="username" /></Field>
          <Field label="Password"><Input name="password" type="password" autoComplete="current-password" /></Field>
          <Button type="submit" tone="primary" className="w-full">Sign in</Button>
        </form>
        <Link href="/" className="mt-6 inline-block font-mono text-xs uppercase tracking-wider text-muted hover:text-ink">← Back to the shop</Link>
      </div>
    </div>
  );
}

function Frame({ children }: { children: ReactNode }) {
  const pathname = usePathname();
  const { signOut, mode, admin, saving, syncError, dismissSyncError } = useBackoffice();
  return (
    <div className="min-h-screen bg-paper lg:grid lg:grid-cols-[15rem_1fr]">
      <aside className="min-w-0 bg-ink text-paper lg:sticky lg:top-0 lg:h-screen">
        <div className="flex items-center justify-between gap-3 px-4 py-4 lg:block lg:px-5 lg:py-6">
          <Link href="/admin/" aria-label="Back office dashboard"><OctaLogo tone="light" className="h-9 w-auto lg:h-11" /></Link>
          <p className="kicker text-lime lg:mt-3">Back office</p>
        </div>
        {/* Phones: one scrollable row of tabs. Desktop: a sidebar list. */}
        <nav aria-label="Back office" className="overflow-x-auto border-t border-paper/15 lg:overflow-visible lg:border-0">
          <ul className="flex min-w-max gap-1 px-2 py-2 lg:block lg:min-w-0 lg:space-y-1 lg:px-3">
            {NAV.filter((n) => canView(admin?.role, n.area)).map((n) => (
              <li key={n.href} className="shrink-0">
                <Link
                  href={n.href}
                  aria-current={active(pathname, n.href) ? "page" : undefined}
                  className={`block whitespace-nowrap px-3 py-2.5 font-mono text-xs font-bold uppercase tracking-wider transition-colors ${
                    active(pathname, n.href) ? "bg-lime text-ink" : "text-paper/75 hover:bg-paper/10 hover:text-paper"
                  }`}
                >
                  {n.label}
                </Link>
              </li>
            ))}
          </ul>
        </nav>
        <div className="hidden px-5 pb-6 lg:absolute lg:bottom-0 lg:block">
          {admin && <p className="mb-3 text-xs text-paper/75">Signed in as <strong className="text-paper">{admin.name}</strong><span className="block text-paper/50">{ROLE_LABEL[admin.role]}</span></p>}
          <Link href="/" className="block font-mono text-xs uppercase tracking-wider text-paper/60 hover:text-lime">View shop →</Link>
          <button type="button" onClick={signOut} className="mt-3 font-mono text-xs uppercase tracking-wider text-paper/60 hover:text-lime">Sign out</button>
        </div>
      </aside>
      <div className="min-w-0">
        {mode === "demo" && (
          <div role="note" className="flex flex-wrap items-center justify-between gap-2 border-b-2 border-ink bg-lime px-4 py-2 text-xs sm:px-6">
            <span><strong>DEMO DATA</strong> · Sample clients and documents, saved in this browser only.{admin && <span className="lg:hidden"> · Signed in as <strong>{admin.name}</strong></span>}</span>
            <button type="button" onClick={signOut} className="font-mono font-bold uppercase tracking-wider underline lg:hidden">Sign out</button>
          </div>
        )}
        {mode === "live" && (saving || syncError) && (
          <div role={syncError ? "alert" : "status"} className={`flex flex-wrap items-center justify-between gap-2 border-b-2 border-ink px-4 py-2 text-xs sm:px-6 ${syncError ? "bg-flare text-paper" : "bg-lime"}`}>
            <span>{syncError ?? "Saving…"}{syncError && " The page shows what is saved."}</span>
            {syncError && <button type="button" onClick={dismissSyncError} className="font-mono font-bold uppercase tracking-wider underline">OK</button>}
          </div>
        )}
        <div className="px-4 py-6 sm:px-6 lg:px-8 lg:py-8">{children}</div>
      </div>
    </div>
  );
}
