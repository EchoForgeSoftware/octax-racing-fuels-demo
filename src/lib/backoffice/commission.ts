// Sales commission for reps: a main admin sets, per product, which rep gets
// what percentage of the selling price (incl. VAT). Every invoice for a client
// allocated to that rep then credits the rep automatically; it is due once the
// invoice is paid. Pure, so the numbers are tested in scripts/backoffice.test.mjs.
import { cents, docTotal, lineTotal, paid } from "./calc";
import type { BackofficeData } from "./types";

export type RepShare = { repId: string; percent: number };

/** Commission on one price at one percentage. */
export const shareAmount = (price: number, percent: number) => cents((price * percent) / 100);

/** Only known reps, percentages from 0 to 100, one entry per rep. */
export function cleanShares(shares: unknown, repIds: string[]): RepShare[] {
  if (!Array.isArray(shares)) return [];
  const seen = new Set<string>();
  return shares.flatMap((s) => {
    const repId = String((s as RepShare)?.repId ?? "");
    const percent = Math.round(Number((s as RepShare)?.percent) * 100) / 100;
    if (!repIds.includes(repId) || seen.has(repId) || !(percent > 0 && percent <= 100)) return [];
    seen.add(repId);
    return [{ repId, percent }];
  });
}

export type CommissionRow = { invoiceId: string; number: string; date: string; clientId: string; amount: number; due: boolean };

/** The rep's commission per invoice (clients allocated to the rep, products with a share for the rep), newest first. */
export function salesCommissions(d: BackofficeData, repId: string): CommissionRow[] {
  const mine = new Set(d.clients.filter((c) => c.repId === repId).map((c) => c.id));
  const percent = new Map(d.catalogue.map((i) => [i.sku, i.repShares?.find((s) => s.repId === repId)?.percent ?? 0]));
  return d.documents
    .filter((x) => x.kind === "invoice" && !x.cancelled && mine.has(x.clientId))
    .map((x) => ({
      invoiceId: x.id, number: x.number, date: x.date, clientId: x.clientId,
      amount: cents(x.lines.reduce((n, l) => n + (l.sku ? shareAmount(lineTotal(l), percent.get(l.sku) ?? 0) : 0), 0)),
      due: paid(x) >= docTotal(x) - 0.005,
    }))
    .filter((r) => r.amount > 0)
    .sort((a, b) => b.date.localeCompare(a.date));
}
