import assert from "node:assert/strict";
import {readFileSync} from "node:fs";
import {runInNewContext} from "node:vm";
import {test} from "node:test";
import ts from "typescript";
const catalogue=JSON.parse(readFileSync(new URL("../supabase/functions/_shared/catalogue.json",import.meta.url)));
function compile(file,deps={},extra={}){const output=ts.transpileModule(readFileSync(new URL(`../supabase/functions/${file}`,import.meta.url),"utf8"),{compilerOptions:{module:ts.ModuleKind.CommonJS,target:ts.ScriptTarget.ES2022,esModuleInterop:true}}).outputText;const exports={};runInNewContext(output,{exports,require:name=>{if(!(name in deps))throw new Error(name);return deps[name];},crypto:globalThis.crypto,TextEncoder,TextDecoder,URL,Headers,Request,Response,AbortSignal,Date,console:{error(){}},...extra});return exports;}
const core=compile("_shared/payment.ts");
const reseller=compile("_shared/reseller.ts",{"./payment.ts":core});
const details={name:"Test Applicant",email:"applicant@example.test",phone:"0123456789",business:"Example Workshop",entityType:"Workshop / tuner",registration:"",address:"Example business address",city:"Example Town",province:"Example Region",website:"https://shop.example.test",social:"",description:"A workshop serving local performance vehicle customers.",storage:"A proposed dedicated storage area with trained staff.",volume:"25-100L",products:["octa-boost"]};
function fixture(overrides={}){
  const state={row:null,sends:[],fail:false,limited:false};
  const env={RESELLER_ENABLED:"true",RESELLER_ALLOWED_ORIGINS:"https://store.example.test",TURNSTILE_SECRET_KEY:"test-secret",RESEND_API_KEY:"test-key",RESELLER_TO_EMAIL:"review@business.co.za",RESELLER_FROM_EMAIL:"applications@business.co.za",...overrides};
  const db={rpc:async(name,args)=>{if(name==="reseller_take_rate_limit")return {data:!state.limited};assert.equal(name,"reserve_reseller_application");if(state.row&&(state.row.capability_hash!==args.p_capability_hash||state.row.request_hash!==args.p_request_hash))return {error:{}};state.row??={ref:args.p_ref,capability_hash:args.p_capability_hash,request_hash:args.p_request_hash,details:args.p_details,status:"new",notification_status:"pending",created_at:new Date().toISOString()};return {data:state.row};},from:name=>{assert.equal(name,"reseller_applications");return {update:values=>({eq:async()=>{Object.assign(state.row,values);return {};}})};}};
  let handler;
  compile("reseller-application/index.ts",{"../_shared/catalogue.json":catalogue,"../_shared/payment.ts":core,"../_shared/runtime.ts":{database:()=>db},"../_shared/reseller.ts":reseller,"../_shared/bot.ts":{verifyBot:async(token,_secret,_origins,_fetcher,action)=>{assert.equal(action,"reseller");if(token!=="valid-proof")throw new core.CheckoutError("Fresh security check required.");}}},{Deno:{serve:fn=>handler=fn,env:{get:name=>env[name]}},fetch:async(url,options)=>{assert.equal(url,"https://api.resend.com/emails");state.sends.push({body:JSON.parse(options.body),key:options.headers["Idempotency-Key"]});if(state.fail)throw new Error("provider");return new Response(JSON.stringify({id:"test-email-id"}),{status:200});}});
  const body={ref:"OCTA-R-ABCDEF1234567890",token:"a".repeat(64),details,privacyAcknowledged:true,privacyVersion:catalogue.termsVersion,captchaToken:"valid-proof"};
  const call=(change={},origin="https://store.example.test")=>handler(new Request("https://project.supabase.co/functions/v1/reseller-application",{method:"POST",headers:{Origin:origin,"Content-Type":"application/json"},body:JSON.stringify({...body,...change})}));
  return {state,call};
}
test("reseller validation bounds personal data and rejects unsafe links, forged products and header injection",()=>{
  assert.equal(reseller.validateApplication(details,["octa-boost"]).business,details.business);
  for(const change of [{website:"javascript:alert(1)"},{website:"https://user:password@example.test"},{email:"applicant@example.test\r\nBcc: victim@example.test"},{products:["invented-product"]},{description:"x".repeat(1501)}]) assert.throws(()=>reseller.validateApplication({...details,...change},["octa-boost"]));
});
test("reseller VAT number is optional, normalised and checked for the South African format",()=>{
  assert.equal(reseller.validateApplication(details,["octa-boost"]).vat,"","missing VAT is treated as not registered");
  assert.equal(reseller.validateApplication({...details,vat:"4123-456-789"},["octa-boost"]).vat,"4123456789");
  for(const vat of ["123","5123456789","4123456789\nBcc: x@example.test"]) assert.throws(()=>reseller.validateApplication({...details,vat},["octa-boost"]),undefined,vat);
  assert.match(reseller.applicationEmail("OCTA-R-1",reseller.validateApplication({...details,vat:"4123456789"},["octa-boost"]),"to@example.test","from@example.test").text,/VAT number: 4123456789/);
});
test("reseller submissions use a fixed recipient, private database and applicant Reply-To, without automatic approval",async()=>{
  const {state,call}=fixture();const response=await call();assert.equal(response.status,200);assert.equal((await response.json()).notification,"sent");assert.equal(state.row.status,"new");assert.deepEqual(state.sends[0].body.to,["review@business.co.za"]);assert.equal(state.sends[0].body.reply_to,details.email);assert.ok(!state.sends[0].body.html);assert.match(state.sends[0].body.text,/unverified/);
  await call();assert.equal(state.sends.length,1);
});
test("reseller endpoint fails closed for missing setup, untrusted origins, stale acknowledgement, invalid CAPTCHA and excess requests",async()=>{
  assert.equal((await fixture({RESEND_API_KEY:""}).call()).status,503);
  assert.equal((await fixture().call({},"https://untrusted.example.test")).status,403);
  assert.equal((await fixture().call({privacyAcknowledged:false})).status,400);
  assert.equal((await fixture().call({privacyVersion:"old-version"})).status,400);
  assert.equal((await fixture().call({details:{...details,description:"x".repeat(20000)}})).status,413);
  assert.equal((await fixture().call({captchaToken:"invalid"})).status,400);
  const f=fixture();f.state.limited=true;assert.equal((await f.call()).status,429);assert.equal(f.state.row,null);
});
test("email failure preserves one application and retry uses the same notification idempotency key",async()=>{
  const f=fixture();f.state.fail=true;assert.equal((await f.call()).status,202);assert.equal(f.state.row.notification_status,"pending");f.state.fail=false;assert.equal((await f.call()).status,200);assert.equal(f.state.sends[0].key,f.state.sends[1].key);assert.deepEqual(f.state.sends[0].body,f.state.sends[1].body);
  assert.equal((await f.call({token:"b".repeat(64)})).status,409);
});
test("ambiguous old notifications are held for operator reconciliation after the provider deduplication window",async()=>{
  const f=fixture();f.state.fail=true;await f.call();f.state.row.created_at="2020-01-01T00:00:00Z";f.state.fail=false;assert.equal((await f.call()).status,202);assert.equal(f.state.sends.length,1);
});
