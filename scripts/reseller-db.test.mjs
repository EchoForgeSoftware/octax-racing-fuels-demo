import assert from "node:assert/strict";
import {readFileSync} from "node:fs";
import {after,test} from "node:test";
import {PGlite} from "@electric-sql/pglite";
const db=new PGlite();
await db.exec("create role anon;create role authenticated;create role service_role bypassrls;create schema auth;create table auth.users(id uuid primary key,raw_user_meta_data jsonb);create function auth.uid() returns uuid language sql as $$select null::uuid$$;grant usage on schema public,auth to anon,authenticated,service_role;");
await db.exec(readFileSync(new URL("../supabase/schema.sql",import.meta.url),"utf8"));
const migration=readFileSync(new URL("../supabase/resellers.sql",import.meta.url),"utf8");await db.exec(migration);await db.exec(migration);
async function role(name,fn){await db.exec(`set role ${name}`);try{return await fn();}finally{await db.exec("reset role");}}
const args=["OCTA-R-TEST", "private-hash","request-hash",{business:"Test Workshop"},"2026-10-16"];
const reserve=(values=args)=>role("service_role",()=>db.query("select reserve_reseller_application($1,$2,$3,$4,$5) as application",values));
test("private reseller migration reruns safely and retries retain one immutable application",async()=>{const first=(await reserve()).rows[0].application;const second=(await reserve()).rows[0].application;assert.deepEqual(second,first);assert.equal(first.status,"new");assert.ok(first.privacy_acknowledged_at);assert.equal((await db.query("select count(*)::int as n from reseller_applications")).rows[0].n,1);await assert.rejects(()=>reserve([args[0],"wrong-token",...args.slice(2)]),/conflict/i);});
test("browser roles cannot read, create, approve or reserve reseller applications",async()=>{for(const name of ["anon","authenticated"]){for(const sql of ["select * from reseller_applications","update reseller_applications set status='approved'","insert into reseller_applications(ref,capability_hash,request_hash,details,privacy_version) values('forged','a','b','{}','2026-10-16')","select reserve_reseller_application('forged','a','b','{}','2026-10-16')"]){await assert.rejects(()=>role(name,()=>db.query(sql)),/permission denied/i);}}});
test("reseller application rate limits are atomic and privacy version is enforced",async()=>{const hits=[];for(let i=0;i<3;i++)hits.push((await role("service_role",()=>db.query("select reseller_take_rate_limit('test-bucket',2,60) as ok"))).rows[0].ok);assert.deepEqual(hits,[true,true,false]);await assert.rejects(()=>reserve(["new-ref",...args.slice(1,4),"old-version"]),/privacy/i);});
after(()=>db.close());
