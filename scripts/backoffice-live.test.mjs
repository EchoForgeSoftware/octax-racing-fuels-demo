// Live back office: the server rules (src/lib/backoffice/server.ts) running on
// the real storage functions (supabase/backoffice-live.sql) in a local Postgres.
import assert from "node:assert/strict";
import {test,after} from "node:test";
import {readFileSync} from "node:fs";
import {PGlite} from "@electric-sql/pglite";
import {loadTs} from "./load-ts.mjs";
const server=loadTs("src/lib/backoffice/server.ts"),seed=loadTs("src/lib/backoffice/seed.ts");
const today="2026-10-18";
const db=new PGlite();
await db.exec(`create role anon;create role authenticated;create role service_role bypassrls;create schema auth;
create table auth.users(id uuid primary key,email text,email_confirmed_at timestamptz);
create function auth.uid() returns uuid language sql stable as $$select nullif(current_setting('request.jwt.claim.sub',true),'')::uuid$$;
grant usage on schema public,auth to anon,authenticated,service_role;`);
await db.exec(readFileSync(new URL("../supabase/backoffice.sql",import.meta.url),"utf8"));
const live=readFileSync(new URL("../supabase/backoffice-live.sql",import.meta.url),"utf8");
await db.exec(live);await db.exec(live);

const people={
  zuan:{id:"11111111-1111-4111-8111-111111111111",email:"zuan@octa-boost.com"},
  danium:{id:"22222222-2222-4222-8222-222222222222",email:"danium@octa-boost.com"},
  accounts:{id:"33333333-3333-4333-8333-333333333333",email:"accounts@octa-boost.com"},
  rep:{id:"44444444-4444-4444-8444-444444444444",email:"sipho.rep@example.test"},
  customer:{id:"55555555-5555-4555-8555-555555555555",email:"buyer@example.test"},
  unconfirmed:{id:"66666666-6666-4666-8666-666666666666",email:"zandro@octa-boost.com",confirmed:false},
};
for(const p of Object.values(people))await db.query("insert into auth.users values($1,$2,$3)",[p.id,p.email,p.confirmed===false?null:"2026-10-18"]);
const user=name=>({id:people[name].id,email:people[name].email,emailConfirmed:people[name].confirmed!==false});

/** The Edge Function's store, on PGlite. `clash` simulates someone else saving first. */
let clash=0;
const store={
  async load(collections){const r=(await db.query("select public.bo_store_load($1) as v",[collections??null])).rows[0].v;return {version:Number(r.version),rows:r.rows};},
  async commit(version,upserts,deletes,audit){
    if(clash>0){clash--;await db.query("update public.bo_store_version set version=version+1");}
    const r=await db.query("select public.bo_store_commit($1,$2::jsonb,$3::jsonb,$4,$5,$6::jsonb) as v",[version,JSON.stringify(upserts),JSON.stringify(deletes),audit.actor,audit.operation,JSON.stringify(audit.details)]);
    return r.rows[0].v!==null;
  },
  async staff(id){return (await db.query("select display_name,role,active from public.bo_staff where user_id=$1",[id])).rows[0]??null;},
  async claimInvite(id,email){return (await db.query("select public.bo_claim_staff_invite($1,$2) as v",[id,email])).rows[0].v;},
  async file(id){return (await db.query("select data from public.bo_store where collection='file' and id=$1",[id])).rows[0]?.data??null;},
};
let n=0;const makeId=p=>`${p}-${(++n).toString(16).padStart(8,"0")}`;
const call=(name,body)=>server.handle(body,name?user(name):null,store,today,makeId);
const act=(name,action,args,ids)=>call(name,{op:"act",name:action,args,ids});

test("storage is closed to browsers and only the server's functions can read or save",async()=>{
  for(const role of ["anon","authenticated"]){
    await db.exec(`set role ${role}`);
    try{
      await assert.rejects(()=>db.query("select * from public.bo_store"),/permission denied/);
      await assert.rejects(()=>db.query("select public.bo_store_load(null)"),/permission denied/);
      await assert.rejects(()=>db.query("select public.bo_store_commit(0,'[]','[]',null,'x','{}')"),/permission denied/);
      await assert.rejects(()=>db.query("select * from public.bo_staff_invites"),/permission denied/);
    }finally{await db.exec("reset role");}
  }
});

