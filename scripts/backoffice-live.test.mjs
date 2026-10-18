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

after(()=>db.close());
