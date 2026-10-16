import {test,after} from "node:test";
import assert from "node:assert/strict";
import {readFileSync} from "node:fs";
import {PGlite} from "@electric-sql/pglite";
const db=new PGlite();
await db.exec(`create role anon;create role authenticated;create role service_role bypassrls;create schema auth;create table auth.users(id uuid primary key);create function auth.uid() returns uuid language sql stable as $$select nullif(current_setting('request.jwt.claim.sub',true),'')::uuid$$;grant usage on schema public,auth to anon,authenticated,service_role;`);
const sql=readFileSync(new URL("../supabase/backoffice.sql",import.meta.url),"utf8");
await db.exec(sql);await db.exec(sql);
const user={main:"11111111-1111-4111-8111-111111111111",rep:"22222222-2222-4222-8222-222222222222",customer:"33333333-3333-4333-8333-333333333333",other:"44444444-4444-4444-8444-444444444444",accounts:"55555555-5555-4555-8555-555555555555"};
for(const id of Object.values(user)) await db.query("insert into auth.users values($1)",[id]);
for(const [name,role] of [["main","main"],["rep","rep"],["accounts","accounts"]])await db.query("insert into bo_staff values($1,$2,$3,true)",[user[name],name,role]);
const c1=(await db.query("insert into bo_clients(auth_user_id,rep_user_id,name,kind,tier) values($1,$2,'Assigned','agent','agent') returning id",[user.customer,user.rep])).rows[0].id;
const c2=(await db.query("insert into bo_clients(name,kind) values('Other','private') returning id")).rows[0].id;
await db.exec("insert into bo_catalogue values('SAMPLE','{}',100,true);insert into bo_private_costs values('SAMPLE',50);insert into bo_tier_prices values('agent','SAMPLE',90)");
await db.query("insert into bo_client_prices values($1,'SAMPLE',80)",[c1]);
for(const [i,client] of [[1,c1],[2,c2]])await db.query("insert into bo_documents(request_id,client_id,kind,number,document_date,due_date,channel,lines,total) values(gen_random_uuid(),$1,'invoice',$2,'2026-10-16','2026-10-23','private','[{\"qty\":1,\"unitPrice\":100}]',100)",[client,`INV-${i}`]);
async function as(name,fn){await db.query("select set_config('request.jwt.claim.sub',$1,false)",[user[name]||""]);await db.exec("set role authenticated");try{return await fn();}finally{await db.exec("reset role");}}
test("back-office RLS isolates reps and customers while main admins see all records",async()=>{
  for(const name of ["rep","customer"]){const rows=await as(name,()=>db.query("select name from bo_clients"));assert.deepEqual(rows.rows,[{name:"Assigned"}]);assert.equal((await as(name,()=>db.query("select * from bo_documents"))).rows.length,1);}
  assert.equal((await as("other",()=>db.query("select * from bo_documents"))).rows.length,0);
  assert.equal((await as("main",()=>db.query("select * from bo_documents"))).rows.length,2);
});
test("costs stay private and own-price lookup uses verified UUID ownership",async()=>{
  for(const name of ["rep","customer","accounts","other"])assert.equal((await as(name,()=>db.query("select * from bo_private_costs"))).rows.length,0);
  assert.equal((await as("main",()=>db.query("select * from bo_private_costs"))).rows.length,1);
  assert.equal(Number((await as("customer",()=>db.query("select bo_my_price('SAMPLE') as price"))).rows[0].price),80);
  assert.equal(Number((await as("other",()=>db.query("select bo_my_price('SAMPLE') as price"))).rows[0].price),100);
});
test("browser users cannot escalate roles, issue documents or record payments",async()=>{
  for(const name of ["customer","rep","accounts","main"]){
    await assert.rejects(()=>as(name,()=>db.query("update bo_staff set role='main'")),/permission denied/);
    await assert.rejects(()=>as(name,()=>db.query("delete from bo_documents")),/permission denied/);
    await assert.rejects(()=>as(name,()=>db.query("select nextval('bo_invoice_number')")),/permission denied/);
  }
  await db.exec("set role anon");try{await assert.rejects(()=>db.query("select * from bo_clients"),/permission denied/);}finally{await db.exec("reset role");}
});
test("document payloads cannot accidentally expose private cost snapshots",async()=>{
 await assert.rejects(()=>db.query("update bo_documents set lines='[{\"unitCost\":50}]'"),/check constraint/);
});
after(()=>db.close());

