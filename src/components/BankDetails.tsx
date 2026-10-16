"use client";

import { useState } from "react";
import { BANK } from "@/lib/site";
import { Icon } from "./Icon";

function CopyButton({ value, label }: { value: string; label: string }) {
  const [copied, setCopied] = useState(false);
  return (
    <button
      type="button"
      onClick={async () => {
        try {
          await navigator.clipboard.writeText(value);
          setCopied(true);
          window.setTimeout(() => setCopied(false), 1500);
        } catch {
          // clipboard unavailable; the value is still visible to copy by hand
        }
      }}
      aria-label={`Copy ${label}`}
      className="grid h-9 w-9 shrink-0 place-items-center border-2 border-paper/30 text-lime transition-colors hover:border-lime"
    >
      <Icon name={copied ? "check" : "copy"} size={14} strokeWidth={2.5} />
    </button>
  );
}

/** EFT bank details, with the order reference to pay against. */
export function BankDetails({ reference }: { reference?: string }) {
  const rows: { label: string; value: string; copy?: boolean }[] = [
    { label: "Account holder", value: BANK.accountHolder },
    { label: "Bank", value: BANK.bank },
    { label: "Account number", value: BANK.accountNumber, copy: true },
    { label: "Branch code", value: BANK.branchCode, copy: true },
    { label: "Account type", value: BANK.accountType },
  ];
  if (reference) rows.push({ label: "Payment reference", value: reference, copy: true });

  return (
    <dl className="divide-y divide-paper/15 border-2 border-ink bg-ink text-left text-paper">
      {rows.map((r) => (
        <div key={r.label} className="flex items-center justify-between gap-3 px-4 py-3">
          <div className="min-w-0">
            <dt className="font-mono text-[0.68rem] uppercase tracking-wider text-paper/60">{r.label}</dt>
            <dd className={`num mt-0.5 break-words font-bold ${r.label === "Payment reference" ? "font-display text-xl text-lime" : ""}`}>
              {r.value}
            </dd>
          </div>
          {r.copy && <CopyButton value={r.value} label={r.label.toLowerCase()} />}
        </div>
      ))}
    </dl>
  );
}