test("staff become staff only by signing in with their own confirmed invited email",async()=>{
  assert.equal((await call(null,{op:"load"})).status,401);
  assert.equal((await call("customer",{op:"load"})).status,403);
  assert.equal((await call("unconfirmed",{op:"load"})).status,403,"an unconfirmed address can't claim an invite");
  // A confirmed user can't claim someone else's invite by passing their email.
  assert.equal((await db.query("select public.bo_claim_staff_invite($1,'zuan@octa-boost.com') as v",[people.customer.id])).rows[0].v,null);
  const danium=await call("danium",{op:"load"});
  assert.equal(danium.status,200);assert.equal(danium.body.admin.role,"viewer");assert.equal(danium.body.data,null);assert.equal(danium.body.needsSetup,true);
  assert.equal((await call("danium",{op:"init",data:seed.emptyData()})).status,403,"only a main admin sets up the records");
  assert.equal((await act("danium","saveClient",[{}])).status,409);
});

test("the first main admin sets up the catalogue once; nobody can set it up again",async()=>{
  const start=seed.emptyData();
  const bad=structuredClone(start);bad.documents.push({id:"x"});
  assert.equal((await call("zuan",{op:"init",data:bad})).status,400);
  const r=await call("zuan",{op:"init",data:start});
  assert.equal(r.status,200);assert.equal(r.body.admin.role,"main");assert.equal(r.body.data.catalogue.length,start.catalogue.length);
  assert.equal((await call("zuan",{op:"init",data:start})).status,409);
  assert.equal((await db.query("select count(*)::int as n from public.bo_audit where operation='init'")).rows[0].n,1);
});

const client=(id,extra={})=>({id,type:"private",name:id,company:"",email:"",phone:"",vat:"",address:"",city:"Benoni",notes:"secret note",tier:"retail",prices:{},linkedEmail:"",createdAt:today,repId:null,cash:false,...extra});

test("main admins save records; the reply and later loads come from the database",async()=>{
  await act("zuan","saveRep",[{id:"r-sipho",name:"Sipho",email:"Sipho.Rep@example.test",phone:"",active:true,createdAt:today}]);
  await act("zuan","saveClient",[client("c-a",{repId:"r-sipho",prices:{"OCTA-X-25":999},linkedEmail:"buyer@example.test"})]);
  await act("zuan","saveClient",[client("c-b")]);
  const item=(await call("zuan",{op:"load"})).body.data.catalogue.find(i=>i.sku==="OCTA-X-25");
  await act("zuan","saveCatalogueItem",[{...item,cost:600,agent:1000}]);
  const loaded=(await call("zuan",{op:"load"})).body.data;
  assert.deepEqual(loaded.clients.map(c=>c.id).sort(),["c-a","c-b","c-octa-sales"]);
  assert.equal(loaded.catalogue.find(i=>i.sku==="OCTA-X-25").cost,600);
  assert.equal(loaded.reps[0].email,"sipho.rep@example.test");
});

test("a rep signs in by the email on their rep record and sees only their customers, without costs",async()=>{
  const r=await call("rep",{op:"load"});
  assert.equal(r.status,200);assert.equal(r.body.admin.role,"rep");assert.equal(r.body.admin.repId,"r-sipho");
  assert.deepEqual(r.body.data.clients.map(c=>c.id),["c-a"]);
  assert.equal(r.body.data.clients[0].notes,"");
  assert.ok(r.body.data.catalogue.every(i=>i.cost===null));
});

const order=(id,clientId,lines,extra={})=>({id,kind:"invoice",number:"",clientId,date:today,dueDate:"2026-10-25",channel:"private",lines,courier:200,notes:"",reference:"",quoteState:"draft",linkedId:null,cancelled:false,payments:[],createdAt:today,delivery:{method:"own",status:"delivered",signature:"data:image/png;base64,x",receivedName:"X",receivedSurname:"Y"},...extra});

