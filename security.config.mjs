import { createHash } from "node:crypto";

// A separate frame-ancestors header complements each exported page's hashed
// script policy. Meta CSP cannot enforce frame-ancestors.
export const securityHeaders = {
  "Content-Security-Policy": "frame-ancestors 'none'",
  "X-Frame-Options": "DENY",
  "X-Content-Type-Options": "nosniff",
  "Referrer-Policy": "strict-origin-when-cross-origin",
  "Permissions-Policy": "camera=(), microphone=(), geolocation=(), payment=()",
  "Strict-Transport-Security": "max-age=31536000",
};

export function contentPolicy(html, supabaseUrl = "", captcha = Boolean(process.env.NEXT_PUBLIC_TURNSTILE_SITE_KEY)) {
  const hashes = [...html.matchAll(/<script\b([^>]*)>([\s\S]*?)<\/script>/gi)]
    .filter(([, attrs, body]) => !/\bsrc\s*=/i.test(attrs) && body.length)
    .map(([, , body]) => `'sha256-${createHash("sha256").update(body).digest("base64")}'`);
  const connections = ["'self'"];
  if (supabaseUrl) {
    const url = new URL(supabaseUrl);
    if (url.protocol !== "https:" || url.username || url.password) throw new Error("Supabase must use an HTTPS URL without credentials.");
    connections.push(url.origin, url.origin.replace(/^https:/, "wss:"));
  }
  if (captcha) connections.push("https://challenges.cloudflare.com");
  return ["default-src 'self'", `script-src 'self' ${[...new Set(hashes)].join(" ")}${captcha ? " https://challenges.cloudflare.com" : ""}`,
    "script-src-attr 'none'", "style-src 'self' 'unsafe-inline'", "img-src 'self' data: blob:", "font-src 'self'",
    `connect-src ${connections.join(" ")}`, "object-src 'none'", "base-uri 'none'", captcha ? "frame-src https://challenges.cloudflare.com" : "frame-src 'none'", "form-action 'self'"].join("; ");
}

export function hardenHtml(html, supabaseUrl = "") {
  if (html.includes('http-equiv="Content-Security-Policy"')) throw new Error("Build output already contains a CSP; rebuild before hardening again.");
  const policy = contentPolicy(html, supabaseUrl).replaceAll('"', "&quot;");
  return html.replace(/<head>/i, `<head><meta http-equiv="Content-Security-Policy" content="${policy}"/>`);
}
