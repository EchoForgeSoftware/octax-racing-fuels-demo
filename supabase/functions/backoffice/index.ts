// Live back office API. Staff sign in with Supabase Auth on octa-boost.com;
// this function verifies their token, works out their role and runs the
// shared back-office rules (src/lib/backoffice/server.ts, copied into
// _shared/app by scripts/gen-backoffice-function.mjs). Records are read and
// written with the service role, which never leaves this function.
import { createClient } from "npm:@supabase/supabase-js@2.118.0";
import { handle, type Row, type Store } from "../_shared/app/backoffice/server.ts";
import { todaySA } from "../_shared/app/backoffice/calc.ts";

const ORIGINS = ["https://octa-boost.com", "https://www.octa-boost.com"];
const MAX_BODY = 9_000_000;

function env(name: string) {
  const value = Deno.env.get(name)?.trim();
  if (!value) throw new Error(`Missing ${name}`);
  return value;
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

    // The public anon key can arrive for visitors; a real session token is always verified.
    const bearer = request.headers.get("authorization")?.replace(/^Bearer\s+/i, "") ?? "";
    let user = null;
    if (bearer && bearer !== Deno.env.get("SUPABASE_ANON_KEY")) {
      const { data, error } = await db.auth.getUser(bearer);
      if (error || !data.user) return reply({ error: "Your session expired. Sign in again." }, 401);
      user = { id: data.user.id, email: data.user.email ?? null, emailConfirmed: !!data.user.email_confirmed_at };
    }

    const store: Store = {
      async load(collections) {
        const { data, error } = await db.rpc("bo_store_load", { p_collections: collections ?? null });
        if (error) throw new Error("load failed");
        return { version: Number(data.version), rows: data.rows ?? {} };
      },
      async commit(version, upserts: Row[], deletes, audit) {
        const { data, error } = await db.rpc("bo_store_commit", {
          p_version: version, p_upserts: upserts, p_deletes: deletes, p_actor: audit.actor, p_operation: audit.operation, p_details: audit.details,
        });
        if (error) throw new Error("commit failed");
        return data !== null;
      },
      async staff(userId) {
        const { data, error } = await db.from("bo_staff").select("display_name,role,active").eq("user_id", userId).maybeSingle();
        if (error) throw new Error("staff lookup failed");
        return data;
      },
      async claimInvite(userId, email) {
        const { data, error } = await db.rpc("bo_claim_staff_invite", { p_user: userId, p_email: email });
        if (error) throw new Error("invite failed");
        return data;
      },
      async file(id) {
        const { data, error } = await db.from("bo_store").select("data").eq("collection", "file").eq("id", id).maybeSingle();
        if (error) throw new Error("file failed");
        return data?.data ?? null;
      },
    };

    const result = await handle(body, user, store, todaySA(), (prefix) => `${prefix}-${crypto.randomUUID().slice(0, 8)}`);
    return reply(result.body, result.status);
  } catch {
    return reply({ error: "The back office is unavailable. Try again shortly." }, 503);
  }
});
