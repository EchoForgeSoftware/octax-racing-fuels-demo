import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { createHash } from "node:crypto";
import { test } from "node:test";
import { runInNewContext } from "node:vm";
import ts from "typescript";
import { contentPolicy, hardenHtml, securityHeaders } from "../security.config.mjs";
import { launchProblems } from "./check-launch.mjs";

function load(source, dependencies = {}, globals = {}) {
  const output = ts.transpileModule(readFileSync(new URL(source, import.meta.url), "utf8"), {
    compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022 },
  }).outputText;
  const exports = {};
  runInNewContext(output, { exports, require: (name) => dependencies[name], URL, URLSearchParams, AbortSignal, ...globals }, { filename: source });
  return exports;
}

test("JSON-LD cannot close its script element or inject markup", () => {
  const { serializeJsonLd } = load("../src/lib/serialize.ts");
  const data = { name: '</script><img src=x onerror="alert(1)">', description: "line\u2028separator\u2029" };
  const json = serializeJsonLd(data);
  assert.doesNotMatch(json, /</);
  assert.match(json, /\\u003c/);
  assert.deepEqual(JSON.parse(json), data);
});

test("static CSP permits exact build scripts without unsafe-inline or eval", () => {
  const script = 'self.__next_f.push([1,"test"])';
  const html = `<html><head></head><body><script>${script}</script><script src="/chunk.js"></script></body></html>`;
  const policy = contentPolicy(html, "https://project.supabase.co", false);
  const expectedHash = createHash("sha256").update(script).digest("base64");
  assert.match(policy, new RegExp(expectedHash.replace(/[+/$]/g, "\\$&")));
  assert.doesNotMatch(policy.match(/script-src [^;]+/)[0], /unsafe-inline|unsafe-eval/);
  assert.match(policy, /connect-src 'self' https:\/\/project.supabase.co wss:\/\/project.supabase.co/);
  assert.match(policy, /object-src 'none'/);
  const result = hardenHtml(html);
  assert.ok(result.indexOf('http-equiv="Content-Security-Policy"') < result.indexOf("<script>"));
  assert.throws(() => hardenHtml(result), /already contains/);
  assert.match(contentPolicy(html, "", true), /frame-src https:\/\/challenges.cloudflare.com/);
});

test("Vercel response protections agree with the verified static-header configuration", () => {
  const config = JSON.parse(readFileSync(new URL("../vercel.json", import.meta.url), "utf8"));
  const actual = Object.fromEntries(config.headers[0].headers.map(({ key, value }) => [key, value]));
  assert.deepEqual(actual, securityHeaders);
  for (const path of ["/account/:path*", "/checkout/:path*", "/cart/:path*"]) {
    const headers = config.headers.find((entry) => entry.source === path).headers;
    assert.ok(headers.some((entry) => entry.key === "Cache-Control" && entry.value === "no-store"));
    assert.ok(headers.some((entry) => entry.key === "X-Robots-Tag" && entry.value.includes("noindex")));
  }
});

test("launch configuration blocks placeholder contacts, preview domains and unreviewed policies", () => {
  const good = { origin: "https://store.example.co.za", basePath: "", contactEmail: true, contactPhone: true, reviewed: true, bankDetails: true,
    site: { registrationNumber: "provided-by-business", businessAddress: "provided-by-business", privacyOfficer: "provided-by-business", privacyEmail: "privacy@example.co.za" } };
  assert.equal(launchProblems(good).length, 0);
  assert.ok(launchProblems({ ...good, origin: "https://demo.github.io", reviewed: false, contactEmail: false }).length >= 3);
});

test("bot proof is verified with the provider and bound to checkout and an allowed hostname", async () => {
  const core = load("../supabase/functions/_shared/payment.ts");
  const { verifyBot } = load("../supabase/functions/_shared/bot.ts", { "./payment.ts": core });
  const fetcher = (result) => async (url, options) => {
    assert.equal(url, "https://challenges.cloudflare.com/turnstile/v0/siteverify");
    assert.equal(options.body.get("secret"), "test-secret");
    return { ok: true, json: async () => result };
  };
  await verifyBot("test-token", "test-secret", ["https://store.example.test"], fetcher({ success: true, hostname: "store.example.test", action: "checkout" }));
  await verifyBot("test-token", "test-secret", ["https://store.example.test"], fetcher({ success: true, hostname: "store.example.test", action: "reseller" }), "reseller");
  for (const result of [{ success: false }, { success: true, hostname: "other.example.test", action: "checkout" }, { success: true, hostname: "store.example.test", action: "login" }]) {
    await assert.rejects(() => verifyBot("test-token", "test-secret", ["https://store.example.test"], fetcher(result)));
  }
});
