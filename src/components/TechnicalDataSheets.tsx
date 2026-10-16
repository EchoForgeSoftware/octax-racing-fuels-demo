import Link from "next/link";
import { asset } from "@/lib/site";
import { technicalSheets, type TechnicalSheet } from "@/lib/technicalSheets";
import { OctaLogo } from "./brand/Wordmark";

export function ProductDataSheet({ sheet }: { sheet: TechnicalSheet }) {
  return <section className="mt-8 border-2 border-ink bg-lime p-5 shadow-[6px_6px_0_0_var(--color-ink)]">
    <p className="kicker">From the technical desk</p>
    <h2 className="mt-2 font-display text-2xl">The details. On paper.</h2>
    <p className="mt-3 text-sm text-ink-soft">{sheet.name} application data, {sheet.slug === "octa-torque" ? "technical properties and benefits" : "benefits and dosage table"}, in a branded reference sheet.</p>
    <a href={asset(sheet.pdf)} target="_blank" rel="noopener noreferrer" className="mt-5 flex items-center justify-between gap-4 border-2 border-ink bg-ink px-4 py-3 font-mono text-xs font-bold uppercase tracking-wider text-paper hover:bg-paper hover:text-ink">
      View technical data sheet <span aria-hidden="true">↗</span>
    </a>
    <p className="mt-3 font-mono text-[0.65rem] uppercase tracking-wide">PDF · {sheet.pages} {sheet.pages === 1 ? "page" : "pages"} · Technical data, not an SDS</p>
  </section>;
}

export function TechnicalDataSheets() {
  return <section id="data-sheets" className="relative mt-16 scroll-mt-24 border-2 border-ink bg-ink p-5 text-paper shadow-[9px_9px_0_0_var(--color-lime)] sm:p-8">
    <div className="flex flex-wrap items-start justify-between gap-5 border-b border-paper/25 pb-7">
      <div>
        <p className="kicker text-lime">The technical line-up / 01-03</p>
        <h2 className="mt-3 font-display text-[clamp(2rem,6vw,3.7rem)] leading-[0.92]">Details that drive.</h2>
      </div>
      <OctaLogo tone="light" className="h-10 w-auto shrink-0" />
    </div>
    <p className="mt-5 max-w-2xl text-sm text-paper/75">Product profiles, dosage tables and technical properties. Download the OCTA reference sheets, issued under ZRG-X (PTY) LTD.</p>
    <div className="mt-8 grid gap-5 md:grid-cols-3">
      {technicalSheets.map((sheet, i) => <article key={sheet.slug} className="group flex flex-col border-2 border-paper/25 bg-paper text-ink">
        <a href={asset(sheet.pdf)} target="_blank" rel="noopener noreferrer" aria-label={`Preview ${sheet.name} technical data sheet`} className="relative block overflow-hidden border-b-2 border-ink bg-[#dedbd2] px-6 pb-0 pt-6">
          <span className="absolute left-0 top-0 z-10 bg-lime px-3 py-1 font-mono text-xs font-bold">TDS / 0{i+1}</span>
          <img src={asset(sheet.preview)} alt={`${sheet.name} technical data sheet with OCTA and ZRG-X branding`} width={620} height={877} loading="lazy" className="mx-auto block h-auto w-full max-w-52 origin-bottom -rotate-3 border border-ink/20 shadow-[5px_5px_0_0_rgba(25,24,23,0.2)] transition-transform duration-300 group-hover:rotate-0" />
        </a>
        <div className="flex flex-1 flex-col p-4">
          <p className="font-mono text-[0.62rem] uppercase tracking-wider text-muted">{sheet.category}</p>
          <h3 className="mt-2 font-display text-xl">{sheet.name}</h3>
          <p className="mt-2 flex-1 text-xs leading-relaxed text-ink-soft">{sheet.slug === "octa-torque" ? "Properties, test methods, application and dosage." : "Product profile, benefits and a clear dosage table."}</p>
          <a href={asset(sheet.pdf)} download className="mt-5 flex items-center justify-between border-2 border-ink bg-lime px-3 py-3 font-mono text-[0.65rem] font-bold uppercase tracking-wide transition-colors hover:bg-ink hover:text-paper">Download PDF <span aria-hidden="true">↓</span></a>
          <Link href={`/shop/${sheet.slug}/`} className="mt-3 text-center font-mono text-[0.62rem] uppercase tracking-wide underline underline-offset-4 hover:text-flare">View product</Link>
        </div>
      </article>)}
    </div>
    <p className="mt-6 max-w-2xl text-xs leading-relaxed text-paper/65">These are technical data sheets, not Safety Data Sheets (SDS). Consult the current SDS before handling. Octane-increase values are shown as supplied; test methods and units for those increases were not provided.</p>
    <div className="mt-5 border-t border-paper/25 pt-4 text-xs text-paper/65">OCTA-X and OCTA-M technical sheets will be added when the matching documents are available.</div>
  </section>;
}