test("stock costs and counts stay with main admins and Accounts; deliveries follow document access",async()=>{
  const batch=(await db.query("insert into bo_stock_batches(sku,booked_in,qty,batch_number,expiry_date) values('SAMPLE','2026-10-01',10,'B1','2027-10-01') returning id")).rows[0].id;
  await db.query("insert into bo_stock_costs values($1,100,115,150)",[batch]);
  await db.exec("insert into bo_stock_counts(sku,count_date,expected,counted) values('SAMPLE','2026-10-10',10,8)");
  const docs=(await db.query("select id,client_id from bo_documents order by number")).rows;
  for(const d of docs)await db.query("insert into bo_deliveries(document_id,method) values($1,'own')",[d.id]);
  for(const name of ["rep","accounts","main"])assert.equal((await as(name,()=>db.query("select * from bo_stock_batches"))).rows.length,1);
  for(const name of ["rep","customer","other"]){
    assert.equal((await as(name,()=>db.query("select * from bo_stock_costs"))).rows.length,0);
    assert.equal((await as(name,()=>db.query("select * from bo_stock_counts"))).rows.length,0);
  }
  for(const name of ["accounts","main"])assert.equal((await as(name,()=>db.query("select * from bo_stock_costs"))).rows.length,1);
  assert.equal((await as("rep",()=>db.query("select * from bo_deliveries"))).rows.length,1);
  assert.equal((await as("main",()=>db.query("select * from bo_deliveries"))).rows.length,2);
  await assert.rejects(()=>as("main",()=>db.query("update bo_deliveries set status='delivered'")));
  await assert.rejects(()=>db.query("update bo_deliveries set status='delivered' where document_id=$1",[docs[0].id]),/check/i);
});

test("authorised buyers sign in to the company account; rep bank details and referrals stay private",async()=>{
  const buyer=user.other;
  await db.query("insert into bo_client_users(client_id,user_id,full_name) values($1,$2,'Second buyer')",[c1,buyer]);
  const docs=(await as("other",()=>db.query("select number from bo_documents"))).rows;
  assert.deepEqual(docs.map(d=>d.number),["INV-1"]);
  assert.equal(Number((await as("other",()=>db.query("select bo_my_price('SAMPLE') as price"))).rows[0].price),80);
  await db.query("insert into bo_rep_details(user_id,id_number,bank) values($1,'9001015009087','{\"account\":\"62000000000\"}')",[user.rep]);
  await db.query("insert into bo_referrals(rep_user_id,client_id,percent,agreement_date,signatory_name,signatory_capacity) values($1,$2,5,'2026-10-01','Zuan','Manager')",[user.rep,c1]);
  for(const [name,rows] of [["rep",1],["main",1],["accounts",1],["customer",0],["other",0]]){
    assert.equal((await as(name,()=>db.query("select * from bo_rep_details"))).rows.length,rows,`${name} rep details`);
    assert.equal((await as(name,()=>db.query("select * from bo_referrals"))).rows.length,rows,`${name} referrals`);
  }
  await assert.rejects(()=>db.query("insert into bo_referrals(rep_user_id,client_id,percent,agreement_date,signatory_name,signatory_capacity) values($1,$2,5,'2026-10-01','Zuan','Owner')",[user.rep,c1]),/check/i);
  await assert.rejects(()=>as("rep",()=>db.query("update bo_rep_details set id_number='x'")));
  void buyer;
});
