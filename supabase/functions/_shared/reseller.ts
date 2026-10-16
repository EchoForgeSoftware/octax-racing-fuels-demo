import { CheckoutError, validVat } from "./payment.ts";
export function validateApplication(value: unknown, slugs: string[]) {
  if (!value || typeof value !== "object" || Array.isArray(value)) throw new CheckoutError("Complete your business details.");
  const raw=value as Record<string,unknown>;
  const limits:Record<string,[number,number]>={name:[1,200],email:[3,254],phone:[9,50],business:[1,200],entityType:[1,40],registration:[0,100],vat:[0,20],address:[1,500],city:[1,150],province:[1,150],website:[0,600],social:[0,600],description:[40,1500],storage:[30,1000],volume:[1,40]};
  const details:Record<string,string|string[]>={};
  for(const [key,[min,max]] of Object.entries(limits)){
    // VAT is optional and newer than the form: a missing value is treated as empty.
    const value=key==="vat"?raw[key]??"":raw[key];
    if(typeof value!=="string") throw new CheckoutError("Complete your business details.");
    const text=value.trim();
    if(text.length<min || text.length>max || /[\u0000-\u0008\u000b\u000c\u000e-\u001f\u007f]/.test(text) || (!["description","storage","address"].includes(key)&&/[\r\n]/.test(text))) throw new CheckoutError(`Check the ${key} field and try again.`);
    details[key]=text;
  }
  if(!validVat(details.vat as string)) throw new CheckoutError("A South African VAT number is 10 digits starting with 4.");
  details.vat=(details.vat as string).replace(/[\s-]/g,"");
  if(!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(details.email as string) || (details.phone as string).replace(/\D/g,"").length<9) throw new CheckoutError("Check your email and phone number.");
  if(!["Retail shop","Workshop / tuner","Distributor","Sole trader","Other entity"].includes(details.entityType as string) || !["Not sure yet","Under 25L","25-100L","100-500L","500L+"].includes(details.volume as string)) throw new CheckoutError("Choose a listed business type and volume.");
  for(const key of ["website","social"]) if(details[key]){
    try { const url=new URL(details[key] as string); if(url.protocol!=="https:" || url.username || url.password) throw new Error(); }
    catch { throw new CheckoutError("Shop links must use HTTPS without login details."); }
  }
  if(!Array.isArray(raw.products) || !raw.products.length || raw.products.length>slugs.length || raw.products.some(p=>typeof p!=="string"||!slugs.includes(p))) throw new CheckoutError("Choose the products you want to stock.");
  details.products=[...new Set(raw.products as string[])].sort();
  return details;
}
export function applicationEmail(ref:string, details:Record<string,string|string[]>, to:string, from:string){
  const labels:Record<string,string>={name:"Contact",email:"Email",phone:"Phone / WhatsApp",business:"Business",entityType:"Entity type",registration:"Company registration",vat:"VAT number",address:"Address",city:"City",province:"Province / region",website:"Shop website",social:"Social / photo link",description:"Business and customers",storage:"Storage and handling",volume:"Expected monthly volume",products:"Product interests"};
  return {from,to:[to],reply_to:details.email,subject:`OCTA reseller application | ${ref}`,text:[`NEW RESELLER APPLICATION: ${ref}`,"Status: awaiting manual review. No approval has been issued.","Applicant-supplied details and links are unverified. Treat links with care.",...Object.entries(labels).map(([key,label])=>`${label}: ${Array.isArray(details[key])?(details[key] as string[]).join(", "):details[key]||"Not provided"}`),"Review the business in Supabase reseller_applications. Record a decision there, then communicate any approval and trading terms directly."].join("\n\n")};
}
