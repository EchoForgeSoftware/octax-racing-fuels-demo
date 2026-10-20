"use client";

import { uid } from "./BackofficeContext";
import { Button, Input, Select } from "./ui";
import { costingSplit, costingTotals, type Costing } from "@/lib/backoffice/costing";
import { shareAmount, type RepShare } from "@/lib/backoffice/commission";
import type { Rep } from "@/lib/backoffice/types";
import { exVat as toExVat, inclVat } from "@/lib/backoffice/stock";
import { formatPrice } from "@/lib/format";

const num = (v: string) => (v.trim() === "" ? 0 : Math.max(0, Math.round(Number(v) * 100) / 100) || 0);

/**
 * Costing table under "Your cost": purity, litres per pack and cost lines entered
 * ex VAT (incl VAT shown alongside). Lines switch on and off; "other costs" have
 * a description. The total can become the product's cost for profit.
 */
export function CostingTable({ value, onChange, vatRegistered, sellPrice }: {
  value: Costing; onChange: (c: Costing) => void; vatRegistered: boolean; sellPrice: number | null;
}) {
  const t = costingTotals(value);
  const set = (patch: Partial<Costing>) => onChange({ ...value, ...patch });
  const setLine = (id: string, patch: Partial<Costing["lines"][number]>) => set({ lines: value.lines.map((l) => (l.id === id ? { ...l, ...patch } : l)) });
  const split = costingSplit(value, vatRegistered);
  const cost = split.cost;
  const profit = sellPrice !== null ? Math.round((sellPrice - cost) * 100) / 100 : null;
  const profitNoTravel = sellPrice !== null ? Math.round((sellPrice - split.withoutTravel) * 100) / 100 : null;

  return (
    <section className="border-2 border-ink bg-paper-2 p-3 sm:col-span-2 lg:col-span-4" aria-label="Costing">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <h3 className="font-display text-lg">Costing</h3>
        <div className="flex flex-wrap gap-3">
          <label className="flex items-center gap-2 text-sm">
            <input type="checkbox" checked={value.purityEnabled} onChange={(e) => set({ purityEnabled: e.target.checked })} className="h-5 w-5 accent-[var(--color-ink)]" />
            Purity
          </label>
          {value.purityEnabled && (
            <label className="flex items-center gap-2 text-sm">
              <span className="font-mono text-xs font-bold uppercase">Received %</span>
              <Input type="number" min={0} max={100} step="0.1" value={value.purity ?? ""} aria-label="Purity received (%)"
                onChange={(e) => set({ purity: e.target.value === "" ? null : Math.min(100, Math.max(0, Number(e.target.value))) })} className="!mt-0 w-24" />
            </label>
          )}
          <label className="flex items-center gap-2 text-sm">
            <span className="font-mono text-xs font-bold uppercase">Litres per pack</span>
            <Input type="number" min={0} step="0.001" value={value.litres ?? ""} aria-label="Litres per pack"
              onChange={(e) => set({ litres: e.target.value === "" ? null : Math.max(0, Number(e.target.value)) })} className="!mt-0 w-24" />
          </label>
        </div>
      </div>

      <div className="mt-3 overflow-x-auto">
        <table className="num w-full min-w-[40rem] text-sm">
          <thead>
            <tr className="border-b-2 border-ink text-left font-mono text-[0.68rem] uppercase tracking-wider">
              <th className="py-2 pr-2">On</th><th className="py-2 pr-2">Cost</th><th className="py-2 pr-2">Ex VAT (R)</th>
              <th className="py-2 pr-2">Incl VAT (R)</th><th className="py-2 pr-2 text-right">Per pack</th><th className="py-2" />
            </tr>
          </thead>
          <tbody>
            {t.lines.map((l) => (
              <tr key={l.id} className={`border-b border-line align-top ${l.enabled ? "" : "text-muted"}`}>
                <td className="py-2 pr-2"><input type="checkbox" checked={l.enabled} aria-label={`Use ${l.label}`} onChange={(e) => setLine(l.id, { enabled: e.target.checked })} className="mt-2 h-5 w-5 accent-[var(--color-ink)]" /></td>
                <td className="py-2 pr-2">
                  {l.builtIn ? <span className="mt-2 block">{l.label}{l.perLitre && value.litres ? ` × ${value.litres} L` : ""}</span> : (
                    <Input value={l.label} onChange={(e) => setLine(l.id, { label: e.target.value })} aria-label="Cost name" className="!mt-0" />
                  )}
                  {!l.builtIn && <Input value={l.description} placeholder="Description" onChange={(e) => setLine(l.id, { description: e.target.value })} aria-label="Cost description" className="!mt-1" />}
                </td>
                <td className="py-2 pr-2"><Input type="number" min={0} step="0.01" disabled={!l.enabled} value={l.exVat || ""} aria-label={`${l.label} excluding VAT`} onChange={(e) => setLine(l.id, { exVat: num(e.target.value) })} className="!mt-0 w-28" /></td>
                <td className="py-2 pr-2"><Input type="number" min={0} step="0.01" disabled={!l.enabled} value={l.exVat ? inclVat(l.exVat) : ""} aria-label={`${l.label} including VAT`} onChange={(e) => setLine(l.id, { exVat: toExVat(num(e.target.value)) })} className="!mt-0 w-28" /></td>
                <td className="py-2 pr-2 text-right"><span className="mt-2 block">{l.enabled ? formatPrice(vatRegistered ? l.amountEx : l.amountIncl) : "Off"}</span></td>
                <td className="py-2">{!l.builtIn && <button type="button" onClick={() => set({ lines: value.lines.filter((x) => x.id !== l.id) })} className="mt-2 font-mono text-xs uppercase text-muted underline hover:text-flare">Remove</button>}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      <Button className="mt-3" onClick={() => set({ lines: [...value.lines, { id: uid("cost"), label: "Other cost", description: "", enabled: true, exVat: 0, perLitre: false, builtIn: false }] })}>Add other cost</Button>

      <div className="num mt-3 grid gap-2 border-t-2 border-ink pt-3 text-sm sm:grid-cols-3 lg:grid-cols-5">
        <p>Total ex VAT<strong className="block text-base">{formatPrice(t.exVat)}</strong></p>
        <p>Total incl VAT<strong className="block text-base">{formatPrice(t.inclVat)}</strong></p>
        <p>Cost per pack<strong className="block text-base">{formatPrice(cost)}</strong><span className="text-xs text-muted">{vatRegistered ? "ex VAT (VAT-registered)" : "incl VAT (not VAT-registered)"}</span></p>
        <p>{profit !== null && profit < 0 ? <span className="font-bold text-flare">Price under cost</span> : "Profit including travel (delivery)"}
          <strong className={`block text-base ${profit !== null && profit < 0 ? "text-flare" : ""}`}>{profit === null ? "—" : formatPrice(profit)}</strong>
          <span className="text-xs text-muted">At the website price, travel fee paid</span></p>
        <p>Profit without travel (delivery)
          <strong className={`block text-base ${profitNoTravel !== null && profitNoTravel < 0 ? "text-flare" : ""}`}>{profitNoTravel === null ? "—" : formatPrice(profitNoTravel)}</strong>
          <span className="text-xs text-muted">{split.travel > 0 ? `Without the ${formatPrice(split.travel)} travel fee` : "No travel fee entered"}</span></p>
      </div>
      <label className="mt-3 flex items-center gap-2 text-sm">
        <input type="checkbox" checked={value.useAsCost} onChange={(e) => set({ useAsCost: e.target.checked })} className="h-5 w-5 accent-[var(--color-ink)]" />
        Use this total as the product&apos;s cost for profit
      </label>
    </section>
  );
}

/**
 * Rep commission under the costing: a percentage of the selling price (incl. VAT)
 * per rep. Invoices for clients allocated to that rep credit the rep automatically.
 */
export function RepCommission({ reps, value, onChange, sellPrice, profit }: {
  reps: Rep[]; value: RepShare[]; onChange: (v: RepShare[]) => void; sellPrice: number | null; profit: number | null;
}) {
  const free = reps.filter((r) => !value.some((s) => s.repId === r.id));
  const setShare = (i: number, patch: Partial<RepShare>) => onChange(value.map((s, j) => (j === i ? { ...s, ...patch } : s)));
  return (
    <section className="border-2 border-ink bg-paper-2 p-3 sm:col-span-2 lg:col-span-4" aria-label="Rep commission">
      <h3 className="font-display text-lg">Rep commission</h3>
      <p className="mt-1 text-xs text-muted">Percentage of the selling price incl. VAT. Every invoice for a client allocated to that rep (on the client page) credits the rep automatically; it shows on the Reps page and is due once the invoice is paid.</p>
      {reps.length === 0 ? <p className="mt-2 text-sm">Add reps on the Reps page first.</p> : (
        <>
          {value.length > 0 && (
            <div className="mt-3 overflow-x-auto">
              <table className="num w-full min-w-[34rem] text-sm">
                <thead>
                  <tr className="border-b-2 border-ink text-left font-mono text-[0.68rem] uppercase tracking-wider">
                    <th className="py-2 pr-2">Rep</th><th className="py-2 pr-2">%</th><th className="py-2 pr-2 text-right">Per pack at website price</th><th className="py-2 pr-2 text-right">Profit after commission</th><th className="py-2" />
                  </tr>
                </thead>
                <tbody>
                  {value.map((s, i) => {
                    const amount = sellPrice !== null ? shareAmount(sellPrice, s.percent) : null;
                    return (
                      <tr key={s.repId} className="border-b border-line align-top">
                        <td className="py-2 pr-2">
                          <Select value={s.repId} onChange={(e) => setShare(i, { repId: e.target.value })} aria-label="Rep" className="!mt-0">
                            {reps.filter((r) => r.id === s.repId || free.includes(r)).map((r) => <option key={r.id} value={r.id}>{r.name}</option>)}
                          </Select>
                        </td>
                        <td className="py-2 pr-2"><Input type="number" min={0} max={100} step="0.1" value={s.percent || ""} aria-label="Commission %" onChange={(e) => setShare(i, { percent: Math.min(100, Math.max(0, Number(e.target.value) || 0)) })} className="!mt-0 w-24" /></td>
                        <td className="py-2 pr-2 text-right"><span className="mt-2 block font-bold">{amount === null ? "Set a website price" : formatPrice(amount)}</span></td>
                        <td className="py-2 pr-2 text-right"><span className={`mt-2 block ${profit !== null && amount !== null && profit - amount < 0 ? "font-bold text-flare" : ""}`}>{profit === null || amount === null ? "—" : formatPrice(Math.round((profit - amount) * 100) / 100)}</span></td>
                        <td className="py-2"><button type="button" onClick={() => onChange(value.filter((_, j) => j !== i))} className="mt-2 font-mono text-xs uppercase text-muted underline hover:text-flare">Remove</button></td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
          {free.length > 0 && <Button className="mt-3" onClick={() => onChange([...value, { repId: free[0].id, percent: 0 }])}>Add rep commission</Button>}
        </>
      )}
    </section>
  );
}
