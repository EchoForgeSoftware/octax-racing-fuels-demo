"use client";

import { useState } from "react";
import { useBackoffice } from "./BackofficeContext";
import { Button, Field, Input, PageTitle, Panel, Select, Textarea } from "./ui";
import type { CatalogueCategory, CatalogueItem } from "@/lib/backoffice/types";
import { formatPrice } from "@/lib/format";
import { costingCost, defaultCosting, type Costing } from "@/lib/backoffice/costing";
import { CostingTable } from "./Costing";

const CATEGORY_LABEL: Record<CatalogueCategory, string> = {
  ethanol: "Ethanol", methanol: "Methanol", additives: "Fuel additives", fuel: "Race fuels (coming soon)",
  track: "Track prep (coming soon)", detailing: "Detailing", merch: "Merch",
};

const money = (v: string) => (v.trim() === "" ? null : Math.round(Number(v) * 100) / 100);
const margin = (price: number | null, cost: number | null) => (price && cost !== null && price > 0 ? Math.round(((price - cost) / price) * 1000) / 10 : null);

export function ProductsAdmin() {
  const { data } = useBackoffice();
  const [adding, setAdding] = useState(false);
  if (!data) return null;
  const groups = (Object.keys(CATEGORY_LABEL) as CatalogueCategory[])
    .map((cat) => ({ cat, items: data.catalogue.filter((i) => i.category === cat) }))
    .filter((g) => g.items.length > 0);

  return (
    <>
      <PageTitle
        title="Products & pricing"
        sub="Website price, agent and bulk lists, your cost and product text. Changes show on the shop straight away."
        actions={<Button tone="primary" onClick={() => setAdding(true)}>Add product</Button>}
      />
      {adding && <ProductForm item={null} onDone={() => setAdding(false)} />}
      <div className="space-y-8">
        {groups.map((g) => (
          <section key={g.cat}>
            <h2 className="mb-3 font-display text-xl">{CATEGORY_LABEL[g.cat]}</h2>
            <ul className="space-y-3">{g.items.map((i) => <ProductRow key={i.sku} item={i} />)}</ul>
          </section>
        ))}
      </div>
    </>
  );
}

function ProductRow({ item }: { item: CatalogueItem }) {
  const [open, setOpen] = useState(false);
  const m = margin(item.retail, item.cost);
  return (
    <li className={`border-2 border-ink bg-panel ${item.active ? "" : "opacity-70"}`}>
      <button type="button" onClick={() => setOpen((o) => !o)} aria-expanded={open}
        className="grid w-full gap-2 p-4 text-left hover:bg-paper-2 sm:grid-cols-[1fr_repeat(4,7rem)] sm:items-center">
        <span>
          <span className="font-bold">{item.productName}</span> <span className="text-muted">· {item.size}</span>
          {!item.active && <span className="ml-2 bg-line px-1.5 py-0.5 font-mono text-[0.65rem] uppercase">Hidden</span>}
          {item.custom && <span className="ml-2 bg-lime px-1.5 py-0.5 font-mono text-[0.65rem] uppercase">Added here</span>}
          {item.comingSoon && <span className="ml-2 bg-ink px-1.5 py-0.5 font-mono text-[0.65rem] uppercase text-lime">Coming soon</span>}
        </span>
        {[["Website", item.retail], ["Agent", item.agent], ["Bulk", item.bulk], ["Cost", item.cost]].map(([k, v]) => (
          <span key={k as string} className="num flex justify-between gap-2 text-sm sm:block sm:text-right">
            <span className="text-xs text-muted sm:block">{k}</span>{v === null ? (k === "Website" ? "On quote" : "—") : formatPrice(v as number)}
          </span>
        ))}
        <span className="text-xs text-ink-soft sm:col-span-5">{m === null ? "Set a website price and cost to see margin." : `${m}% margin at the website price`}</span>
      </button>
      {open && <div className="border-t-2 border-ink p-4"><ProductForm item={item} onDone={() => setOpen(false)} /></div>}
    </li>
  );
}

