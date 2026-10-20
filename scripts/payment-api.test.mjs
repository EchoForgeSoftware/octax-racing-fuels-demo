import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { createHmac } from "node:crypto";
import { test } from "node:test";
import { runInNewContext } from "node:vm";
import ts from "typescript";

const catalogue = JSON.parse(readFileSync(new URL("../supabase/functions/_shared/catalogue.json", import.meta.url), "utf8"));
function compile(file, dependencies = {}, extra = {}) {
  const output = ts.transpileModule(readFileSync(new URL(`../supabase/functions/${file}`, import.meta.url), "utf8"), {
    compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022, esModuleInterop: true },
  }).outputText;
  const exports = {};
  runInNewContext(output, { exports, require: (name) => {
    if (!(name in dependencies)) throw new Error(`Unexpected test dependency ${name}`);
    return dependencies[name];
  }, crypto: globalThis.crypto, TextEncoder, Uint8Array, URL, atob, Headers, Request, Response, console: { error() {}, warn() {} }, ...extra }, { filename: file });
  return exports;
}
const core = compile("_shared/payment.ts");
const ref = "OCTA-ABCDEF123456";
const token = "a".repeat(64);
const customer = { name: "Test Customer", email: "customer@example.test", phone: "0123456789", company: "", address: "Test address", city: "Test city", postcode: "0000" };
const product = catalogue.items.find((p) => p.size === "25L" && p.price !== null);
const total = product.price + 200;
const signingKey = Buffer.alloc(32, 42);
const secret = `whsec_${signingKey.toString("base64")}`;

function fixture(enabled = true) {
  const state = { payment: null, creates: [], outcomes: [], failNext: false, providerPayments: new Map(), live: null, recorded: [], paid: [] };
  const config = { environment: "production", siteCode: "TEST-SITE-001", siteUrl: "https://store.example.test/base", origins: ["https://store.example.test"] };
  const db = {
    auth: { getUser: async (value) => value === "valid-session" ? { data: { user: { id: "customer-1" } }, error: null } : { data: { user: null }, error: { message: "invalid" } } },
    rpc: async (name, args) => {
      if (name === "ozow_take_rate_limit") return { data: true, error: null };
      if (name === "record_ozow_result") { state.outcomes.push(args); return { data: null, error: null }; }
      assert.equal(name, "reserve_ozow_order");
      if (!state.payment) state.payment = { ref: args.p_order.ref, checkout_hash: args.p_checkout_hash, request_hash: args.p_request_hash,
        request_payload: args.p_request, environment: args.p_environment, status: "pending", redirect_url: null,
        order: { ...args.p_order, created_at: "2026-10-16T10:00:00Z" } };
      if (state.payment.checkout_hash !== args.p_checkout_hash || state.payment.request_hash !== args.p_request_hash) return { error: { message: "conflict" } };
      return { data: state.payment, error: null };
    },
    from: (table) => {
      assert.equal(table, "ozow_payments");
      const filters = new Map();
      const builder = {
        select() { return builder; },
        eq(name, value) { filters.set(name, value); return builder; },
        async maybeSingle() {
          const matches = state.payment && [...filters].every(([name, value]) => state.payment[name] === value);
          return { data: matches ? state.payment : null, error: null };
        },
        update(values) { return { eq: async () => { Object.assign(state.payment, values); return { error: null }; } }; },
      };
      return builder;
    },
  };
  const runtime = { settings: () => config, database: () => db, required: () => secret,
    requestOzow: async (_config, path, body, key) => {
      state.creates.push({ path, body, key });
      if (!state.providerPayments.has(key)) state.providerPayments.set(key, { id: "12345678-1234-4234-8234-123456789abc", redirectUrl: "https://pay.ozow.com/test/secure" });
      if (state.failNext) { state.failNext = false; throw new Error("response lost"); }
      return state.providerPayments.get(key);
    },
  };
  let checkout, webhook;
  const live = { liveShop: async () => state.live ?? null, recordOrder: async (_db, order) => { state.recorded.push(order); },
    recordPayment: async (_db, ...args) => { state.paid.push(args); } };
  const dependencies = { "../_shared/payment.ts": core, "../_shared/runtime.ts": runtime, "../_shared/catalogue.json": catalogue, "../_shared/live.ts": live,
    "../_shared/bot.ts": { verifyBot: async (value) => { if (value !== "test-captcha") throw new core.CheckoutError("Security check required."); } } };
  compile("ozow-checkout/index.ts", dependencies, { Deno: { serve: (handler) => { checkout = handler; }, env: { get: (name) => name === "OZOW_ENABLED" ? String(enabled) : "legacy-anon-key" } } });
  compile("ozow-webhook/index.ts", dependencies, { Deno: { serve: (handler) => { webhook = handler; } } });
  const call = (changes = {}, headers = {}) => checkout(new Request("https://functions.example.test/ozow-checkout", {
    method: "POST", headers: { origin: config.origins[0], "content-type": "application/json", ...headers },
    body: JSON.stringify({ action: "create", ref, checkoutToken: token, items: [{ sku: product.sku, qty: 1 }], customer, expectedTotal: total,
      termsAccepted: true, termsVersion: catalogue.termsVersion, captchaToken: "test-captcha", ...changes }),
  }));
  const event = (changes = {}) => ({ type: "transaction.complete", data: { SiteCode: config.siteCode, TransactionId: "12345678-1234-4234-8234-123456789abc",
    TransactionReference: ref, Amount: total.toFixed(2), Status: "Successful", CurrencyCode: "ZAR", IsTest: "False", ...changes } });
  const notify = (value, valid = true) => {
    const body = JSON.stringify(value);
    const timestamp = String(Math.floor(Date.now() / 1000));
    const signature = createHmac("sha256", signingKey).update(`message-1.${timestamp}.${body}`).digest("base64");
    return webhook(new Request("https://functions.example.test/ozow-webhook", { method: "POST", body,
      headers: { "svix-id": "message-1", "svix-timestamp": timestamp, "svix-signature": valid ? `v1,${signature}` : "v1,invalid" } }));
  };
  return { state, call, event, notify };
}