test("order takers' orders are rebuilt from trusted records: their customers, catalogue prices, no payments or sign-off",async()=>{
  const tampered=order("i-rep1","c-a",[{id:"l1",sku:"OCTA-X-25",description:"",qty:2,unitPrice:1,unitCost:0}],{payments:[{id:"p",date:today,amount:5000,method:"cash",note:""}],cancelled:true});
  const r=await act("rep","saveDocument",[tampered]);
  assert.equal(r.status,200);
  const saved=r.body.result;
  assert.equal(saved.number,"INV-0001");assert.equal(saved.lines[0].unitPrice,999,"the customer's agreed price");
  assert.equal(saved.lines[0].unitCost,0,"costs never reach the rep");assert.deepEqual(saved.payments,[]);assert.equal(saved.cancelled,false);
  assert.equal(saved.delivery.status,"pending");
  const full=(await call("zuan",{op:"load"})).body.data.documents.find(d=>d.id==="i-rep1");
  assert.equal(full.lines[0].unitCost,600,"the cost snapshot is kept for profit");assert.equal(full.createdBy,"Sipho");
  assert.equal((await act("rep","saveDocument",[order("i-rep2","c-b",[{id:"l1",sku:"OCTA-X-25",description:"",qty:1,unitPrice:1,unitCost:0}])])).status,400,"not their customer");
  assert.equal((await act("rep","saveDocument",[order("i-rep3","c-a",[{id:"l1",sku:null,description:"Anything",qty:1,unitPrice:1,unitCost:0}])])).status,400,"no custom lines");
  assert.equal((await act("rep","saveDocument",[{...full,courier:0}])).status,400,"can't change a saved invoice");
  assert.equal((await act("danium","saveDocument",[order("q-1","c-b",[],{kind:"quote"})])).status,400);
});

test("each role's limits hold on the server whatever the browser sends",async()=>{
  const item=(await call("zuan",{op:"load"})).body.data.catalogue[0];
  for(const [who,action,args] of [["danium","saveCatalogueItem",[{...item,retail:1}]],["rep","saveClient",[client("c-a")]],["accounts","saveSettings",[{}]],["danium","recordPayment",["i-rep1",{date:today,amount:10,method:"eft",note:""}]],["rep","saveRepDetails",["r-other",{}]],["customer","saveClient",[client("c-x")]]]){
    const r=await act(who,action,args);
    assert.ok(r.status===400||r.status===403,`${who} ${action}`);
  }
  assert.equal((await act("zuan","notAnAction",[])).status,400);
  const pay=await act("accounts","recordPayment",["i-rep1",{date:today,amount:500,method:"eft",note:"part"}]);
  assert.equal(pay.status,200);assert.equal(pay.body.data.documents.find(d=>d.id==="i-rep1").payments.length,1);
  assert.equal(pay.body.data.catalogue.every(i=>i.cost===null),true);
});

test("someone saving at the same moment never reuses an invoice number",async()=>{
  clash=2;
  const r=await act("zuan","saveDocument",[order("i-m1","c-b",[{id:"l1",sku:"OCTA-X-25",description:"X",qty:1,unitPrice:900,unitCost:600}],{delivery:{method:"own",status:"pending"}})]);
  assert.equal(r.status,200);assert.equal(r.body.result.number,"INV-0002");
  const r2=await act("zuan","convertQuote",["nope"]);assert.equal(r2.status,200);assert.equal(r2.body.result,null);
  const numbers=(await call("zuan",{op:"load"})).body.data.documents.map(d=>d.number);
  assert.equal(new Set(numbers).size,numbers.length);
});

test("the browser's own new ids are reused, so a converted quote opens at the same address",async()=>{
  await act("zuan","saveDocument",[order("q-9","c-b",[{id:"l1",sku:"OCTA-X-25",description:"X",qty:1,unitPrice:900,unitCost:600}],{kind:"quote",delivery:undefined})]);
  const r=await act("zuan","convertQuote",["q-9"],["i-abcdef12"]);
  assert.equal(r.body.result.id,"i-abcdef12");
  assert.equal(r.body.data.documents.find(d=>d.id==="q-9").linkedId,"i-abcdef12");
});

