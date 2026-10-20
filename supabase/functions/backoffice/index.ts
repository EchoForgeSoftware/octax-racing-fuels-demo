// Live back office API. Staff sign in with Supabase Auth on octa-boost.com;
// this function verifies their token, works out their role and runs the
// shared back-office rules (src/lib/backoffice/server.ts, copied into
// _shared/app by scripts/gen-backoffice-function.mjs). It also places website
// EFT orders priced from the live back office. Records are read and written
// with the service role, which never leaves this function.
import { createClient } from "npm:@supabase/supabase-js@2.118.0";
import { handle, placeOrder, type OrderTools } from "../_shared/app/backoffice/server.ts";
import { todaySA } from "../_shared/app/backoffice/calc.ts";
import { quoteCart, sha256, validateCustomer } from "../_shared/payment.ts";
import { verifyBot } from "../_shared/bot.ts";
import { backofficeStore } from "../_shared/store.ts";
import { sendEmails } from "../_shared/email.ts";

const ORIGINS = ["https://octa-boost.com", "https://www.octa-boost.com"];
const MAX_BODY = 9_000_000;

function env(name: string) {
  const value = Deno.env.get(name)?.trim();
  if (!value) throw new Error(`Missing ${name}`);
  return value;
}

/** The role a JWT claims, unverified. Only used to skip verification for the public anon key, which grants nothing. */
function claimedRole(token: string): string | null {
  try {
    const payload = token.split(".")[1].replace(/-/g, "+").replace(/_/g, "/");
    return JSON.parse(atob(payload.padEnd(payload.length + (4 - payload.length % 4) % 4, "="))).role ?? null;
  } catch {
    return null;
  }
}

Deno.serve(async (request: Request) => {
  const origin = request.headers.get("origin") ?? "";
  const headers: Record<string, string> = { "Content-Type": "application/json", "Cache-Control": "no-store", Vary: "Origin" };
  const reply = (body: unknown, status = 200) => new Response(JSON.stringify(body), { status, headers });
  if (!ORIGINS.includes(origin)) return reply({ error: "This origin is not allowed." }, 403);
  Object.assign(headers, {
    "Access-Control-Allow-Origin": origin,
    "Access-Control-Allow-Headers": "authorization, apikey, content-type, x-client-info",
    "Access-Control-Allow-Methods": "POST, OPTIONS",
  });
  if (request.method === "OPTIONS") return new Response(null, { status: 204, headers });
  if (request.method !== "POST") return reply({ error: "Use POST." }, 405);

  try {
    const raw = await request.text();
    if (raw.length > MAX_BODY) return reply({ error: "That's too large to save. Attach files under 5 MB." }, 413);
    const body = JSON.parse(raw);
    const db = createClient(env("SUPABASE_URL"), env("SUPABASE_SERVICE_ROLE_KEY"), { auth: { persistSession: false, autoRefreshToken: false } });

    // Visitors send the public anon key (role "anon"): they get the shop's public view only.
    // Anything else is treated as a session token and always verified with Supabase Auth.
    const bearer = request.headers.get("authorization")?.replace(/^Bearer\s+/i, "") ?? "";
    let user = null;
    if (bearer && bearer !== Deno.env.get("SUPABASE_ANON_KEY") && claimedRole(bearer) !== "anon") {
      const { data, error } = await db.auth.getUser(bearer);
      if (error || !data.user) return reply({ error: "Your session expired. Sign in again." }, 401);
      user = { id: data.user.id, email: data.user.email ?? null, emailConfirmed: !!data.user.email_confirmed_at };
    }

    const store = backofficeStore(db);
    const makeId = (prefix: string) => `${prefix}-${crypto.randomUUID().slice(0, 8)}`;

    if (body?.op === "order") {
      const ip = request.headers.get("x-forwarded-for")?.split(",")[0].trim() || "unknown";
      const botSecret = Deno.env.get("TURNSTILE_SECRET_KEY");
      const tools: OrderTools = {
        quote: (items, catalogue, city, opts) => quoteCart(items, catalogue, city, opts),
        validateCustomer: (input) => validateCustomer(input) as ReturnType<OrderTools["validateCustomer"]>,
        send: sendEmails,
        allowed: async () => {
          const { data, error } = await db.rpc("ozow_take_rate_limit", { p_bucket: await sha256(`${ip}:order`), p_max: 10 });
          return !error && data === true;
        },
        ...(botSecret ? { human: async (token: unknown) => { try { await verifyBot(token, botSecret, ORIGINS); return true; } catch { return false; } } } : {}),
      };
      const result = await placeOrder(body, user, store, todaySA(), makeId, tools);
      return reply(result.body, result.status);
    }

    const result = await handle(body, user, store, todaySA(), makeId);
    return reply(result.body, result.status);
  } catch {
    return reply({ error: "The back office is unavailable. Try again shortly." }, 503);
  }
});
