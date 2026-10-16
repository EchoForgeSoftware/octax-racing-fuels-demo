import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { after, test } from "node:test";
import { PGlite } from "@electric-sql/pglite";

// An isolated, in-memory PostgreSQL instance. No real accounts, orders or keys.
const db = new PGlite();
await db.exec(`
  create role anon; create role authenticated; create role service_role bypassrls;
  create schema auth;
  create table auth.users (id uuid primary key, raw_user_meta_data jsonb);
  create function auth.uid() returns uuid language sql stable as
    $$ select nullif(current_setting('request.jwt.claim.sub', true), '')::uuid $$;
  grant usage on schema public, auth to anon, authenticated, service_role;
`);
const schema = readFileSync(new URL("../supabase/schema.sql", import.meta.url), "utf8");
const payments = readFileSync(new URL("../supabase/ozow.sql", import.meta.url), "utf8");
await db.exec(schema);
await db.exec(payments);
const customerId = "11111111-1111-4111-8111-111111111111";
await db.query("insert into auth.users(id,raw_user_meta_data) values($1,'{}')", [customerId]);

const order = { ref: "OCTA-123456ABCDEF", user_id: customerId, customer: { name: "Test Customer" }, items: [{ sku: "test", qty: 1 }], subtotal: 760, courier: 200, total: 960, terms_version: "2026-10-16" };
const request = { siteCode: "TEST-SITE-001", amount: { currency: "ZAR", value: 960 }, merchantReference: order.ref, expireAt: "2030-01-01T00:00:00Z" };
async function reserve(input = order, hash = "capability-hash", fingerprint = "request-hash") {
  return (await db.query("select public.reserve_ozow_order($1,$2,$3,$4,$5) as payment", [input, { ...request, merchantReference: input.ref }, hash, fingerprint, "production"])).rows[0].payment;
}
async function asRole(role, action) {
  await db.exec(`set role ${role}`);
  try { return await action(); } finally { await db.exec("reset role"); }
}

test("payment migrations apply and safely rerun", async () => {
  await db.exec(payments);
  assert.equal((await db.query("select count(*)::int as count from public.ozow_payments")).rows[0].count, 0);
});

test("service role reserves once and retries recover the original request", async () => {
  const first = await asRole("service_role", () => reserve());
  const second = await asRole("service_role", () => reserve());
  assert.deepEqual(second, first);
  assert.equal(first.order.total, 960);
  assert.equal((await db.query("select count(*)::int as count from public.orders")).rows[0].count, 1);
  await assert.rejects(() => asRole("service_role", () => reserve(order, "different-token")), /conflict/i);
  await assert.rejects(() => asRole("service_role", () => reserve(order, "capability-hash", "different-cart")), /conflict/i);
});

test("guests cannot read payment tokens or forge an Ozow order", async () => {
  await assert.rejects(() => asRole("anon", () => db.query("select * from public.ozow_payments")), /permission denied/i);
  await assert.rejects(() => asRole("anon", () => db.query("select public.reserve_ozow_order($1,$2,'fake','fake','production')", [order, request])), /permission denied/i);
  await assert.rejects(() => asRole("anon", () => db.query(`insert into public.orders(ref,customer,items,subtotal,courier,total,payment_method,terms_version)
    values('OCTA-AAAAAAAAAAAA','{}','[]',1,0,1,'ozow','2026-10-16')`)), /row-level security/i);
});

test("customer access policies expose only the account's own orders", async () => {
  await db.query("select set_config('request.jwt.claim.sub',$1,false)", [customerId]);
  assert.equal((await asRole("authenticated", () => db.query("select ref from public.orders"))).rows.length, 1);
  await db.query("select set_config('request.jwt.claim.sub',$1,false)", ["22222222-2222-4222-8222-222222222222"]);
  assert.equal((await asRole("authenticated", () => db.query("select ref from public.orders"))).rows.length, 0);
  await db.query("select set_config('request.jwt.claim.sub','',false)");
});

test("browser roles cannot change status or invoke the verified-payment routine", async () => {
  for (const role of ["anon", "authenticated"]) {
    await assert.rejects(() => asRole(role, () => db.query("update public.orders set status='paid'")), /permission denied/i);
    await assert.rejects(() => asRole(role, () => db.query("select public.record_ozow_result($1,$2,'paid')", [order.ref, "33333333-3333-4333-8333-333333333333"])), /permission denied/i);
  }
});

test("duplicate and out-of-order notifications cannot undo a paid order", async () => {
  const transaction = "33333333-3333-4333-8333-333333333333";
  for (const status of ["pending", "paid", "paid", "failed", "pending"]) {
    await asRole("service_role", () => db.query("select public.record_ozow_result($1,$2,$3)", [order.ref, transaction, status]));
  }
  assert.equal((await db.query("select status from public.orders where ref=$1", [order.ref])).rows[0].status, "paid");
  assert.equal((await db.query("select status from public.ozow_payments where ref=$1", [order.ref])).rows[0].status, "paid");
  await db.query("update public.orders set status='dispatched' where ref=$1", [order.ref]);
  await asRole("service_role", () => db.query("select public.record_ozow_result($1,$2,'paid')", [order.ref, transaction]));
  assert.equal((await db.query("select status from public.orders where ref=$1", [order.ref])).rows[0].status, "dispatched");
});

test("a transaction id cannot pay two different orders", async () => {
  const other = { ...order, ref: "OCTA-AAAAAAAAAAAA", user_id: null };
  await asRole("service_role", () => reserve(other, "other-token", "other-request"));
  await assert.rejects(() => asRole("service_role", () => db.query("select public.record_ozow_result($1,$2,'paid')", [other.ref, "33333333-3333-4333-8333-333333333333"])), /unique constraint/i);
  assert.equal((await db.query("select status from public.orders where ref=$1", [other.ref])).rows[0].status, "awaiting_payment");
});