test("supplier invoice files are stored apart and opened only by main admins and Accounts",async()=>{
  await act("accounts","saveSupplier",[{id:"s-1",name:"Supplier",contact:"",email:"",phone:"",vat:"",bankMatch:"",notes:"",createdAt:today}]);
  const r=await act("accounts","saveSupplierInvoice",[{id:"si-1",supplierId:"s-1",number:"A1",date:today,dueDate:today,description:"",category:"stock",amount:100,attachment:{name:"a.pdf",type:"application/pdf",size:3,dataUrl:"data:application/pdf;base64,QUJD"},payments:[],createdAt:today}]);
  assert.equal(r.status,200);
  const inv=r.body.data.supplierInvoices.find(x=>x.id==="si-1");
  assert.equal(inv.attachment.dataUrl,null);assert.equal(inv.attachment.stored,true);
  assert.equal((await call("accounts",{op:"file",invoiceId:"si-1"})).body.dataUrl,"data:application/pdf;base64,QUJD");
  assert.equal((await call("rep",{op:"file",invoiceId:"si-1"})).status,403);
  assert.equal((await call("danium",{op:"file",invoiceId:"si-1"})).status,403);
  await act("accounts","removeSupplierInvoice",["si-1"]);
  assert.equal((await call("zuan",{op:"file",invoiceId:"si-1"})).status,404,"the file goes with its invoice");
});

test("the shop gets public catalogue fields and only the signed-in customer's own prices",async()=>{
  const visitor=(await call(null,{op:"public"})).body;
  assert.equal(visitor.ready,true);assert.equal(visitor.client,null);assert.equal(visitor.staff,false);
  assert.equal((await call("zuan",{op:"public"})).body.staff,true);assert.equal((await call("rep",{op:"public"})).body.staff,true);assert.equal((await call("customer",{op:"public"})).body.staff,false);
  assert.ok(visitor.catalogue.every(i=>i.cost===null&&i.agent===null&&i.bulk===null&&(!i.costing||i.costing.lines.length===0)));
  const buyer=(await call("customer",{op:"public"})).body;
  assert.equal(buyer.client.id,"c-a");assert.equal(buyer.client.prices["OCTA-X-25"],999);assert.equal(buyer.client.notes,"");
  assert.equal((await call("unconfirmed",{op:"public"})).body.client,null);
});



test("products added in the back office can be deleted only while unused; out of stock reaches the shop",async()=>{
  const base=(await call("zuan",{op:"load"})).body.data.catalogue.find(i=>i.sku==="OCTA-M-25");
  const extra={...base,sku:"CUSTOM-HOODIE-L",slug:null,productName:"OCTA Hoodie",size:"Large",category:"merch",custom:true};
  await act("zuan","saveCatalogueItem",[{...extra,soldOut:true}]);
  assert.equal((await call("zuan",{op:"load"})).body.data.catalogue.find(i=>i.sku==="CUSTOM-HOODIE-L").soldOut,undefined,"the shop-only flag is never stored");
  assert.equal((await act("danium","removeCatalogueItem",["CUSTOM-HOODIE-L"])).status,400);
  assert.equal((await act("zuan","removeCatalogueItem",["OCTA-M-25"])).status,400,"website products are hidden, not deleted");
  assert.equal((await act("zuan","removeCatalogueItem",["CUSTOM-HOODIE-L"])).status,200);
  assert.ok(!(await call("zuan",{op:"load"})).body.data.catalogue.some(i=>i.sku==="CUSTOM-HOODIE-L"));
  // OCTA-X-25 is on invoices: it can't be deleted even when added by hand.
  const x=(await call("zuan",{op:"load"})).body.data.catalogue.find(i=>i.sku==="OCTA-X-25");
  await act("zuan","saveCatalogueItem",[{...x,custom:true,slug:null}]);
  assert.match((await act("zuan","removeCatalogueItem",["OCTA-X-25"])).body.error,/invoices/);
  await act("zuan","saveCatalogueItem",[{...x,stock:"out"}]);
  await act("zuan","saveCatalogueItem",[{...base,stock:"auto"}]);
  const shop=(await call(null,{op:"public"})).body.catalogue;
  assert.equal(shop.find(i=>i.sku==="OCTA-X-25").soldOut,true);
  assert.equal(shop.find(i=>i.sku==="OCTA-M-25").soldOut,true,"automatic with nothing booked in is out of stock");
  assert.equal(shop.find(i=>i.sku==="OCTA-BOOST-5").soldOut,false);
  await act("accounts","bookInStock",[{id:"sb-1",sku:"OCTA-M-25",date:today,supplierId:null,supplierInvoiceId:null,batchNumber:"B1",expiryDate:null,qty:5,unitCostEx:400,unitCostIncl:460,sellPrice:null,notes:"",createdAt:today},{updateCost:false,updatePrice:false}]);
  assert.equal((await call(null,{op:"public"})).body.catalogue.find(i=>i.sku==="OCTA-M-25").soldOut,false,"booking stock in puts it back on sale");
});



