import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { test } from "node:test";
import { runInNewContext } from "node:vm";
import ts from "typescript";

// Run the real order/courier code while replacing only the external database
// and browser storage. No credentials or live customer records are required.
function loadOrders(client, storage = new Map()) {
  const cache = new Map();
  function load(name) {
    if (name === "./supabase") return { getSupabase: () => client };
    if (name === "./site") return { SITE: { currencySymbol: "R" }, LEGAL: { version: "2026-10-16" } };
    if (cache.has(name)) return cache.get(name);
    const file = new URL(`../src/lib/${name.replace("./", "")}.ts`, import.meta.url);
    const { outputText } = ts.transpileModule(readFileSync(file, "utf8"), {
      compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022 },
    });
    const exports = {};
    cache.set(name, exports);
    runInNewContext(outputText, {
      exports, require: load, crypto: globalThis.crypto,
      sessionStorage: {
        setItem: (key, value) => storage.set(key, value),
        getItem: (key) => storage.get(key) ?? null,
      },
    }, { filename: file.pathname });
    return exports;
  }
  return load("./order");
}

const customer = {
  name: "Test Customer", email: "customer@example.test", phone: "0000000000",
  company: "", address: "Test delivery address", city: "Test city", postcode: "0000",
};
const item = { sku: "test-5l", slug: "test-fuel", name: "Test fuel", size: "5L", price: 250.5, qty: 2 };

test("order total includes VAT-inclusive item prices and courier", () => {
  const { buildOrder } = loadOrders(null);
  const order = buildOrder([item], customer);
  assert.equal(order.subtotal, 501);
  assert.equal(order.courier, 400);
  assert.equal(order.total, 901);
  assert.match(order.ref, /^OCTA-[A-F0-9]{12}$/);
});

test("bulk orders receive free courier at the catalogue threshold", () => {
  const { buildOrder } = loadOrders(null);
  const order = buildOrder([{ ...item, qty: 10 }], customer);
  assert.equal(order.courier, 0);
  assert.equal(order.total, 2505);
});

test("unconfigured checkout cannot report a saved order", async () => {
  const { buildOrder, persistOrder } = loadOrders(null);
  const result = await persistOrder(buildOrder([item], customer), customer, null, true);
  assert.match(result.error, /ordering is being set up/i);
});

test("guest and signed-in orders retain customer details and ownership", async () => {
  const calls = [];
  const client = { from: (table) => ({ upsert: async (row, options) => {
    calls.push({ table, row, options });
    return { error: null };
  } }) };
  const { buildOrder, persistOrder } = loadOrders(client);
  const order = buildOrder([item], customer);
  assert.equal((await persistOrder(order, customer, null, true)).error, null);
  assert.equal((await persistOrder(order, customer, "customer-1", true)).error, null);
  assert.equal(calls[0].table, "orders");
  assert.equal(calls[0].row.user_id, null);
  assert.equal(calls[1].row.user_id, "customer-1");
  assert.equal(calls[0].row.customer.address, customer.address);
  assert.equal(calls[0].row.total, 901);
});

test("database rejection returns an actionable error instead of success", async () => {
  const client = { from: () => ({ upsert: async () => ({ error: { message: "policy rejected" } }) }) };
  const { buildOrder, persistOrder } = loadOrders(client);
  const result = await persistOrder(buildOrder([item], customer), customer, null, true);
  assert.match(result.error, /cart has been kept/i);
});

test("lost response can be retried with one reference and duplicate-ignore semantics", async () => {
  const rows = new Map();
  let requests = 0;
  const client = { from: () => ({ upsert: async (row, options) => {
    assert.equal(options.onConflict, "ref");
    assert.equal(options.ignoreDuplicates, true);
    if (!rows.has(row.ref)) rows.set(row.ref, row);
    if (++requests === 1) throw new Error("response lost after save");
    return { error: null };
  } }) };
  const { buildOrder, persistOrder } = loadOrders(client);
  const order = buildOrder([item], customer);
  assert.match((await persistOrder(order, customer, null, true)).error, /couldn't confirm/i);
  assert.equal((await persistOrder(order, customer, null, true)).error, null);
  assert.equal(rows.size, 1);
});

test("manual EFT cannot be submitted without terms acknowledgement", async () => {
  let called = false;
  const { buildOrder, persistOrder } = loadOrders({ from: () => { called = true; throw new Error("must not insert"); } });
  assert.match((await persistOrder(buildOrder([item], customer), customer, null, false)).error, /agree to the terms/i);
  assert.equal(called, false);
});

test("confirmation survives reload in the same tab and invalid storage is safe", () => {
  const storage = new Map();
  const { buildOrder, saveOrder, readOrder } = loadOrders(null, storage);
  assert.equal(readOrder(), null);
  const order = buildOrder([item], customer);
  saveOrder(order);
  assert.equal(readOrder().ref, order.ref);
  assert.equal(readOrder().total, order.total);
  storage.set("octa-last-order", "broken JSON");
  assert.equal(readOrder(), null);
});
