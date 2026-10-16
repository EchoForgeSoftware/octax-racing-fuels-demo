"use client";
import Link from "next/link";
import { useEffect, useRef, useState, type FormEvent } from "react";
import { products } from "@/lib/products";
import { resellerEnabled, submitReseller, type ResellerDetails, type ApplicationReceipt } from "@/lib/reseller";
import { BotCheck, useBotCheck } from "./BotCheck";
import { normaliseVat, vatError } from "@/lib/vat";

const input = "mt-2 w-full border-2 border-ink bg-paper-2 px-3 py-3 text-base outline-none focus:bg-lime/15 aria-[invalid=true]:border-flare";
const button = "border-2 border-ink bg-flare px-6 py-3.5 font-display uppercase text-paper transition-colors hover:bg-ink disabled:cursor-not-allowed disabled:opacity-50";
const fields = [
  {name:"name",label:"Your full name",required:true,autoComplete:"name"},
  {name:"email",label:"Email address",required:true,type:"email",autoComplete:"email"},
  {name:"phone",label:"Phone / WhatsApp number",required:true,type:"tel",autoComplete:"tel"},
  {name:"business",label:"Shop or business name",required:true,autoComplete:"organization"},
  {name:"registration",label:"Company registration number (if applicable)"},
  {name:"vat",label:"VAT number (if VAT-registered)",inputMode:"numeric"},
  {name:"address",label:"Business / shop address",required:true,autoComplete:"street-address"},
  {name:"city",label:"City / town",required:true,autoComplete:"address-level2"},
  {name:"province",label:"Province / region",required:true,autoComplete:"address-level1"},
  {name:"website",label:"Website or public shop page",type:"url",placeholder:"https://..."},
  {name:"social",label:"Social media or public shop photo link",type:"url",placeholder:"https://..."},
] as const;

