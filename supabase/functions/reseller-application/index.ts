import catalogue from "../_shared/catalogue.json" with {type:"json"};
import { CheckoutError,sha256 } from "../_shared/payment.ts";
import { database } from "../_shared/runtime.ts";
import { verifyBot } from "../_shared/bot.ts";
import { applicationEmail,validateApplication } from "../_shared/reseller.ts";

Deno.serve(async(request:Request)=>{
  let headers:Record<string,string>={"Content-Type":"application/json","Cache-Control":"no-store",Vary:"Origin"};
  const reply=(value:unknown,status=200)=>new Response(JSON.stringify(value),{status,headers});
  try {
    const origins=(Deno.env.get("RESELLER_ALLOWED_ORIGINS")||"").split(",").filter(Boolean).map(value=>new URL(value.trim()).origin);
    const origin=request.headers.get("origin");
    if(!origin||!origins.includes(origin)) return reply({error:"Application origin is not allowed."},403);
    headers={...headers,"Access-Control-Allow-Origin":origin,"Access-Control-Allow-Headers":"authorization, apikey, content-type, x-client-info","Access-Control-Allow-Methods":"POST, OPTIONS"};
    if(request.method==="OPTIONS") return new Response(null,{status:204,headers});
    if(request.method!=="POST") return reply({error:"Use POST."},405);
    const secret=Deno.env.get("TURNSTILE_SECRET_KEY"),key=Deno.env.get("RESEND_API_KEY"),to=Deno.env.get("RESELLER_TO_EMAIL"),from=Deno.env.get("RESELLER_FROM_EMAIL");
    const email=/^[^\s@<>]+@[^\s@<>]+\.[^\s@<>]+$/;
    if(Deno.env.get("RESELLER_ENABLED")!=="true" || !secret || !key || !to || !from || !email.test(to)||!email.test(from)||[to,from].some(address=>/\.(example|test|invalid)$/i.test(address))) throw new CheckoutError("Reseller applications are not open yet.",503);
    const db=database();
    const ip=request.headers.get("x-forwarded-for")?.split(",")[0].trim()||"unknown";
    for(const [window,max] of [[60,5],[86400,40]]) {
      const limit=await db.rpc("reseller_take_rate_limit",{p_bucket:await sha256(`${ip}:${window}`),p_max:max,p_seconds:window});
      if(limit.error) throw new CheckoutError("Applications are unavailable. Please try again.",503);
      if(!limit.data) return reply({error:"Too many applications. Please wait before trying again."},429);
    }
    const reader=request.body?.getReader();let bytes=0;let raw="";const decoder=new TextDecoder();
    if(reader) while(true){const chunk=await reader.read();if(chunk.done)break;bytes+=chunk.value.byteLength;if(bytes>18000){await reader.cancel();throw new CheckoutError("The application is too large.",413);}raw+=decoder.decode(chunk.value,{stream:true});}
    raw+=decoder.decode();const body=JSON.parse(raw);
    if(typeof body.ref!=="string"||!/^OCTA-R-[A-F0-9]{16}$/.test(body.ref)||typeof body.token!=="string"||!/^[a-f0-9]{64}$/.test(body.token)) throw new CheckoutError("Reload the form and try again.");
    if(body.privacyAcknowledged!==true||body.privacyVersion!==catalogue.termsVersion) throw new CheckoutError("Read the current privacy notice and confirm you are authorised to apply.");
    const details=validateApplication(body.details,[...new Set(catalogue.items.map(item=>item.slug))]);
    await verifyBot(body.captchaToken,secret,origins,undefined,"reseller");
    const reservation=await db.rpc("reserve_reseller_application",{p_ref:body.ref,p_capability_hash:await sha256(body.token),p_request_hash:await sha256(JSON.stringify({details,privacyVersion:catalogue.termsVersion})),p_details:details,p_privacy_version:catalogue.termsVersion});
    if(reservation.error||!reservation.data) throw new CheckoutError("We couldn't save this application. Retry on this page, or edit your details to start a new application.",409);
    const saved=reservation.data;
    if(saved.notification_status==="sent") return reply({ref:body.ref,notification:"sent"});
    // Resend retains idempotency keys for 24h. Do not resend an ambiguous old
    // notification automatically after that window; an operator must reconcile it.
    if(Date.now()-Date.parse(saved.created_at)>23*60*60*1000) return reply({ref:body.ref,notification:"pending"},202);
    try {
      const response=await fetch("https://api.resend.com/emails",{method:"POST",headers:{Authorization:`Bearer ${key}`,"Content-Type":"application/json","Idempotency-Key":`reseller/${body.ref}`},body:JSON.stringify(applicationEmail(body.ref,details,to,from)),signal:AbortSignal.timeout(15000)});
      if(!response.ok) throw new Error("provider");
      const sent=await response.json();if(typeof sent.id!=="string"||!sent.id||sent.id.length>128) throw new Error("provider");
      const update=await db.from("reseller_applications").update({notification_status:"sent",notification_id:sent.id}).eq("ref",body.ref);
      if(update.error) throw new Error("database");
      return reply({ref:body.ref,notification:"sent"});
    } catch {console.error("Reseller notification pending; operator review required");return reply({ref:body.ref,notification:"pending"},202);}
  } catch(error) {
    if(error instanceof CheckoutError) return reply({error:error.message},error.status);
    if(error instanceof SyntaxError) return reply({error:"Invalid application request."},400);
    console.error("Reseller application failed");return reply({error:"We couldn't confirm your application. Your details are still on this page; please try again."},503);
  }
});