test("database rate limits increment atomically and reject excess requests", async () => {
  const values = [];
  for (let i = 0; i < 3; i++) values.push((await asRole("service_role", () => db.query("select public.ozow_take_rate_limit('test-bucket',2) as allowed"))).rows[0].allowed);
  assert.deepEqual(values, [true, true, false]);
});

after(async () => { await db.close(); });

test("new orders require current terms and the server stamps acceptance time", async () => {
  await assert.rejects(() => asRole("anon", () => db.query(`insert into public.orders(ref,customer,items,subtotal,courier,total)
    values('OCTA-BBBBBBBBBBBB','{}','[]',1,0,1)`)), /terms acknowledgement/i);
  await asRole("anon", () => db.query(`insert into public.orders(ref,customer,items,subtotal,courier,total,terms_version,terms_accepted_at)
    values('OCTA-BBBBBBBBBBBB','{}','[]',1,0,1,'2026-10-16','2099-01-01')`));
  const record = (await db.query("select terms_version,terms_accepted_at from public.orders where ref='OCTA-BBBBBBBBBBBB'")).rows[0];
  assert.equal(record.terms_version, "2026-10-16");
  assert.notEqual(new Date(record.terms_accepted_at).getUTCFullYear(), 2099);
});

test("customer payment confirmation cannot be forged in a browser insert",async()=>{
  await asRole("anon",()=>db.query(`insert into public.orders(ref,customer,items,subtotal,courier,total,terms_version,payment_confirmed_at,payment_confirmed_amount,payment_reference)
    values('OCTA-CCCCCCCCCCCC','{}','[]',1,0,1,'2026-10-16',now(),999,'forged')`));
  const row=(await db.query("select payment_confirmed_at,payment_confirmed_amount,payment_reference from orders where ref='OCTA-CCCCCCCCCCCC'")).rows[0];
  assert.equal(row.payment_confirmed_at,null);assert.equal(row.payment_confirmed_amount,null);assert.equal(row.payment_reference,null);
});

test("confirmed EFT records retain their original amount and time through dispatch",async()=>{
  await db.query(`insert into public.orders(ref,user_id,customer,items,subtotal,courier,total,terms_version) values('OCTA-DDDDDDDDDDDD',$1,'{}','[]',100,20,120,'2026-10-16')`,[customerId]);
  await db.query("update orders set status='paid' where ref='OCTA-DDDDDDDDDDDD'");
  const first=(await db.query("select payment_confirmed_at,payment_confirmed_amount,payment_reference from orders where ref='OCTA-DDDDDDDDDDDD'")).rows[0];
  assert.ok(first.payment_confirmed_at);assert.equal(Number(first.payment_confirmed_amount),120);assert.equal(first.payment_reference,"OCTA-DDDDDDDDDDDD");
  await db.query("update orders set status='dispatched',total=130,payment_confirmed_amount=999,payment_confirmed_at='2099-01-01' where ref='OCTA-DDDDDDDDDDDD'");
  assert.deepEqual((await db.query("select payment_confirmed_at,payment_confirmed_amount,payment_reference from orders where ref='OCTA-DDDDDDDDDDDD'")).rows[0],first);
  await db.query("insert into orders(ref,customer,items,subtotal,courier,total,terms_version) values('OCTA-000000000000','{}','[]',0,0,0,'2026-10-16')");
  await assert.rejects(()=>db.query("update orders set status='paid' where ref='OCTA-000000000000'"),/positive order total/i);
});

test("verified Ozow success records payment even after cancellation without changing fulfilment status",async()=>{
  const late={...order,ref:"OCTA-EEEEEEEEEEEE"};await asRole("service_role",()=>reserve(late,"late-token","late-request"));
  await db.query("update orders set status='cancelled' where ref=$1",[late.ref]);
  const transaction="55555555-5555-4555-8555-555555555555";
  await asRole("service_role",()=>db.query("select record_ozow_result($1,$2,'paid')",[late.ref,transaction]));
  const row=(await db.query("select status,payment_confirmed_at,payment_confirmed_amount,payment_reference from orders where ref=$1",[late.ref])).rows[0];
  assert.equal(row.status,"cancelled");assert.ok(row.payment_confirmed_at);assert.equal(Number(row.payment_confirmed_amount),960);assert.equal(row.payment_reference,transaction);
});

test("payment confirmations are visible only to the owning customer and never backfilled for historical paid orders",async()=>{
  for(const [id,expected] of [[customerId,1],["22222222-2222-4222-8222-222222222222",0]]){
    await db.query("select set_config('request.jwt.claim.sub',$1,false)",[id]);
    assert.equal((await asRole("authenticated",()=>db.query("select payment_confirmed_amount from orders where ref='OCTA-DDDDDDDDDDDD'"))).rows.length,expected);
  }
  assert.equal((await asRole("anon",()=>db.query("select payment_confirmed_amount from orders"))).rows.length,0);
  await db.query("insert into orders(ref,customer,items,subtotal,courier,total,status,terms_version) values('OCTA-FFFFFFFFFFFF','{}','[]',10,0,10,'paid','2026-10-16')");
  await db.exec(schema);await db.exec(payments);
  assert.equal((await db.query("select payment_confirmed_at from orders where ref='OCTA-FFFFFFFFFFFF'")).rows[0].payment_confirmed_at,null);
});