test("website EFT orders are priced from the live back office and land as unpaid website invoices",async()=>{
  const pay=loadTs("supabase/functions/_shared/payment.ts");
  const orders=[];
  const shopStore={...store,async insertOrder(row){if(!orders.some(o=>o.ref===row.ref))orders.push(row);return null;}};
  const tools={quote:pay.quoteCart,validateCustomer:pay.validateCustomer};
  const customer={name:"Buyer",email:"buyer@example.test",phone:"0821234567",company:"",vat:"",address:"1 Main Rd",city:"Benoni",postcode:"1501"};
  const place=(who,changes={})=>server.placeOrder({ref:"OCTA-ABCDEF123456",items:[{sku:"OCTA-BOOST-5",qty:2}],customer,expectedTotal:1280,termsAccepted:true,termsVersion:"2026-10-18",...changes},who?user(who):null,shopStore,today,makeId,tools);
  assert.equal((await place(null)).status,503,"closed until a main admin opens online ordering");
  const s=(await call("zuan",{op:"load"})).body.data.settings;
  await act("zuan","saveSettings",[{...s,onlineOrdering:true,deliveryRules:{minLitres:0,courierOnline:true}}]);
  assert.equal((await call(null,{op:"public"})).body.orderingOpen,true);
  assert.equal((await place(null,{expectedTotal:1})).status,409,"the browser's total must match the server's");
  assert.equal((await place(null,{termsAccepted:false})).status,400);
  assert.equal((await place(null,{items:[{sku:"OCTA-X-25",qty:1}],expectedTotal:960})).status,400,"out-of-stock products can't be ordered");
  const ok=await place(null);
  assert.equal(ok.status,200);assert.equal(ok.body.order.total,1280);assert.equal(orders.length,1);assert.equal(orders[0].payment_method,"eft");
  const again=await place(null);
  assert.equal(again.status,200);assert.equal(again.body.invoice,ok.body.invoice,"a retry doesn't create a second invoice");
  const inv=(await call("zuan",{op:"load"})).body.data.documents.find(d=>d.reference==="OCTA-ABCDEF123456");
  assert.equal(inv.channel,"website");assert.equal(inv.courier,400);assert.deepEqual(inv.payments,[]);assert.match(inv.notes,/EFT · awaiting payment/);
  assert.equal(inv.delivery.method,"own","Benoni is in the local delivery area");
  // A signed-in customer gets their agreed price.
  const own=await place("customer",{ref:"OCTA-ABCDEF654321",items:[{sku:"OCTA-M-25",qty:1}],expectedTotal:1,saveCustomer:true});
  assert.equal(own.status,409);
});

test("a confirmed online payment marks the website invoice paid once",async()=>{
  const ord=loadTs("src/lib/backoffice/orders.ts");
  const r=await server.updateBackoffice(store,"ozow-payment",(d,env)=>ord.recordWebsitePayment(d,"OCTA-ABCDEF123456",1280,"ozow","TXN-1",env),today,makeId);
  assert.equal(r.result,true);
  const r2=await server.updateBackoffice(store,"ozow-payment",(d,env)=>ord.recordWebsitePayment(d,"OCTA-ABCDEF123456",1280,"ozow","TXN-1",env),today,makeId);
  assert.equal(r2.result,false,"a repeated notification doesn't pay twice");
  const inv=(await call("zuan",{op:"load"})).body.data.documents.find(d=>d.reference==="OCTA-ABCDEF123456");
  assert.equal(inv.payments.length,1);assert.equal(inv.payments[0].amount,1280);assert.match(inv.notes,/paid online/);
});