function ProductForm({ item, onDone }: { item: CatalogueItem | null; onDone: () => void }) {
  const { saveCatalogueItem, data } = useBackoffice();
  const isNew = !item;
  const [f, setF] = useState(() => ({
    productName: item?.productName ?? "",
    size: item?.size ?? "",
    category: item?.category ?? ("merch" as CatalogueCategory),
    retail: item?.retail?.toString() ?? "",
    agent: item?.agent?.toString() ?? "",
    bulk: item?.bulk?.toString() ?? "",
    cost: item?.cost?.toString() ?? "",
    short: item?.short ?? "",
    description: item?.description ?? "",
    active: item?.active ?? true,
    comingSoon: item?.comingSoon ?? false,
  }));
  const [costing, setCosting] = useState<Costing | null>(() => item?.costing ?? null);
  const vatRegistered = !!data?.settings.vatRegistered;
  const [error, setError] = useState<string | null>(null);
  const set = (patch: Partial<typeof f>) => setF({ ...f, ...patch });

  function submit() {
    if (!f.productName.trim() || !f.size.trim()) return setError("Enter a product name and a size or variant (e.g. Large, 500ml).");
    for (const k of ["retail", "agent", "bulk", "cost"] as const) if (f[k] && !(Number(f[k]) >= 0)) return setError("Prices must be numbers of 0 or more.");
    const sku = item?.sku ?? `CUSTOM-${f.productName.replace(/[^a-z0-9]+/gi, "-").toUpperCase().slice(0, 24)}-${f.size.replace(/[^a-z0-9]+/gi, "").toUpperCase().slice(0, 8)}`;
    if (isNew && data?.catalogue.some((i) => i.sku === sku)) return setError("A product with that name and size already exists.");
    // The costing total, when switched on, is the cost used for profit.
    const cost = costing?.useAsCost ? costingCost(costing, vatRegistered) : money(f.cost);
    saveCatalogueItem({
      sku, slug: item?.slug ?? null, custom: item?.custom ?? true,
      productName: item?.custom === false ? item.productName : f.productName.trim(),
      size: item?.custom === false ? item.size : f.size.trim(),
      category: item?.custom === false ? item.category : f.category,
      retail: money(f.retail), agent: money(f.agent), bulk: money(f.bulk), cost,
      short: f.short.trim(), description: f.description.trim(), active: f.active, comingSoon: f.comingSoon,
      ...(costing ? { costing } : {}),
    });
    onDone();
  }

  const builtIn = item?.custom === false;
  return (
    <Panel title={isNew ? "Add product" : undefined} className={isNew ? "mb-6" : "!border-0"}>
      {error && <p role="alert" className="mb-3 border-2 border-flare p-3 text-sm">{error}</p>}
      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        <Field label="Product name" className="sm:col-span-2"><Input value={f.productName} disabled={builtIn} onChange={(e) => set({ productName: e.target.value })} /></Field>
        <Field label="Size / variant"><Input value={f.size} disabled={builtIn} onChange={(e) => set({ size: e.target.value })} placeholder="e.g. Large, 500ml" /></Field>
        <Field label="Category">
          <Select value={f.category} disabled={builtIn} onChange={(e) => set({ category: e.target.value as CatalogueCategory })}>
            {(Object.keys(CATEGORY_LABEL) as CatalogueCategory[]).map((c) => <option key={c} value={c}>{CATEGORY_LABEL[c]}</option>)}
          </Select>
        </Field>
        <Field label="Website price (R)" hint="Leave empty for 'price on quote'."><Input type="number" min={0} step="0.01" value={f.retail} onChange={(e) => set({ retail: e.target.value })} /></Field>
        <Field label="Agent price (R)" hint="Empty = website price."><Input type="number" min={0} step="0.01" value={f.agent} onChange={(e) => set({ agent: e.target.value })} /></Field>
        <Field label="Bulk price (R)" hint="Empty = website price."><Input type="number" min={0} step="0.01" value={f.bulk} onChange={(e) => set({ bulk: e.target.value })} /></Field>
        <Field label="Your cost (R)" hint={costing?.useAsCost ? "From the costing table below." : "Used for profit only."}>
          <Input type="number" min={0} step="0.01" value={costing?.useAsCost ? costingCost(costing, vatRegistered) : f.cost} disabled={!!costing?.useAsCost} onChange={(e) => set({ cost: e.target.value })} />
        </Field>
        {costing ? (
          <CostingTable value={costing} onChange={setCosting} vatRegistered={vatRegistered} sellPrice={money(f.retail)} />
        ) : (
          <div className="sm:col-span-2 lg:col-span-4">
            <Button onClick={() => setCosting(defaultCosting({ size: f.size || item?.size || "", productName: f.productName || item?.productName || "", category: f.category }))}>
              Open costing table
            </Button>
            <span className="ml-3 text-xs text-muted">Work out the cost from product price per litre, sticker, container, cap, travel fee and other costs.</span>
          </div>
        )}
        {(() => {
          const cost = costing?.useAsCost ? costingCost(costing, vatRegistered) : money(f.cost);
          const under = (["retail", "agent", "bulk"] as const).filter((k) => cost !== null && money(f[k]) !== null && money(f[k])! < cost);
          return under.length > 0 && (
            <p role="alert" className="border-2 border-flare bg-flare/10 p-2 text-sm font-bold text-flare sm:col-span-2 lg:col-span-4">
              Price under cost: the {under.map((k) => ({ retail: "website", agent: "agent", bulk: "bulk" })[k]).join(", ")} price is below the {formatPrice(cost!)} cost.
            </p>
          );
        })()}
        <Field label="Short description" className="sm:col-span-2 lg:col-span-4"><Input value={f.short} onChange={(e) => set({ short: e.target.value })} maxLength={160} /></Field>
        <Field label="Full description" className="sm:col-span-2 lg:col-span-4"><Textarea rows={4} value={f.description} onChange={(e) => set({ description: e.target.value })} /></Field>
      </div>
      <div className="mt-4 flex flex-wrap items-center justify-between gap-3">
        <div className="flex flex-wrap gap-x-6 gap-y-2">
          <label className="flex items-center gap-3 text-sm">
            <input type="checkbox" checked={f.active} onChange={(e) => set({ active: e.target.checked })} className="h-5 w-5 accent-[var(--color-ink)]" />
            Show on the website and in quotes
          </label>
          <label className="flex items-center gap-3 text-sm">
            <input type="checkbox" checked={f.comingSoon} onChange={(e) => set({ comingSoon: e.target.checked })} className="h-5 w-5 accent-[var(--color-ink)]" />
            Coming soon (no price shown yet)
          </label>
        </div>
        <div className="flex gap-2">
          <Button onClick={onDone}>Cancel</Button>
          <Button tone="primary" onClick={submit}>{isNew ? "Add product" : "Save"}</Button>
        </div>
      </div>
      {builtIn && <p className="mt-3 text-xs text-muted">Name, size and category of website products are fixed because they match the labels and product pages.</p>}
    </Panel>
  );
}