export function ResellerForm() {
  const bot = useBotCheck();
  const [errors,setErrors] = useState<Record<string,string>>({});
  const [draft,setDraft] = useState<ResellerDetails|null>(null);
  const [receipt,setReceipt] = useState<ApplicationReceipt|null>(null);
  const [busy,setBusy] = useState(false);
  const [error,setError] = useState("");
  const pending = useRef<{signature:string;ref:string;token:string}|null>(null);
  const summaryHeading=useRef<HTMLHeadingElement>(null);
  useEffect(()=>{if(draft)summaryHeading.current?.focus();},[draft]);

  function review(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const data=new FormData(e.currentTarget);
    const details=Object.fromEntries([...fields.map(f=>f.name),"entityType","description","storage","volume"].map(name=>[name,String(data.get(name)||"").trim()])) as unknown as ResellerDetails;
    details.products=data.getAll("products").map(String);
    details.vat=normaliseVat(details.vat);
    const next:Record<string,string>={};
    for (const f of fields) if ("required" in f && f.required && !details[f.name]) next[f.name]="Please complete this field.";
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(details.email)) next.email="Enter a valid email address.";
    if (details.phone.replace(/\D/g,"").length<9) next.phone="Enter a phone number with at least 9 digits.";
    const vat=vatError(details.vat); if (vat) next.vat=vat;
    for (const key of ["website","social"] as const) if (details[key]) {
      try { const url=new URL(details[key]); if(url.protocol!=="https:" || url.username || url.password) throw new Error(); }
      catch { next[key]="Use a full HTTPS link without login details."; }
    }
    if(details.description.length<40) next.description="Tell us a little more about your shop and customers (at least 40 characters).";
    if(details.storage.length<30) next.storage="Describe your storage and handling arrangements (at least 30 characters).";
    if(!details.products.length) next.products="Choose at least one product.";
    if(data.get("acknowledge")!=="on") next.acknowledge="Please confirm you are authorised to apply and have read the privacy notice.";
    setErrors(next);setError("");
    if(Object.keys(next).length) {
      e.currentTarget.querySelector<HTMLElement>(`[name="${Object.keys(next)[0]}"]`)?.focus();return;
    }
    setDraft(details);
  }

  async function send() {
    if(!draft || busy || bot.pending || !resellerEnabled) return;
    setBusy(true);setError("");
    const signature=JSON.stringify(draft);
    if(pending.current?.signature!==signature) pending.current={signature,ref:`OCTA-R-${crypto.randomUUID().replaceAll("-","").slice(0,16).toUpperCase()}`,token:crypto.randomUUID().replaceAll("-","")+crypto.randomUUID().replaceAll("-","")};
    try { setReceipt(await submitReseller(draft,pending.current.ref,pending.current.token,bot.token)); }
    catch(err) {setError(err instanceof Error?err.message:"We couldn't confirm the application. Please try again.");}
    finally {bot.reset();setBusy(false);}
  }

  return <div className="border-2 border-ink bg-panel p-5 shadow-[8px_8px_0_0_var(--color-lime)] sm:p-8">
    {receipt ? <div role="status" className="space-y-5">
      <p className="kicker text-flare">Application received</p><h2 className="font-display text-3xl">You’re on our review list.</h2>
      <p className="text-ink-soft">Keep your reference <strong className="font-mono text-ink">{receipt.ref}</strong>. We’ll review the business details you supplied and contact you using your email or phone number.</p>
      <p className="border-2 border-ink bg-lime p-4 text-sm">This confirms receipt of your application. Reseller status and trading terms require our written approval.</p>
      {receipt.notification==="pending" && <p className="text-sm text-ink-soft">Your application is saved, but the team’s email notification is delayed.</p>}
    </div> : <>
      {!resellerEnabled && <p role="status" className="mb-6 border-2 border-dashed border-ink bg-paper-2 p-4 text-sm text-ink-soft">Applications are being connected. You can complete and review this form; sending will open once our review inbox is ready.</p>}
      <form onSubmit={review} noValidate hidden={!!draft} className="space-y-7">
        <div><p className="kicker text-flare">01 / You and your business</p><h2 className="mt-2 font-display text-2xl">Introduce your shop.</h2></div>
        <div className="grid gap-5 sm:grid-cols-2">{fields.map(f=><div key={f.name} className={f.name==="address"?"sm:col-span-2":""}>
          <label htmlFor={`reseller-${f.name}`} className="kicker">{f.label}{"required" in f && f.required && <span className="ml-1 text-flare" aria-hidden="true">*</span>}</label>
          <input id={`reseller-${f.name}`} name={f.name} type={"type" in f?f.type:"text"} autoComplete={"autoComplete" in f?f.autoComplete:undefined} placeholder={"placeholder" in f?f.placeholder:undefined} inputMode={"inputMode" in f?f.inputMode:undefined} maxLength={f.name==="address"?500:f.name==="website"||f.name==="social"?600:254} className={input} aria-required={"required" in f && f.required || undefined} aria-invalid={!!errors[f.name]} aria-describedby={errors[f.name]?`reseller-${f.name}-error`:undefined}/>
          {errors[f.name]&&<p id={`reseller-${f.name}-error`} className="mt-2 text-xs text-flare">{errors[f.name]}</p>}
        </div>)}</div>
        <div className="grid gap-5 sm:grid-cols-2">
          <label className="kicker">Business type<select name="entityType" className={input} defaultValue="Retail shop"><option>Retail shop</option><option>Workshop / tuner</option><option>Distributor</option><option>Sole trader</option><option>Other entity</option></select></label>
          <label className="kicker">Expected monthly volume<select name="volume" className={input} defaultValue="Not sure yet"><option>Not sure yet</option><option>Under 25L</option><option>25-100L</option><option>100-500L</option><option>500L+</option></select></label>
        </div>
        <div className="border-t-2 border-ink pt-6"><p className="kicker text-flare">02 / Your fit with OCTA</p><h2 className="mt-2 font-display text-2xl">Tell us how you operate.</h2></div>
        <fieldset><legend className="kicker">Products you’d like to stock *</legend><div className="mt-3 grid gap-3 sm:grid-cols-2">{products.map(p=><label key={p.slug} className="flex items-center gap-3 border-2 border-line p-3 text-sm"><input type="checkbox" name="products" value={p.slug} aria-invalid={!!errors.products} className="h-5 w-5 shrink-0 accent-[var(--color-ink)]"/>{p.name}</label>)}</div>{errors.products&&<p role="alert" className="mt-2 text-xs text-flare">{errors.products}</p>}</fieldset>
        {([{name:"description",label:"About your shop and customers",help:"Describe the business, your customers, product experience and the area you serve.",max:1500},{name:"storage",label:"Storage and handling arrangements",help:"Tell us about your proposed storage, staff handling arrangements and relevant facilities. We may request supporting information during review.",max:1000}] as const).map(f=><div key={f.name}><label htmlFor={`reseller-${f.name}`} className="kicker">{f.label} *</label><p className="mt-2 text-sm text-muted">{f.help}</p><textarea id={`reseller-${f.name}`} name={f.name} rows={4} maxLength={f.max} aria-required="true" aria-invalid={!!errors[f.name]} aria-describedby={errors[f.name]?`reseller-${f.name}-error`:undefined} className={input}/>{errors[f.name]&&<p id={`reseller-${f.name}-error`} className="mt-2 text-xs text-flare">{errors[f.name]}</p>}</div>)}
        <div className="border-t-2 border-ink pt-5"><label className="flex items-start gap-3 text-sm text-ink-soft"><input type="checkbox" name="acknowledge" className="mt-1 h-5 w-5 shrink-0 accent-[var(--color-ink)]" aria-invalid={!!errors.acknowledge}/><span>I am authorised to apply for this business, have read the <Link href="/privacy/" target="_blank" rel="noopener noreferrer" className="underline">privacy notice</Link>, and understand OCTA will use these details to assess this application and contact me.</span></label>{errors.acknowledge&&<p role="alert" className="mt-2 text-xs text-flare">{errors.acknowledge}</p>}<p className="mt-3 text-xs text-muted">Please share public shop links only. Do not include identity documents, bank details or passwords. Applying does not create a reseller agreement or subscribe you to marketing.</p></div>
        <button type="submit" className={button}>Review application →</button>
      </form>
      {draft&&<div className="space-y-5"><p className="kicker text-flare">03 / Check before sending</p><h2 ref={summaryHeading} tabIndex={-1} className="scroll-mt-24 font-display text-3xl outline-none">Ready for our review?</h2><p className="text-sm text-muted">Nothing has been sent yet. Check your details below.</p><dl className="divide-y divide-line border-y-2 border-ink">{Object.entries(draft).map(([key,value])=><div key={key} className="py-3"><dt className="kicker text-muted">{fields.find(f=>f.name===key)?.label||({entityType:"Business type",volume:"Monthly volume",products:"Products",description:"About your business",storage:"Storage and handling"} as Record<string,string>)[key]||key}</dt><dd className="mt-1 whitespace-pre-wrap break-words text-sm">{Array.isArray(value)?value.map(slug=>products.find(p=>p.slug===slug)?.name||slug).join(", "):value||"Not provided"}</dd></div>)}</dl>{error&&<p role="alert" className="border-2 border-flare p-3 text-sm">{error}</p>}<BotCheck key={bot.attempt} action="reseller" onToken={bot.setToken}/><div className="flex flex-wrap gap-3"><button type="button" disabled={busy||!resellerEnabled||bot.pending} onClick={send} className={button}>{busy?"Sending…":resellerEnabled?"Submit for review":"Applications open soon"}</button><button type="button" disabled={busy} onClick={()=>{setDraft(null);setError("");bot.reset();}} className="border-2 border-ink px-5 py-3 font-display uppercase hover:bg-lime">Edit details</button></div></div>}
    </>}
  </div>;
}