test("each new website order emails the business and the customer once",async()=>{
  const pay=loadTs("supabase/functions/_shared/payment.ts");
  const sent=[];
  const shopStore={...store,async insertOrder(){return null;}};
  const tools={quote:pay.quoteCart,validateCustomer:pay.validateCustomer,send:async(emails)=>{sent.push(...emails);}};
  const customer={name:"Jo Buyer",email:"jo@buyer-mail.co.za",phone:"0821234567",company:"",vat:"",address:"1 Main Rd",city:"Durban",postcode:"4001"};
  const body={ref:"OCTA-0000000000E1",items:[{sku:"OCTA-BOOST-5",qty:1}],customer,expectedTotal:640,termsAccepted:true,termsVersion:"2026-10-18"};
  assert.equal((await server.placeOrder(body,null,shopStore,today,makeId,tools)).status,200);
  assert.equal(sent.length,2);
  const [business,toCustomer]=sent;
  assert.deepEqual(business.to,["info@octa-boost.com","zuan@octa-boost.com"],"default: info@ and zuan@");
  assert.match(business.subject,/New website order OCTA-0000000000E1 · R640\.00 · EFT, awaiting payment/);
  assert.match(business.text,/Jo Buyer/);assert.match(business.text,/0821234567/);assert.match(business.text,/INV-/);assert.equal(business.replyTo,"jo@buyer-mail.co.za");
  assert.deepEqual(toCustomer.to,["jo@buyer-mail.co.za"]);assert.match(toCustomer.text,/Reference: OCTA-0000000000E1/);assert.match(toCustomer.text,/Account number:/);
  assert.ok(!/cost|margin/i.test(business.text+toCustomer.text),"no costs in emails");
  await server.placeOrder(body,null,shopStore,today,makeId,tools);
  assert.equal(sent.length,2,"a retried order sends nothing again");
  // Recipients follow Settings; test addresses never get mail.
  const s=(await call("zuan",{op:"load"})).body.data.settings;
  await act("zuan","saveSettings",[{...s,orderEmails:"zuan@octa-boost.com; orders@example.test, BAD"}]);
  await server.placeOrder({...body,ref:"OCTA-0000000000E2",customer:{...customer,email:"guest@example.test"}},null,shopStore,today,makeId,tools);
  assert.equal(sent.length,3,"a test customer address gets no confirmation");
  assert.deepEqual(sent[2].to,["zuan@octa-boost.com"]);
  const html=sent[2].html;assert.ok(!html.includes("<script"));
});



test("main admins create staff logins on the website; nobody else can",async()=>{
  const logins=new Map();
  const staffStore={...store,
    async listStaff(){return (await db.query("select user_id,display_name,role,active from public.bo_staff order by display_name")).rows.map(r=>({...r,email:logins.get(r.user_id)??null}));},
    async saveStaff(id,name,role,active){await db.query("insert into public.bo_staff values($1,$2,$3,$4) on conflict(user_id) do update set display_name=excluded.display_name,role=excluded.role,active=excluded.active",[id,name,role,active]);},
    async ensureLogin(email,password){
      const existing=[...logins].find(([,e])=>e===email);
      if(existing)return{id:existing[0]};
      const id=crypto.randomUUID();await db.query("insert into auth.users values($1,$2,now())",[id,email]);logins.set(id,email);return{id};
    }};
  const as=(who,body)=>server.handle(body,user(who),staffStore,today,makeId);
  assert.equal((await as("danium",{op:"staff"})).status,403);
  assert.equal((await as("accounts",{op:"createLogin",email:"x@octa-boost.com",name:"X",role:"main",password:"long-enough-pw"})).status,403);
  assert.equal((await as("zuan",{op:"createLogin",email:"new@octa-boost.com",name:"New",role:"main",password:"short"})).status,400);
  assert.equal((await as("zuan",{op:"createLogin",email:"rep2@example.test",name:"Rep",role:"rep",password:"long-enough-pw"})).status,400,"reps need a rep record first");
  const made=await as("zuan",{op:"createLogin",email:"New.Person@octa-boost.com",name:"New Person",role:"viewer",password:"long-enough-pw"});
  assert.equal(made.status,200);
  const row=made.body.staff.find(s=>s.email==="new.person@octa-boost.com");
  assert.equal(row.role,"viewer");assert.equal(row.active,true);
  assert.equal((await as("zuan",{op:"setStaffActive",userId:people.zuan.id,active:false})).status,400,"main admins can't be switched off");
  const boss=(await as("zuan",{op:"createLogin",email:"boss2@octa-boost.com",name:"Boss Two",role:"main",password:"long-enough-pw"})).body.staff.find(s=>s.email==="boss2@octa-boost.com");
  assert.equal((await as("zuan",{op:"setStaffActive",userId:boss.user_id,active:false})).status,400,"not even by another main admin");
  assert.equal((await as("zuan",{op:"createLogin",email:"boss2@octa-boost.com",name:"Boss Two",role:"viewer",password:"long-enough-pw"})).status,400,"a main admin can't be demoted");
  const off=await as("zuan",{op:"setStaffActive",userId:row.user_id,active:false});
  assert.equal(off.body.staff.find(s=>s.user_id===row.user_id).active,false);
});



