import { CheckoutError } from "./payment.ts";

export async function verifyBot(token: unknown, secret: string, allowedOrigins: string[], fetcher: typeof fetch = fetch, action = "checkout") {
  if (typeof token !== "string" || !token || token.length > 2048) throw new CheckoutError("Please complete a fresh security check.", 400);
  const response = await fetcher("https://challenges.cloudflare.com/turnstile/v0/siteverify", {
    method: "POST", body: new URLSearchParams({ secret, response: token }), signal: AbortSignal.timeout(10000),
  });
  if (!response.ok) throw new CheckoutError("The security check is unavailable. Please try again.", 503);
  const result = await response.json();
  const hostnames = allowedOrigins.map((origin) => new URL(origin).hostname);
  if (result.success !== true || result.action !== action || !hostnames.includes(result.hostname)) throw new CheckoutError("The security check expired or could not be verified. Please try again.", 400);
}