test("guest checkout sends server totals and configured return URL to Ozow", async () => {
  const f = fixture();
  const response = await f.call({ returnUrl: "https://attacker.example.test/", amount: 0.01 });
  assert.equal(response.status, 200);
  const result = await response.json();
  assert.equal(result.order.total, total);
  assert.equal(result.redirectUrl, "https://pay.ozow.com/test/secure");
  assert.equal(f.state.payment.order.user_id, null);
  assert.equal(f.state.creates[0].body.returnUrl, "https://store.example.test/base/checkout/ozow/");
  assert.equal(f.state.creates[0].body.amount.value, total);
  assert.equal(f.state.creates[0].body.beneficiaryReference, "OCTAABCDEF123456");
  assert.equal(f.state.creates[0].key, ref);
  assert.equal(result.checkout_hash, undefined);
});

test("checkout rejects changed totals, untrusted origins and invalid customer JWTs", async () => {
  const f = fixture();
  assert.equal((await f.call({ expectedTotal: 0.01 })).status, 409);
  assert.equal((await f.call({}, { origin: "https://attacker.example.test" })).status, 403);
  assert.equal((await f.call({}, { authorization: "Bearer invalid-session" })).status, 401);
  assert.equal(f.state.creates.length, 0);
});

test("signed-in checkout derives ownership from the verified session", async () => {
  const f = fixture();
  assert.equal((await f.call({ user_id: "attacker-controlled-id" }, { authorization: "Bearer valid-session" })).status, 200);
  assert.equal(f.state.payment.order.user_id, "customer-1");
});

test("lost provider response retries the same immutable request and idempotency key", async () => {
  const f = fixture(); f.state.failNext = true;
  assert.equal((await f.call()).status, 503);
  assert.equal((await f.call()).status, 200);
  assert.equal(f.state.creates.length, 2);
  assert.equal(f.state.creates[0].body, f.state.creates[1].body);
  assert.equal(f.state.creates[0].key, f.state.creates[1].key);
  assert.equal(f.state.providerPayments.size, 1);
});

test("status requires the correct order capability and reveals no customer fields", async () => {
  const f = fixture(); await f.call();
  assert.equal((await f.call({ action: "status", checkoutToken: "b".repeat(64) })).status, 404);
  const response = await f.call({ action: "status", status: "paid" });
  assert.deepEqual(await response.json(), { status: "pending", testMode: false });
});

test("disabled payments block new checkouts while retaining status access", async () => {
  const f = fixture(false);
  assert.equal((await f.call()).status, 503);
  assert.equal((await f.call({ action: "status" })).status, 404);
  assert.equal(f.state.creates.length, 0);
});

test("webhook rejects forged signatures and amount/test-environment mismatches", async () => {
  const f = fixture(); await f.call();
  assert.equal((await f.notify(f.event(), false)).status, 401);
  assert.equal((await f.notify(f.event({ Amount: "0.01" }))).status, 400);
  assert.equal((await f.notify(f.event({ IsTest: "True" }))).status, 400);
  assert.equal(f.state.outcomes.length, 0);
});

test("verified full notification is applied before acknowledgement", async () => {
  const f = fixture(); await f.call();
  assert.equal((await f.notify(f.event())).status, 200);
  assert.equal(f.state.outcomes.length, 1);
  assert.equal(f.state.outcomes[0].p_ref, ref);
  assert.equal(f.state.outcomes[0].p_status, "paid");
});

test("Ozow rejects absent/old terms acknowledgement and missing bot proof", async () => {
  const f = fixture();
  assert.equal((await f.call({ termsAccepted: false })).status, 400);
  assert.equal((await f.call({ termsVersion: "old-terms" })).status, 400);
  assert.equal((await f.call({ captchaToken: "" })).status, 400);
  assert.equal(f.state.creates.length, 0);
});

test("Ozow checkout prices from the live back office, respects closed ordering and records the invoice", async () => {
  const f = fixture();
  f.state.live = { open: false, catalogue };
  assert.equal((await f.call()).status, 503, "closed online ordering blocks new payments");
  const changed = { ...catalogue, items: catalogue.items.map((p) => p.sku === product.sku ? { ...p, price: product.price + 50 } : p) };
  f.state.live = { open: true, catalogue: changed };
  assert.equal((await f.call()).status, 409, "the old cart total no longer matches the back-office price");
  const ok = await f.call({ expectedTotal: total + 50 });
  assert.equal(ok.status, 200);
  assert.equal(f.state.creates.at(-1).body.amount.value, total + 50);
  assert.equal(f.state.recorded.at(-1).ref, ref);
  assert.equal(f.state.recorded.at(-1).method, "ozow");
  assert.equal(f.state.recorded.at(-1).items[0].price, product.price + 50);
});

test("a verified Ozow payment is recorded on the back-office invoice", async () => {
  const f = fixture();
  await f.call();
  assert.equal((await f.notify(f.event())).status, 200);
  assert.deepEqual(f.state.paid.at(-1), [ref, total, "12345678-1234-4234-8234-123456789abc"]);
  const failed = fixture();
  await failed.call();
  await failed.notify(failed.event({ Status: "Cancelled" }));
  assert.equal(failed.state.paid.length, 0, "only successful payments are recorded");
});
