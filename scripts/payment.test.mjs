import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { createHmac } from "node:crypto";
import { test } from "node:test";
import { runInNewContext } from "node:vm";
import ts from "typescript";

const { outputText } = ts.transpileModule(readFileSync(new URL("../supabase/functions/_shared/payment.ts", import.meta.url), "utf8"), {
  compilerOptions: { module: ts.ModuleKind.ESNext, target: ts.ScriptTarget.ES2022 },
});
const { quoteCart, validateCustomer, validateCapability, trustedRedirect, verifyWebhook, verifiedOutcome } = await import(`data:text/javascript;base64,${Buffer.from(outputText + "\n//# sourceURL=payment-core.js").toString("base64")}`);
const catalogue = JSON.parse(readFileSync(new URL("../supabase/functions/_shared/catalogue.json", import.meta.url), "utf8"));
const pack = catalogue.items.find((p) => p.size === "25L" && p.price !== null);

test("server recalculates prices, sizes and courier instead of trusting the browser", () => {
  const quote = quoteCart([{ sku: pack.sku, qty: 2, price: 0.01, size: "500ml" }], catalogue);
  assert.equal(quote.subtotal, pack.price * 2);
  assert.equal(quote.courier, 400);
  assert.equal(quote.total, pack.price * 2 + 400);
  assert.equal(quote.items[0].size, "25L");
});

test("duplicate lines combine before free-delivery thresholds are applied", () => {
  const quote = quoteCart([{ sku: pack.sku, qty: 6 }, { sku: pack.sku, qty: 4 }], catalogue);
  assert.equal(quote.items.length, 1);
  assert.equal(quote.courier, 0);
  assert.equal(quote.total, pack.price * 10);
});

test("invalid quantities, unknown products and quoted delivery cannot be charged", () => {
  for (const qty of [0, -1, 0.5, NaN, Infinity, 1001]) assert.throws(() => quoteCart([{ sku: pack.sku, qty }], catalogue));
  assert.throws(() => quoteCart([{ sku: "forged-product", qty: 1 }], catalogue));
  assert.throws(() => quoteCart([], catalogue));
  const quoted = catalogue.items.find((p) => p.size === "20L");
  if (quoted) assert.throws(() => quoteCart([{ sku: quoted.sku, qty: 1 }], catalogue), /unavailable/i);
  assert.throws(() => quoteCart([{ sku: pack.sku, qty: 1 }], { ...catalogue, items: [{ ...pack, size: "20L" }] }), /quote/i);
});

test("all saleable pack sizes agree with storefront courier rules", () => {
  function load(name) {
    const result = {};
    const source = readFileSync(new URL(`../src/lib/${name}.ts`, import.meta.url), "utf8");
    const code = ts.transpileModule(source, { compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022 } }).outputText;
    runInNewContext(code, { exports: result, require: (dependency) => dependency === "./courierRates" ? load("courierRates") : { formatPrice: String } });
    return result;
  }
  const { cartCourier } = load("courier");
  const eligible = catalogue.items.filter((p) => p.price !== null);
  for (const p of eligible) {
    const ml = /ml/i.test(p.size);
    const litres = parseFloat(p.size) / (ml ? 1000 : 1);
    if (!/drum/i.test(p.size) && !catalogue.courier.freeFrom[String(litres)]) continue;
    for (const qty of [1, 9, 10, 11, 12]) {
      const result = quoteCart([{ sku: p.sku, qty }], catalogue);
      assert.equal(result.courier, cartCourier([{ size: p.size, qty }]).fee, `${p.sku} x ${qty}`);
    }
  }
});

test("payment references and guest capabilities must have the expected entropy", () => {
  validateCapability("OCTA-123456ABCDEF", "a".repeat(64));
  assert.throws(() => validateCapability("OCTA-123456ABCDEF", "short"));
  assert.throws(() => validateCapability("../another-order", "a".repeat(64)));
});

test("customer input is bounded and validated before creating an order", () => {
  assert.throws(() => validateCustomer({}));
  assert.throws(() => validateCustomer({ name: "x".repeat(201) }));
  const result = validateCustomer({ name: " Test Customer ", email: "test@example.test", phone: "0123456789", company: "", address: "Test street", city: "Test city", postcode: "0000" });
  assert.equal(result.name, "Test Customer");
  assert.equal(result.vat, "", "VAT is optional and may be missing from older checkout pages");
});

