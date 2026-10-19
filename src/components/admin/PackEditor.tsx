"use client";

import { useState } from "react";
import type { CatalogueItem, PackDesign } from "@/lib/backoffice/types";
import { COLOURS, CONTAINERS, LIMITS, PICTOGRAMS, packProduct } from "@/lib/packDesign";
import { ProductShot } from "../pack/ProductShot";
import { LabelArtwork } from "../brand/BrandLabel";
import { Button, Field, Input, Select, Textarea } from "./ui";

/**
 * Product picture for a product added in the back office: one of the OCTA
 * containers with a label made from the words typed here, previewed live.
 */
export function PackEditor({ item, value, onChange }: {
  item: Pick<CatalogueItem, "sku" | "productName" | "size"> & { short?: string };
  value: PackDesign;
  onChange: (next: PackDesign) => void;
}) {
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const set = (patch: Partial<PackDesign>) => onChange({ ...value, ...patch });
  const product = packProduct(item, value);
  const wide = value.container === "can" || value.container === "drum";
  const text = (key: "mark" | "title" | "highlight" | "badge" | "un" | "hazardClass", label: string, hint?: string) => (
    <Field label={label} hint={hint}>
      <Input value={value[key]} maxLength={LIMITS[key]} onChange={(e) => set({ [key]: e.target.value.toUpperCase() })} />
    </Field>
  );

  async function download() {
    setBusy(true);
    setError(null);
    try {
      const { downloadPrintLabel } = await import("./printLabel");
      await downloadPrintLabel(product);
    } catch {
      setError("The label couldn't be made in this browser. Try Chrome or Edge.");
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="grid gap-4 border-2 border-ink bg-paper p-4 sm:col-span-2 lg:col-span-4 lg:grid-cols-[1fr_18rem]">
      <div className="grid content-start gap-3 sm:grid-cols-2">
        <Field label="Container">
          <Select value={value.container} onChange={(e) => set({ container: e.target.value as PackDesign["container"] })}>
            {CONTAINERS.map((c) => <option key={c.value} value={c.value}>{c.label}</option>)}
          </Select>
        </Field>
        <Field label="Background colour">
          <Select value={value.colour} onChange={(e) => set({ colour: e.target.value as PackDesign["colour"] })}>
            {COLOURS.map((c) => <option key={c.value} value={c.value}>{c.label}</option>)}
          </Select>
        </Field>
        {text("mark", "Mark after OCTA", "One letter (X, M, N) or a word (BOOST).")}
        {text("title", "Label word", "Printed large, e.g. NITRO.")}
        {text("highlight", "Lime highlight", "Optional, e.g. 98%.")}
        {wide ? text("badge", "Grade tag", "Optional, e.g. PLUS.") : (
          <Field label="Extra lines" hint="Up to 3, one per line (jug and bottle labels).">
            <Textarea rows={3} value={value.lines.join("\n")} onChange={(e) => set({ lines: e.target.value.toUpperCase().split("\n").slice(0, 3) })} />
          </Field>
        )}
        {text("un", "UN number", "Leave empty if not dangerous goods.")}
        {text("hazardClass", "Hazard class", "e.g. CLASS 3.")}
        <fieldset className="sm:col-span-2">
          <legend className="kicker mb-2">Safety signs</legend>
          <div className="flex flex-wrap gap-x-5 gap-y-2">
            {PICTOGRAMS.map((p) => (
              <label key={p.value} className="flex items-center gap-2 text-sm">
                <input type="checkbox" className="h-5 w-5 accent-[var(--color-ink)]" checked={value.pictograms.includes(p.value)}
                  onChange={(e) => set({ pictograms: e.target.checked ? [...value.pictograms, p.value] : value.pictograms.filter((x) => x !== p.value) })} />
                {p.label}
              </label>
            ))}
          </div>
        </fieldset>
        <Field label="Disclaimer on the label" className="sm:col-span-2">
          <Textarea rows={3} maxLength={LIMITS.disclaimer} value={value.disclaimer} onChange={(e) => set({ disclaimer: e.target.value.toUpperCase() })} />
        </Field>
        <p className="text-xs text-muted sm:col-span-2">
          Every label also prints the OCTA phone number, info email and website. Check the safety signs, UN number and wording against the product&apos;s SDS before printing.
        </p>
      </div>
      <div className="space-y-3">
        <p className="kicker">Preview</p>
        <ProductShot product={product} frame="square" className="block h-auto w-full border-2 border-ink" />
        <div className="mx-auto w-1/2"><LabelArtwork product={product} className="block h-auto w-full" /></div>
        <Button className="w-full" onClick={download} disabled={busy}>{busy ? "Making label…" : "Download print label (PNG)"}</Button>
        {error && <p role="alert" className="text-sm text-flare">{error}</p>}
      </div>
    </div>
  );
}
