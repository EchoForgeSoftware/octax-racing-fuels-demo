"use client";

import Link from "next/link";
import type { ComponentProps, ReactNode } from "react";
import type { InvoiceStatus, QuoteStatus } from "@/lib/backoffice/calc";
import { STATUS_LABEL } from "@/lib/backoffice/calc";

export const inputClass =
  "mt-1 w-full border-2 border-ink bg-panel px-3 py-2 text-sm outline-none transition-colors focus:bg-lime/15 aria-[invalid=true]:border-flare disabled:opacity-60";

export function Field({ label, hint, children, className = "" }: { label: string; hint?: string; children: ReactNode; className?: string }) {
  return (
    <label className={`block ${className}`}>
      <span className="kicker text-ink-soft">{label}</span>
      {children}
      {hint && <span className="mt-1 block text-xs text-muted">{hint}</span>}
    </label>
  );
}

export function Input(props: ComponentProps<"input">) {
  return <input {...props} className={`${inputClass} ${props.className ?? ""}`} />;
}

export function Select(props: ComponentProps<"select">) {
  return <select {...props} className={`${inputClass} ${props.className ?? ""}`} />;
}

export function Textarea(props: ComponentProps<"textarea">) {
  return <textarea {...props} className={`${inputClass} ${props.className ?? ""}`} />;
}

const buttonStyles = {
  primary: "border-ink bg-flare text-paper hover:bg-ink",
  dark: "border-ink bg-ink text-paper hover:bg-lime hover:text-ink",
  ghost: "border-ink bg-transparent text-ink hover:bg-lime",
  danger: "border-flare bg-transparent text-flare hover:bg-flare hover:text-paper",
} as const;

type Tone = keyof typeof buttonStyles;

export function Button({ tone = "ghost", className = "", ...props }: ComponentProps<"button"> & { tone?: Tone }) {
  return (
    <button
      type="button"
      {...props}
      className={`inline-flex min-h-10 items-center justify-center gap-2 border-2 px-4 py-2 font-display text-sm uppercase transition-colors disabled:cursor-not-allowed disabled:opacity-50 ${buttonStyles[tone]} ${className}`}
    />
  );
}

export function ButtonLink({ tone = "ghost", className = "", ...props }: ComponentProps<typeof Link> & { tone?: Tone }) {
  return (
    <Link
      {...props}
      className={`inline-flex min-h-10 items-center justify-center gap-2 border-2 px-4 py-2 font-display text-sm uppercase transition-colors ${buttonStyles[tone]} ${className}`}
    />
  );
}

const statusTone: Record<InvoiceStatus | QuoteStatus, string> = {
  paid: "bg-lime text-ink",
  "part-paid": "bg-[oklch(0.92_0.1_95)] text-ink",
  overdue: "bg-flare text-paper",
  unpaid: "bg-paper-2 text-ink",
  cancelled: "bg-line text-muted line-through",
  draft: "bg-paper-2 text-ink",
  sent: "bg-[oklch(0.9_0.05_250)] text-ink",
  accepted: "bg-lime text-ink",
  declined: "bg-line text-muted",
  invoiced: "bg-ink text-lime",
  expired: "bg-line text-muted",
};

export function StatusBadge({ status }: { status: InvoiceStatus | QuoteStatus }) {
  return (
    <span className={`inline-block whitespace-nowrap px-2 py-0.5 font-mono text-[0.68rem] font-bold uppercase tracking-wider ${statusTone[status]}`}>
      {STATUS_LABEL[status]}
    </span>
  );
}

export function Panel({ title, action, children, className = "" }: { title?: string; action?: ReactNode; children: ReactNode; className?: string }) {
  return (
    <section className={`border-2 border-ink bg-panel ${className}`}>
      {(title || action) && (
        <div className="flex flex-wrap items-center justify-between gap-3 border-b-2 border-ink px-4 py-3">
          {title && <h2 className="font-display text-lg">{title}</h2>}
          {action}
        </div>
      )}
      <div className="p-4">{children}</div>
    </section>
  );
}

/** KPI tile: label, value, optional context line. Proportional figures for the big number. */
export function StatTile({ label, value, sub, accent, hero }: { label: string; value: string; sub?: ReactNode; accent?: string; hero?: boolean }) {
  return (
    <div className="relative border-2 border-ink bg-panel p-4">
      {accent && <span className="absolute inset-y-0 left-0 w-1.5" style={{ background: accent }} aria-hidden="true" />}
      <p className="text-sm text-ink-soft">{label}</p>
      <p className={`mt-1 font-display leading-none ${hero ? "text-[clamp(2rem,6vw,3rem)]" : "text-2xl"}`}>{value}</p>
      {sub && <p className="mt-2 text-xs text-muted">{sub}</p>}
    </div>
  );
}

export function PageTitle({ title, sub, actions }: { title: string; sub?: string; actions?: ReactNode }) {
  return (
    <div className="mb-6 flex flex-wrap items-end justify-between gap-4">
      <div>
        <h1 className="font-display text-[clamp(1.8rem,5vw,2.8rem)] leading-none">{title}</h1>
        {sub && <p className="mt-2 text-sm text-ink-soft">{sub}</p>}
      </div>
      {actions && <div className="flex flex-wrap gap-2">{actions}</div>}
    </div>
  );
}

export function Empty({ children }: { children: ReactNode }) {
  return <p className="border-2 border-dashed border-ink p-6 text-center text-sm text-ink-soft">{children}</p>;
}

export const shortDate = (iso: string) =>
  iso ? new Date(`${iso}T00:00:00Z`).toLocaleDateString("en-ZA", { day: "numeric", month: "short", year: "numeric", timeZone: "UTC" }) : "";