test("checkout accepts an optional South African VAT number and rejects malformed ones", () => {
  const base = { name: "Test Customer", email: "test@example.test", phone: "0123456789", company: "Test Pty Ltd", address: "Test street", city: "Test city", postcode: "0000" };
  assert.equal(validateCustomer({ ...base, vat: "4123 456 789" }).vat, "4123456789");
  assert.equal(validateCustomer({ ...base, vat: "" }).vat, "");
  for (const vat of ["1234567890", "412345678", "41234567890", "4ABCDEFGHI", "4".repeat(21)]) {
    assert.throws(() => validateCustomer({ ...base, vat }), undefined, vat);
  }
});

test("redirects only accept the configured Ozow environment over HTTPS", () => {
  assert.equal(trustedRedirect("https://pay.ozow.com/payment/secure", "production"), "https://pay.ozow.com/payment/secure");
  assert.equal(trustedRedirect("https://stagingpay.ozow.com/payment/secure", "staging"), "https://stagingpay.ozow.com/payment/secure");
  for (const url of ["javascript:alert(1)", "http://pay.ozow.com/", "https://pay.ozow.com.evil.test/", "https://pay.ozow.com@evil.test/", "https://pay.ozow.com:444/"]) {
    assert.throws(() => trustedRedirect(url, "production"));
  }
  assert.throws(() => trustedRedirect("https://stagingpay.ozow.com/", "production"));
});

const key = Buffer.alloc(32, 42);
const secret = `whsec_${key.toString("base64")}`;
const now = Date.now();
const timestamp = String(Math.floor(now / 1000));
const payload = '{"type":"transaction.complete","data":{"status":"Successful"}}';
const sign = (body = payload, time = timestamp) => createHmac("sha256", key).update(`msg_test.${time}.${body}`).digest("base64");
const headers = (signature = `v1,${sign()}`, time = timestamp) => new Headers({ "svix-id": "msg_test", "svix-timestamp": time, "svix-signature": signature });

test("real signed raw payloads and rotating signatures verify", async () => {
  assert.equal(await verifyWebhook(payload, headers(), secret, now), true);
  assert.equal(await verifyWebhook(payload, headers(`v2,ignore v1,bad v1,${sign()}`), secret, now), true);
});

test("webhooks reject tampering, missing signatures and replayed timestamps", async () => {
  assert.equal(await verifyWebhook(payload + " ", headers(), secret, now), false);
  assert.equal(await verifyWebhook(payload, new Headers(), secret, now), false);
  assert.equal(await verifyWebhook(payload, headers(), "whsec_" + Buffer.alloc(32, 7).toString("base64"), now), false);
  const old = String(Number(timestamp) - 301);
  assert.equal(await verifyWebhook(payload, headers(`v1,${sign(payload, old)}`, old), secret, now), false);
  const future = String(Number(timestamp) + 301);
  assert.equal(await verifyWebhook(payload, headers(`v1,${sign(payload, future)}`, future), secret, now), false);
});

const expected = { ref: "OCTA-123456ABCDEF", total: 960, siteCode: "TEST-SITE-001", environment: "production" };
const data = { TransactionReference: expected.ref, Amount: "960.00", SiteCode: expected.siteCode, CurrencyCode: "ZAR", IsTest: "False", TransactionId: "12345678-1234-1234-1234-123456789abc", Status: "Successful" };
const event = (changes = {}) => ({ type: "transaction.complete", data: { ...data, ...changes } });

test("only matching amount, currency, reference, merchant and live environment can mark paid", () => {
  assert.equal(verifiedOutcome(event(), expected).status, "paid");
  for (const change of [{ Amount: "0.01" }, { CurrencyCode: "USD" }, { SiteCode: "OTHER-SITE" }, { TransactionReference: "ANOTHER-ORDER" }, { IsTest: "True" }, { Status: "unknown" }]) {
    assert.throws(() => verifiedOutcome(event(change), expected));
  }
  assert.throws(() => verifiedOutcome({ type: "transaction.complete", data: { id: data.TransactionId, status: "Successful" } }, expected));
  assert.equal(verifiedOutcome(event({ Status: "Pending" }), expected).status, "pending");
  assert.equal(verifiedOutcome(event({ Status: "Error" }), expected).status, "failed");
});

test("local-area orders (30 km) pay the standard courier rate on the server; local delivery cost is confirmed separately", () => {
  for (const city of ["Benoni, Gauteng", "Durban", "", undefined]) assert.equal(quoteCart([{ sku: pack.sku, qty: 2 }], catalogue, city).courier, 400);
  assert.equal(catalogue.courier.localRadiusKm, 30);
  assert.ok(catalogue.courier.localTowns.includes("kempton park"));
});