test("customers collect for free or add delivery; the server holds them to the delivery rules",async()=>{
  const pay=loadTs("supabase/functions/_shared/payment.ts");
  const shopStore={...store,async insertOrder(){return null;}};
  const tools={quote:pay.quoteCart,validateCustomer:pay.validateCustomer};
  const s=(await call("zuan",{op:"load"})).body.data.settings;
  const rules={localTowns:["boksburg","benoni","brakpan"],localKm:25,localFee:150,minLitres:125,courierOnline:false,collection:{enabled:true,address:"12 Test Street, Boksburg",hours:"Mon-Fri 8-5"}};
  await act("zuan","saveSettings",[{...s,deliveryRules:rules}]);
  const shop=(await call(null,{op:"public"})).body;
  assert.equal(shop.delivery.minLitres,125);assert.equal(shop.delivery.courierOnline,false);assert.equal(shop.delivery.collection.address,undefined,"the collection address is never public");
  const customer=(city)=>({name:"Buyer",email:"b@buyer-mail.co.za",phone:"0821234567",company:"",vat:"",address:"1 Rd",city,postcode:"0000"});
  const place=(ref,qty,city,method,expectedTotal)=>server.placeOrder({ref,items:[{sku:"OCTA-BOOST-5",qty}],customer:customer(city),expectedTotal,termsAccepted:true,termsVersion:"2026-10-18",deliveryMethod:method},null,shopStore,today,makeId,tools);
  const collect=await place("OCTA-00000000D001",1,"Durban","collect",440);
  assert.equal(collect.status,200);assert.equal(collect.body.order.courier,0);assert.equal(collect.body.order.collection.address,"12 Test Street, Boksburg");
  assert.equal((await place("OCTA-00000000D002",1,"Durban","courier",640)).status,400,"courier is on request until switched on");
  assert.equal((await place("OCTA-00000000D006",3,"Germiston","local",1470)).status,400,"15 L is under the 125 L for local delivery");
  const local=await place("OCTA-00000000D004",25,"Germiston","local",11150);
  assert.equal(local.status,200,"125 L to Germiston (within 25 km): 25 x R440 + local delivery R150");
  assert.equal((await place("OCTA-00000000D005",25,"Germiston","courier",11000)).status,400,"inside the local area it is local delivery, not courier");
  await act("zuan","saveSettings",[{...s,deliveryRules:{...rules,courierOnline:true}}]);
  const courier=await place("OCTA-00000000D003",3,"Durban","courier",1920);
  assert.equal(courier.status,200,"courier switched on: 3 x R440 + 3 x R200");
  const docs=(await call("zuan",{op:"load"})).body.data.documents;
  assert.equal(docs.find(x=>x.reference==="OCTA-00000000D001").delivery.method,"collect");
  assert.equal(docs.find(x=>x.reference==="OCTA-00000000D004").delivery.method,"own");
  assert.equal(docs.find(x=>x.reference==="OCTA-00000000D003").courier,600);
});

after(()=>db.close());
